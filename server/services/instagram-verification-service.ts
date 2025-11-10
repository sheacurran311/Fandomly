/**
 * Instagram Task Verification Service
 * 
 * Handles verification of Instagram tasks via webhooks:
 * - Comment + Nonce verification
 * - Story mention verification
 * - Keyword comment verification
 */

import { db } from '../db';
import { taskCompletions, tasks, socialConnections } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { 
  findUserIdByNonce, 
  deleteTaskNonce, 
  hasTaskStarted,
  isDuplicateWebhookEvent,
  markWebhookEventProcessed,
  incrementRateLimit
} from '../lib/redis';
import { extractNonceFromText } from '../lib/nonce';

interface InstagramCommentEvent {
  comment_id: string;
  media_id: string;
  text: string;
  from: {
    id: string;
    username: string;
  };
}

interface InstagramMentionEvent {
  mention_id: string;
  from: {
    id: string;
    username: string;
  };
  target: {
    id: string;
    username: string;
  };
  caption?: string;
}

/**
 * Handle Instagram comment webhook event
 * Verifies comment+nonce and keyword comment tasks
 */
export async function handleInstagramCommentEvent(event: InstagramCommentEvent): Promise<void> {
  const { comment_id, media_id, text, from } = event;
  
  console.log('[Instagram Verification] Processing comment event:', {
    comment_id,
    media_id,
    username: from.username,
    textPreview: text.substring(0, 50)
  });

  // 1. Deduplicate event
  if (await isDuplicateWebhookEvent(comment_id)) {
    console.log('[Instagram Verification] Duplicate event, skipping:', comment_id);
    return;
  }
  await markWebhookEventProcessed(comment_id);

  // 2. Try nonce verification first (highest priority)
  const nonceVerified = await verifyCommentNonce(event);
  if (nonceVerified) {
    console.log('[Instagram Verification] ✅ Verified via nonce');
    return;
  }

  // 3. Try keyword verification
  const keywordVerified = await verifyCommentKeyword(event);
  if (keywordVerified) {
    console.log('[Instagram Verification] ✅ Verified via keyword');
    return;
  }

  console.log('[Instagram Verification] No matching task found for comment');
}

/**
 * Handle Instagram mention webhook event
 * Verifies story mention tasks
 */
export async function handleInstagramMentionEvent(event: InstagramMentionEvent): Promise<void> {
  const { mention_id, from, target, caption } = event;
  
  console.log('[Instagram Verification] Processing mention event:', {
    mention_id,
    fanUsername: from.username,
    creatorUsername: target.username
  });

  // 1. Deduplicate event
  if (await isDuplicateWebhookEvent(mention_id)) {
    console.log('[Instagram Verification] Duplicate event, skipping:', mention_id);
    return;
  }
  await markWebhookEventProcessed(mention_id);

  // 2. Find creator by Instagram username
  const creatorConnection = await db.query.socialConnections.findFirst({
    where: and(
      eq(socialConnections.platform, 'instagram'),
      eq(socialConnections.platformUsername, target.username),
      eq(socialConnections.isActive, true)
    )
  });

  if (!creatorConnection) {
    console.log('[Instagram Verification] Creator not found:', target.username);
    return;
  }

  // 3. Find active mention tasks for this creator
  const activeTasks = await db.query.tasks.findMany({
    where: and(
      eq(tasks.creatorId, creatorConnection.userId),
      eq(tasks.platform, 'instagram'),
      eq(tasks.taskType, 'mention_story'),
      eq(tasks.status, 'active')
    )
  });

  if (!activeTasks.length) {
    console.log('[Instagram Verification] No active mention tasks for creator');
    return;
  }

  // 4. Match fan by Instagram username
  const fanConnection = await db.query.socialConnections.findFirst({
    where: and(
      eq(socialConnections.platform, 'instagram'),
      eq(socialConnections.platformUsername, from.username)
    )
  });

  if (!fanConnection) {
    console.log('[Instagram Verification] Fan not found:', from.username);
    return;
  }

  // 5. Rate limiting (max 3 mention tasks per day)
  const dailyCount = await incrementRateLimit(fanConnection.userId, 'instagram_mention', 24 * 60 * 60);
  if (dailyCount > 3) {
    console.warn('[Instagram Verification] Rate limit exceeded:', {
      userId: fanConnection.userId,
      count: dailyCount
    });
    return;
  }

  // 6. Find matching task that user has started
  for (const task of activeTasks) {
    const started = await hasTaskStarted(task.id, fanConnection.userId);
    if (!started) continue;

    // Optional: Check hashtag requirement
    const requireHashtag = task.requirements?.requireHashtag;
    if (requireHashtag && caption) {
      if (!caption.includes(requireHashtag)) {
        console.log('[Instagram Verification] Hashtag requirement not met:', requireHashtag);
        continue;
      }
    }

    // Award task completion
    await awardTaskCompletion({
      taskId: task.id,
      userId: fanConnection.userId,
      sourceEventId: mention_id,
      matchedUsername: from.username,
      verificationMethod: 'instagram_mention',
      points: task.pointsReward
    });

    console.log('[Instagram Verification] ✅ Mention task verified:', {
      taskId: task.id,
      userId: fanConnection.userId
    });

    return;
  }

  console.log('[Instagram Verification] No matching started task found');
}

