import { Express, Response } from "express";
import { db } from '../../db';
import { eq, and } from "drizzle-orm";
import { agencies, agencyTenants, tenants, users, tenantMemberships } from "@shared/schema";
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import { storage } from '../../core/storage';

export function registerAgencyRoutes(app: Express) {
  
  // Create new agency
  app.post("/api/agencies", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { name, website, businessInfo, allowCrossBrandAnalytics, dataIsolationLevel } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Agency name is required" });
      }

      const [agency] = await db.insert(agencies).values({
        ownerUserId: userId,
        name,
        website,
        businessInfo: businessInfo || {},
        allowCrossBrandAnalytics: allowCrossBrandAnalytics || false,
        dataIsolationLevel: dataIsolationLevel || 'strict',
      }).returning();

      // Update user with agency reference
      await db.update(users)
        .set({ agencyId: agency.id, brandType: 'agency' })
        .where(eq(users.id, userId));

      console.log(`✅ Created agency: ${agency.name} (ID: ${agency.id}) for user ${userId}`);
      
      res.status(201).json(agency);
    } catch (error) {
      console.error("Error creating agency:", error);
      res.status(500).json({ error: "Failed to create agency" });
    }
  });

  // Get agency details
  app.get("/api/agencies/:agencyId", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { agencyId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const agency = await db.query.agencies.findFirst({
        where: eq(agencies.id, agencyId),
        with: {
          agencyTenants: {
            with: {
              tenant: true
            }
          }
        }
      });

      if (!agency) {
        return res.status(404).json({ error: "Agency not found" });
      }

      // Verify user owns this agency
      if (agency.ownerUserId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(agency);
    } catch (error) {
      console.error("Error fetching agency:", error);
      res.status(500).json({ error: "Failed to fetch agency" });
    }
  });

  // Get all brands managed by agency
  app.get("/api/agencies/:agencyId/brands", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { agencyId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Verify user owns this agency
      const agency = await db.query.agencies.findFirst({
        where: eq(agencies.id, agencyId)
      });

      if (!agency) {
        return res.status(404).json({ error: "Agency not found" });
      }

      if (agency.ownerUserId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get all brands (tenants) managed by this agency
      const managedBrands = await db.query.agencyTenants.findMany({
        where: eq(agencyTenants.agencyId, agencyId),
        with: {
          tenant: {
            with: {
              creators: true
            }
          }
        }
      });

      res.json(managedBrands);
    } catch (error) {
      console.error("Error fetching agency brands:", error);
      res.status(500).json({ error: "Failed to fetch agency brands" });
    }
  });

  // Add brand (tenant) to agency
  app.post("/api/agencies/:agencyId/brands", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { agencyId } = req.params;
      const { tenantId, relationshipType } = req.body;

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Verify user owns this agency
      const agency = await db.query.agencies.findFirst({
        where: eq(agencies.id, agencyId)
      });

      if (!agency) {
        return res.status(404).json({ error: "Agency not found" });
      }

      if (agency.ownerUserId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Link tenant to agency
      const [link] = await db.insert(agencyTenants).values({
        agencyId,
        tenantId,
        relationshipType: relationshipType || 'full_management',
      }).returning();

      console.log(`✅ Linked tenant ${tenantId} to agency ${agencyId}`);

      res.status(201).json(link);
    } catch (error) {
      console.error("Error linking brand to agency:", error);
      res.status(500).json({ error: "Failed to link brand to agency" });
    }
  });

  // Switch active brand (tenant)
  app.post("/api/agencies/switch-brand/:tenantId", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { tenantId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Verify user has access to this tenant through their agency
      const user = await storage.getUser(userId);
      if (!user || !user.agencyId) {
        return res.status(403).json({ error: "User is not part of an agency" });
      }

      // Verify tenant belongs to user's agency
      const agencyTenant = await db.query.agencyTenants.findFirst({
        where: and(
          eq(agencyTenants.agencyId, user.agencyId),
          eq(agencyTenants.tenantId, tenantId)
        )
      });

      if (!agencyTenant) {
        return res.status(403).json({ error: "Access denied to this brand" });
      }

      // Update user's current tenant
      await db.update(users)
        .set({ currentTenantId: tenantId })
        .where(eq(users.id, userId));

      console.log(`✅ User ${userId} switched to brand/tenant ${tenantId}`);

      res.json({ success: true, currentTenantId: tenantId });
    } catch (error) {
      console.error("Error switching brand:", error);
      res.status(500).json({ error: "Failed to switch brand" });
    }
  });

  // Get aggregated analytics for agency
  app.get("/api/agencies/:agencyId/analytics", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { agencyId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Verify user owns this agency
      const agency = await db.query.agencies.findFirst({
        where: eq(agencies.id, agencyId)
      });

      if (!agency) {
        return res.status(404).json({ error: "Agency not found" });
      }

      if (agency.ownerUserId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check data isolation level
      if (agency.dataIsolationLevel === 'strict') {
        return res.status(403).json({ 
          error: "Analytics not available with strict data isolation",
          message: "Change isolation level to 'aggregated' or 'shared' to view analytics"
        });
      }

      // Get all managed tenants
      const managedBrands = await db.query.agencyTenants.findMany({
        where: eq(agencyTenants.agencyId, agencyId),
        with: {
          tenant: true
        }
      });

      // Calculate aggregated metrics
      const analytics = {
        totalBrands: managedBrands.length,
        totalMembers: managedBrands.reduce((sum, brand) => 
          sum + (brand.tenant.usage?.currentMembers || 0), 0
        ),
        totalCampaigns: managedBrands.reduce((sum, brand) => 
          sum + (brand.tenant.usage?.currentCampaigns || 0), 0
        ),
        totalRewards: managedBrands.reduce((sum, brand) => 
          sum + (brand.tenant.usage?.currentRewards || 0), 0
        ),
        brands: managedBrands.map(brand => ({
          tenantId: brand.tenantId,
          name: brand.tenant.name,
          members: brand.tenant.usage?.currentMembers || 0,
          campaigns: brand.tenant.usage?.currentCampaigns || 0,
        }))
      };

      res.json(analytics);
    } catch (error) {
      console.error("Error fetching agency analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Get user's managed brands (for brand switcher)
  app.get("/api/user/managed-brands", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // If user has an agency, return all managed brands
      if (user.agencyId) {
        const managedBrands = await db.query.agencyTenants.findMany({
          where: eq(agencyTenants.agencyId, user.agencyId),
          with: {
            tenant: true
          }
        });

        const brands = managedBrands.map(brand => ({
          tenantId: brand.tenantId,
          name: brand.tenant.name,
          slug: brand.tenant.slug,
          isAgencyManaged: true,
          relationshipType: brand.relationshipType
        }));

        return res.json(brands);
      }

      // If single brand user, return their current tenant
      if (user.currentTenantId) {
        const tenant = await storage.getTenant(user.currentTenantId);
        if (tenant) {
          return res.json([{
            tenantId: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            isAgencyManaged: false
          }]);
        }
      }

      res.json([]);
    } catch (error) {
      console.error("Error fetching managed brands:", error);
      res.status(500).json({ error: "Failed to fetch managed brands" });
    }
  });
}

