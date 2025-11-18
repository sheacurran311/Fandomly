import { extractContentId, extractUsername } from '../../middleware/upload';

export interface InstagramVerificationRequest {
  userId?: number;
  taskType: string;
  proofUrl?: string;
  screenshotUrl?: string;
  taskSettings: {
    username?: string;
    userId?: string;
    postUrl?: string;
    contentUrl?: string;
    keyword?: string;
    requiredHashtags?: string[];
  };
}

export interface InstagramVerificationResult {
  verified: boolean;
  requiresManualReview: boolean;
  confidence?: 'high' | 'medium' | 'low';
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * Instagram Verification Service
 *
 * Since Instagram's API is very restrictive, we use:
 * 1. Smart URL detection for follow verification
 * 2. Screenshot analysis for proof validation
 * 3. Webhook integration for comment/mention tasks (handled separately)
 * 4. Manual review as fallback
 */
export class InstagramVerificationService {
  /**
   * Main verification entry point
   */
  async verify(request: InstagramVerificationRequest): Promise<InstagramVerificationResult> {
    const { taskType, proofUrl, screenshotUrl } = request;

    // If no proof provided, requires manual review
    if (!proofUrl && !screenshotUrl) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'No proof URL or screenshot provided',
      };
    }

    try {
      switch (taskType) {
        case 'instagram_follow':
          return await this.verifyFollow(request);

        case 'instagram_like_post':
        case 'instagram_like':
          return await this.verifyLike(request);

        case 'instagram_comment':
        case 'comment_code':
        case 'keyword_comment':
          // These are handled by webhook service
          return {
            verified: false,
            requiresManualReview: false,
            confidence: 'medium',
            reason: 'Instagram comments are verified via webhooks. Please ensure your Instagram account is connected.',
          };

        case 'instagram_story_mention':
        case 'mention_story':
          // These are handled by webhook service
          return {
            verified: false,
            requiresManualReview: false,
            confidence: 'medium',
            reason: 'Instagram story mentions are verified via webhooks. Please ensure your Instagram account is connected.',
          };

        default:
          return {
            verified: false,
            requiresManualReview: false,
            confidence: 'low',
            reason: `Unknown Instagram task type: ${taskType}`,
          };
      }
    } catch (error: any) {
      console.error('Instagram verification error:', error);
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: error.message || 'Instagram verification error',
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Verify Instagram follow task
   * Uses smart URL detection to check if proof URL is from target user's profile
   */
  private async verifyFollow(
    request: InstagramVerificationRequest
  ): Promise<InstagramVerificationResult> {
    const { proofUrl, screenshotUrl, taskSettings } = request;
    const targetUsername = this.normalizeUsername(taskSettings.username);

    if (!targetUsername) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'Target username not specified in task settings',
      };
    }

    // If screenshot only, requires manual review
    if (!proofUrl && screenshotUrl) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'medium',
        reason: 'Screenshot provided - requires manual verification',
        metadata: { screenshotUrl, targetUsername },
      };
    }

    if (!proofUrl) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'No proof URL provided',
      };
    }

    // Extract username from proof URL
    const submittedUsername = extractUsername(proofUrl, 'instagram');

    if (!submittedUsername) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'medium',
        reason: 'Could not extract username from proof URL',
        metadata: { proofUrl, targetUsername },
      };
    }

    // Compare usernames
    const normalizedSubmitted = this.normalizeUsername(submittedUsername);
    const matches = normalizedSubmitted === targetUsername;

    if (matches) {
      return {
        verified: true,
        requiresManualReview: false,
        confidence: 'high',
        reason: `Verified: URL from @${targetUsername}'s Instagram profile`,
        metadata: {
          proofUrl,
          targetUsername,
          submittedUsername: normalizedSubmitted,
        },
      };
    }

    return {
      verified: false,
      requiresManualReview: false,
      confidence: 'medium',
      reason: `Username mismatch. Expected: @${targetUsername}, Got: @${normalizedSubmitted}`,
      metadata: {
        proofUrl,
        targetUsername,
        submittedUsername: normalizedSubmitted,
      },
    };
  }

  /**
   * Verify Instagram like task
   * Checks if submitted URL matches the target post
   */
  private async verifyLike(
    request: InstagramVerificationRequest
  ): Promise<InstagramVerificationResult> {
    const { proofUrl, screenshotUrl, taskSettings } = request;
    const targetPostUrl = taskSettings.postUrl || taskSettings.contentUrl;

    if (!targetPostUrl) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'Target post URL not specified in task settings',
      };
    }

    // If screenshot only, requires manual review
    if (!proofUrl && screenshotUrl) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'medium',
        reason: 'Screenshot provided - requires manual verification',
        metadata: { screenshotUrl },
      };
    }

    if (!proofUrl) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'No proof URL provided',
      };
    }

    // Extract post ID from both URLs
    const targetPostId = extractContentId(targetPostUrl, 'instagram');
    const submittedPostId = extractContentId(proofUrl, 'instagram');

    if (!targetPostId) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'Invalid target post URL in task settings',
        metadata: { targetPostUrl },
      };
    }

    if (!submittedPostId) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'medium',
        reason: 'Could not extract post ID from proof URL',
        metadata: { proofUrl },
      };
    }

    // Compare post IDs
    const matches = targetPostId === submittedPostId;

    if (matches) {
      return {
        verified: true,
        requiresManualReview: false,
        confidence: 'high',
        reason: 'Verified: URL matches target Instagram post',
        metadata: {
          proofUrl,
          targetPostUrl,
          postId: targetPostId,
        },
      };
    }

    return {
      verified: false,
      requiresManualReview: false,
      confidence: 'medium',
      reason: 'Post ID mismatch',
      metadata: {
        proofUrl,
        targetPostUrl,
        targetPostId,
        submittedPostId,
      },
    };
  }

  /**
   * Normalize Instagram username for comparison
   */
  private normalizeUsername(username?: string): string {
    if (!username) return '';
    return username.toLowerCase().replace(/^@/, '').trim();
  }

  /**
   * Validate Instagram URL format
   */
  public isValidInstagramUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return (
        urlObj.hostname.includes('instagram.com') ||
        urlObj.hostname.includes('instagr.am')
      );
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const instagramVerification = new InstagramVerificationService();
