/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Email Delivery Service
 * Uses Resend API for transactional email delivery.
 * Gracefully degrades when RESEND_API_KEY is not set (dev/staging).
 */

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.APP_URL || 'https://fandomly.ai';
const FROM_EMAIL = process.env.EMAIL_FROM || 'Fandomly <notifications@fandomly.ai>';

let resendClient: Resend | null = null;

function getClient(): Resend | null {
  if (!RESEND_API_KEY) return null;
  if (!resendClient) {
    resendClient = new Resend(RESEND_API_KEY);
  }
  return resendClient;
}

/** Whether email delivery is configured */
export function isEmailEnabled(): boolean {
  return !!RESEND_API_KEY;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email via Resend.
 * Returns true on success, false on failure or when not configured.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  const client = getClient();
  if (!client) {
    console.log('[Email] Skipping email delivery — RESEND_API_KEY not set');
    return false;
  }

  try {
    const { error } = await client.emails.send({
      from: FROM_EMAIL,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });

    if (error) {
      console.error('[Email] Send failed:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Email] Send error:', err);
    return false;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Notification-specific email templates
// ────────────────────────────────────────────────────────────────────────────

const NOTIFICATION_TYPE_TO_PREFERENCE_KEY: Record<string, string> = {
  points_earned: 'achievementAlerts',
  task_completed: 'newTasks',
  campaign_new: 'campaignUpdates',
  campaign_update: 'campaignUpdates',
  creator_post: 'creatorUpdates',
  creator_update: 'creatorUpdates',
  reward_available: 'newRewards',
  reward_claimed: 'newRewards',
  achievement_unlocked: 'achievementAlerts',
  level_up: 'achievementAlerts',
  follower_milestone: 'achievementAlerts',
  system: 'campaignUpdates',
  marketing: 'marketing',
};

/**
 * Check whether the user has email enabled for this notification type.
 */
export function shouldSendEmail(
  notificationType: string,
  preferences: Record<string, unknown> | null | undefined
): boolean {
  if (!preferences) return false;

  const prefKey = NOTIFICATION_TYPE_TO_PREFERENCE_KEY[notificationType];
  if (!prefKey) return false;

  const channel = preferences[prefKey] as { email?: boolean } | undefined;
  return channel?.email === true;
}

/**
 * Build a simple HTML email for a notification.
 */
// ────────────────────────────────────────────────────────────────────────────
// Transactional email helpers — called from specific flows
// ────────────────────────────────────────────────────────────────────────────

/** Send a welcome email when a user signs up */
export async function sendWelcomeEmail(to: string, username: string): Promise<boolean> {
  const html = buildBrandedEmail(
    `Welcome to Fandomly, ${username}!`,
    `You're all set. Start exploring loyalty programs from your favorite creators, earn points, and unlock exclusive rewards.`,
    `${APP_URL}/fan-dashboard`,
    'Go to Dashboard'
  );
  return sendEmail({ to, subject: 'Welcome to Fandomly!', html });
}

/** Send confirmation when a fan redeems a reward */
export async function sendRedemptionEmail(
  to: string,
  rewardName: string,
  pointsSpent: number,
  programName?: string
): Promise<boolean> {
  const context = programName ? ` from ${programName}` : '';
  const html = buildBrandedEmail(
    'Reward Redeemed',
    `You successfully redeemed <strong>${rewardName}</strong>${context} for ${pointsSpent.toLocaleString()} points. We'll update you when it's fulfilled.`,
    `${APP_URL}/fan-dashboard/rewards-store`,
    'View My Redemptions'
  );
  return sendEmail({ to, subject: `Reward Redeemed: ${rewardName}`, html });
}

/** Send NFT mint status update */
export async function sendNftMintEmail(
  to: string,
  rewardName: string,
  status: 'completed' | 'failed',
  txHash?: string
): Promise<boolean> {
  const success = status === 'completed';
  const explorerUrl = txHash ? `https://testnet.snowtrace.io/tx/${txHash}` : '';
  const message = success
    ? `Your NFT for <strong>${rewardName}</strong> has been minted successfully!${explorerUrl ? ` <a href="${explorerUrl}" style="color:#e10698">View on Explorer</a>` : ''}`
    : `We encountered an issue minting your NFT for <strong>${rewardName}</strong>. Our team has been notified and will retry shortly.`;
  const html = buildBrandedEmail(
    success ? 'NFT Minted' : 'NFT Mint Issue',
    message,
    `${APP_URL}/fan-dashboard/nfts`,
    'View My NFTs'
  );
  return sendEmail({
    to,
    subject: success ? `NFT Minted: ${rewardName}` : `NFT Mint Update: ${rewardName}`,
    html,
  });
}

/** Send creator verification status update */
export async function sendVerificationEmail(
  to: string,
  creatorName: string,
  approved: boolean,
  reason?: string
): Promise<boolean> {
  const message = approved
    ? `Congratulations! Your creator profile <strong>${creatorName}</strong> has been verified. You now have access to all creator features.`
    : `Your verification request for <strong>${creatorName}</strong> was not approved.${reason ? ` Reason: ${reason}` : ''} You can update your profile and resubmit.`;
  const html = buildBrandedEmail(
    approved ? 'Verification Approved' : 'Verification Update',
    message,
    `${APP_URL}/creator-dashboard`,
    'Go to Dashboard'
  );
  return sendEmail({ to, subject: approved ? "You're Verified!" : 'Verification Update', html });
}

/** Reusable branded email shell */
function buildBrandedEmail(
  title: string,
  message: string,
  actionUrl?: string,
  buttonText?: string
): string {
  const buttonHtml = actionUrl
    ? `<tr><td style="padding:24px 0 0"><a href="${actionUrl}" style="display:inline-block;background:#e10698;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">${buttonText || 'View Details'}</a></td></tr>`
    : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0118;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0118;padding:40px 20px">
<tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#1a0a30;border-radius:12px;border:1px solid rgba(225,6,152,0.2)">
    <tr><td style="padding:32px 32px 0">
      <img src="${APP_URL}/fandomly-logo.png" alt="Fandomly" width="120" style="display:block;margin-bottom:24px">
    </td></tr>
    <tr><td style="padding:0 32px">
      <h1 style="color:#fff;font-size:20px;margin:0 0 12px">${title}</h1>
      <p style="color:#b3a8c8;font-size:15px;line-height:1.6;margin:0">${message}</p>
    </td></tr>
    <tr><td style="padding:0 32px">${buttonHtml ? `<table><tbody>${buttonHtml}</tbody></table>` : ''}</td></tr>
    <tr><td style="padding:32px;border-top:1px solid rgba(255,255,255,0.05);margin-top:24px">
      <p style="color:#6b5f82;font-size:12px;margin:0">&copy; Fandomly &middot; <a href="${APP_URL}/fan-dashboard/settings" style="color:#e10698">Manage preferences</a></p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

export function buildNotificationEmail(title: string, message: string, actionUrl?: string): string {
  const buttonHtml = actionUrl
    ? `<tr><td style="padding:24px 0 0"><a href="${actionUrl}" style="display:inline-block;background:#e10698;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">View Details</a></td></tr>`
    : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0118;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0118;padding:40px 20px">
<tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#1a0a30;border-radius:12px;border:1px solid rgba(225,6,152,0.2)">
    <tr><td style="padding:32px 32px 0">
      <img src="${APP_URL}/fandomly-logo.png" alt="Fandomly" width="120" style="display:block;margin-bottom:24px">
    </td></tr>
    <tr><td style="padding:0 32px">
      <h1 style="color:#fff;font-size:20px;margin:0 0 12px">${title}</h1>
      <p style="color:#b3a8c8;font-size:15px;line-height:1.6;margin:0">${message}</p>
    </td></tr>
    <tr><td style="padding:0 32px">${buttonHtml ? `<table><tbody>${buttonHtml}</tbody></table>` : ''}</td></tr>
    <tr><td style="padding:32px;border-top:1px solid rgba(255,255,255,0.05);margin-top:24px">
      <p style="color:#6b5f82;font-size:12px;margin:0">You're receiving this because of your notification preferences on Fandomly. <a href="${APP_URL}/settings" style="color:#e10698">Manage preferences</a></p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}