/**
 * Verify comment with nonce code
 */
async function verifyCommentNonce(event: InstagramCommentEvent): Promise<boolean> {
  const { comment_id, media_id, text, from } = event;

  // Extract nonce from comment text
  const nonce = extractNonceFromText(text);
  if (!nonce) return false;

  console.log('[Instagram Verification] Nonce found in comment:', nonce);

  // Find active nonce tasks for this media
  const activeTasks = await db.query.tasks.findMany({
    where: and(
      eq(tasks.platform, 'instagram'),
      eq(tasks.taskType, 'comment_code'),
      eq(tasks.status, 'active')
    )
  });

  // Filter tasks by media_id from requirements
  const mediaTasks = activeTasks.filter(task => 
    task.requirements?.mediaId === media_id
  );

  if (!mediaTasks.length) {
    console.log('[Instagram Verification] No active comment_code tasks for media:', media_id);
    return false;
  }

  // Find user who has this nonce
  for (const task of mediaTasks) {
    const userId = await findUserIdByNonce(task.id, nonce);
    if (!userId) continue;

    // Verify fan's Instagram username matches
    const fanConnection = await db.query.socialConnections.findFirst({
      where: and(
        eq(socialConnections.userId, userId),
        eq(socialConnections.platform, 'instagram'),
        eq(socialConnections.platformUsername, from.username)
      )
    });

    if (!fanConnection) {
      console.warn('[Instagram Verification] Username mismatch:', {
        expectedUser: userId,
        actualUsername: from.username
      });
      continue;
    }

    // Award task completion
    await awardTaskCompletion({
      taskId: task.id,
      userId,
      sourceEventId: comment_id,
      sourceMediaId: media_id,
      matchedUsername: from.username,
      verificationMethod: 'instagram_nonce',
      points: task.pointsReward
    });

    // Clean up nonce
    await deleteTaskNonce(task.id, userId);

    return true;
  }

  return false;
}

/**
 * Verify comment with keyword
 */
async function verifyCommentKeyword(event: InstagramCommentEvent): Promise<boolean> {
  const { comment_id, media_id, text, from } = event;

  // Find active keyword tasks for this media
  const activeTasks = await db.query.tasks.findMany({
    where: and(
      eq(tasks.platform, 'instagram'),
      eq(tasks.taskType, 'keyword_comment'),
      eq(tasks.status, 'active')
    )
  });

  // Filter tasks by media_id
  const mediaTasks = activeTasks.filter(task => 
    task.requirements?.mediaId === media_id
  );

  if (!mediaTasks.length) return false;

  // Match fan by username
  const fanConnection = await db.query.socialConnections.findFirst({
    where: and(
      eq(socialConnections.platform, 'instagram'),
      eq(socialConnections.platformUsername, from.username)
    )
  });

  if (!fanConnection) return false;

  // Find task with matching keyword
  for (const task of mediaTasks) {
    const keyword = task.requirements?.keyword;
    if (!keyword) continue;

    // Check if keyword is in comment (case-insensitive)
    if (!text.toLowerCase().includes(keyword.toLowerCase())) continue;

    // Check if user has started this task
    const started = await hasTaskStarted(task.id, fanConnection.userId);
    if (!started) continue;

    // Award task completion
    await awardTaskCompletion({
      taskId: task.id,
      userId: fanConnection.userId,
      sourceEventId: comment_id,
      sourceMediaId: media_id,
      matchedUsername: from.username,
      verificationMethod: 'instagram_keyword',
      points: task.pointsReward
    });

    return true;
  }

  return false;
}

/**
 * Award task completion with idempotency
 */
interface AwardTaskCompletionParams {
  taskId: string;
  userId: string;
  sourceEventId: string;
  sourceMediaId?: string;
  matchedUsername: string;
  verificationMethod: string;
  points: number;
}

async function awardTaskCompletion(params: AwardTaskCompletionParams): Promise<void> {
  const { taskId, userId, sourceEventId, sourceMediaId, matchedUsername, verificationMethod, points } = params;

  // Check if already completed (idempotency)
  const existing = await db.query.taskCompletions.findFirst({
    where: and(
      eq(taskCompletions.taskId, taskId),
      eq(taskCompletions.userId, userId)
    )
  });

  if (existing) {
    console.log('[Instagram Verification] Task already completed:', { taskId, userId });
    return;
  }

  // Create task completion
  await db.insert(taskCompletions).values({
    taskId,
    userId,
    status: 'completed',
    verifiedAt: new Date(),
    verificationMethod,
    completionData: {
      sourceEventId,
      sourceMediaId,
      matchedUsername,
      platform: 'instagram',
      verifiedViaWebhook: true
    }
  });

  // Update user points (assuming you have a user points system)
  // await updateUserPoints(userId, points);

  console.log('[Instagram Verification] ✅ Task completion awarded:', {
    taskId,
    userId,
    points,
    method: verificationMethod
  });
}

