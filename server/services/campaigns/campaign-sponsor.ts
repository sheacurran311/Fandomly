/**
 * Campaign Sponsor Service
 *
 * CRUD operations for campaign-scoped sponsors and social handle resolution.
 */

import { db } from '../../db';
import { campaignSponsors, taskAssignments, type CampaignSponsor } from '@shared/schema';
import { eq } from 'drizzle-orm';

export class CampaignSponsorService {
  async addSponsor(data: {
    campaignId: string;
    name: string;
    logoUrl?: string;
    websiteUrl?: string;
    socialHandles?: Record<string, string>;
    displayOrder?: number;
    showInCampaignBanner?: boolean;
  }): Promise<CampaignSponsor> {
    const [sponsor] = await db
      .insert(campaignSponsors)
      .values({
        campaignId: data.campaignId,
        name: data.name,
        logoUrl: data.logoUrl || null,
        websiteUrl: data.websiteUrl || null,
        socialHandles: data.socialHandles || {},
        displayOrder: data.displayOrder || 0,
        showInCampaignBanner: data.showInCampaignBanner ?? true,
      })
      .returning();
    return sponsor;
  }

  async updateSponsor(
    sponsorId: string,
    data: Partial<{
      name: string;
      logoUrl: string;
      websiteUrl: string;
      socialHandles: Record<string, string>;
      displayOrder: number;
      showInCampaignBanner: boolean;
    }>
  ): Promise<CampaignSponsor | null> {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updates.name = data.name;
    if (data.logoUrl !== undefined) updates.logoUrl = data.logoUrl;
    if (data.websiteUrl !== undefined) updates.websiteUrl = data.websiteUrl;
    if (data.socialHandles !== undefined) updates.socialHandles = data.socialHandles;
    if (data.displayOrder !== undefined) updates.displayOrder = data.displayOrder;
    if (data.showInCampaignBanner !== undefined)
      updates.showInCampaignBanner = data.showInCampaignBanner;

    const [updated] = await db
      .update(campaignSponsors)
      .set(updates)
      .where(eq(campaignSponsors.id, sponsorId))
      .returning();
    return updated || null;
  }

  async removeSponsor(sponsorId: string): Promise<void> {
    // Clear sponsor references in task assignments first
    await db
      .update(taskAssignments)
      .set({ sponsorId: null, useSponsorHandle: false })
      .where(eq(taskAssignments.sponsorId, sponsorId));

    await db.delete(campaignSponsors).where(eq(campaignSponsors.id, sponsorId));
  }

  async getSponsors(campaignId: string): Promise<CampaignSponsor[]> {
    return db
      .select()
      .from(campaignSponsors)
      .where(eq(campaignSponsors.campaignId, campaignId))
      .orderBy(campaignSponsors.displayOrder);
  }

  async getSponsor(sponsorId: string): Promise<CampaignSponsor | undefined> {
    return db.query.campaignSponsors.findFirst({
      where: eq(campaignSponsors.id, sponsorId),
    });
  }

  /**
   * Get sponsors for a campaign that have a handle on a specific platform.
   */
  async getSponsorsByPlatform(campaignId: string, platform: string): Promise<CampaignSponsor[]> {
    const sponsors = await this.getSponsors(campaignId);
    return sponsors.filter((s) => {
      const handles = s.socialHandles as Record<string, string> | null;
      return handles && handles[platform];
    });
  }

  /**
   * Resolve the target handle for a task assignment.
   * If sponsor handle is configured, returns sponsor handle.
   * Otherwise returns the provided creator handle.
   */
  async resolveHandle(
    assignmentId: string,
    platform: string,
    creatorHandle: string
  ): Promise<{ handle: string; source: 'creator' | 'sponsor'; sponsorName?: string }> {
    const assignment = await db.query.taskAssignments.findFirst({
      where: eq(taskAssignments.id, assignmentId),
    });

    if (assignment?.useSponsorHandle && assignment.sponsorId) {
      const sponsor = await this.getSponsor(assignment.sponsorId);
      if (sponsor?.socialHandles) {
        const handles = sponsor.socialHandles as Record<string, string>;
        const handle = handles[platform];
        if (handle) {
          return { handle, source: 'sponsor', sponsorName: sponsor.name };
        }
      }
    }

    return { handle: creatorHandle, source: 'creator' };
  }
}

export const campaignSponsorService = new CampaignSponsorService();
