import { extractContentId, extractUsername } from '../../middleware/upload';

export interface TikTokVerificationRequest {
  taskType: string;
  proofUrl?: string;
  screenshotUrl?: string;
  taskSettings: {
    username?: string;
    contentUrl?: string;
    videoUrl?: string;
    requiredHashtags?: string[];
  };
}

export interface VerificationResult {
  verified: boolean;
  requiresManualReview: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * TikTok Smart Detection Verification Service
 *
 * Since TikTok's API is very restrictive, we use smart detection:
 * 1. Extract username/video ID from submitted URLs
 * 2. Compare against task requirements
 * 3. Auto-verify if match is found
 * 4. Flag for manual review if uncertain
 */
export class TikTokVerificationService {
  /**
   * Verify TikTok task completion using smart detection
   */
  async verify(request: TikTokVerificationRequest): Promise<VerificationResult> {
    const { taskType, proofUrl, screenshotUrl, taskSettings } = request;

    // If no proof provided, requires manual review
    if (!proofUrl && !screenshotUrl) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'No proof URL or screenshot provided',
      };
    }

    // If only screenshot, flag for manual review
    if (!proofUrl && screenshotUrl) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'medium',
        reason: 'Screenshot provided, needs manual verification',
        metadata: { screenshotUrl },
      };
    }

    // Smart detection based on URL
    if (proofUrl) {
      switch (taskType) {
        case 'tiktok_follow':
          return this.verifyFollow(proofUrl, taskSettings);

        case 'tiktok_like':
        case 'tiktok_share':
        case 'tiktok_comment':
          return this.verifyContentInteraction(proofUrl, taskSettings);

        default:
          return {
            verified: false,
            requiresManualReview: false,
            confidence: 'low',
            reason: `Unknown task type: ${taskType}`,
          };
      }
    }

    return {
      verified: false,
      requiresManualReview: false,
      confidence: 'low',
      reason: 'Unable to verify automatically',
    };
  }

  /**
   * Verify TikTok follow task
   * Checks if submitted URL is from the target user's profile
   */
  private verifyFollow(
    proofUrl: string,
    taskSettings: TikTokVerificationRequest['taskSettings']
  ): VerificationResult {
    const targetUsername = this.normalizeUsername(taskSettings.username);

    if (!targetUsername) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'Task settings missing target username',
      };
    }

    // Extract username from proof URL
    const submittedUsername = extractUsername(proofUrl, 'tiktok');

    if (!submittedUsername) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'medium',
        reason: 'Could not extract username from proof URL',
        metadata: { proofUrl },
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
        reason: `Verified: URL from @${targetUsername}'s profile`,
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
   * Verify content interaction (like, share, comment)
   * Checks if submitted URL is the target video
   */
  private verifyContentInteraction(
    proofUrl: string,
    taskSettings: TikTokVerificationRequest['taskSettings']
  ): VerificationResult {
    const targetVideoUrl = taskSettings.contentUrl || taskSettings.videoUrl;

    if (!targetVideoUrl) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'Task settings missing target video URL',
      };
    }

    // Extract video ID from both URLs
    const targetVideoId = extractContentId(targetVideoUrl, 'tiktok');
    const submittedVideoId = extractContentId(proofUrl, 'tiktok');

    if (!targetVideoId) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'Invalid target video URL in task settings',
        metadata: { targetVideoUrl },
      };
    }

    if (!submittedVideoId) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'medium',
        reason: 'Could not extract video ID from proof URL',
        metadata: { proofUrl },
      };
    }

    // Compare video IDs
    const matches = targetVideoId === submittedVideoId;

    if (matches) {
      return {
        verified: true,
        requiresManualReview: false,
        confidence: 'high',
        reason: 'Verified: URL matches target video',
        metadata: {
          proofUrl,
          targetVideoUrl,
          videoId: targetVideoId,
        },
      };
    }

    return {
      verified: false,
      requiresManualReview: false,
      confidence: 'medium',
      reason: 'Video ID mismatch',
      metadata: {
        proofUrl,
        targetVideoUrl,
        targetVideoId,
        submittedVideoId,
      },
    };
  }

  /**
   * Normalize TikTok username for comparison
   */
  private normalizeUsername(username?: string): string {
    if (!username) return '';
    return username.toLowerCase().replace(/^@/, '').trim();
  }

  /**
   * Validate TikTok URL format
   */
  public isValidTikTokUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return (
        urlObj.hostname.includes('tiktok.com') ||
        urlObj.hostname.includes('vm.tiktok.com')
      );
    } catch {
      return false;
    }
  }

  /**
   * Extract hashtags from TikTok URL/caption (for future use)
   */
  public extractHashtags(text: string): string[] {
    const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.toLowerCase()) : [];
  }

  /**
   * Check if required hashtags are present
   */
  public verifyHashtags(text: string, requiredHashtags: string[]): boolean {
    const foundHashtags = this.extractHashtags(text);
    return requiredHashtags.every(required =>
      foundHashtags.includes(required.toLowerCase().replace(/^#/, '#'))
    );
  }
}

// Export singleton instance
export const tiktokVerification = new TikTokVerificationService();
