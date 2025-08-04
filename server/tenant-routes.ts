import type { Express } from "express";
import { storage } from "./storage";
import { z } from "zod";

const createTenantSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  ownerId: z.string(),
  businessInfo: z.object({
    businessType: z.enum(['individual', 'team', 'organization']),
    sport: z.string().optional(),
    position: z.string().optional(),
    school: z.string().optional(),
    division: z.string().optional(),
    year: z.enum(['freshman', 'sophomore', 'junior', 'senior', 'graduate']).optional(),
    industryType: z.string().optional(),
    website: z.string().optional(),
  }),
  branding: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
    accentColor: z.string(),
  }),
  settings: z.object({
    timezone: z.string(),
    currency: z.string(),
    language: z.string(),
    nilCompliance: z.boolean(),
    publicProfile: z.boolean(),
    allowRegistration: z.boolean(),
    requireEmailVerification: z.boolean(),
    enableSocialLogin: z.boolean(),
  })
});

export function registerTenantRoutes(app: Express) {
  // Create tenant
  app.post("/api/tenants", async (req, res) => {
    try {
      console.log("Creating tenant with data:", req.body);
      const tenantData = createTenantSchema.parse(req.body);
      console.log("Parsed tenant data:", tenantData);
      
      // Verify the owner exists
      const owner = await storage.getUser(tenantData.ownerId);
      if (!owner) {
        return res.status(400).json({ error: "Owner user not found" });
      }
      
      // Check if slug is already taken
      const existingTenant = await storage.getTenantBySlug(tenantData.slug);
      if (existingTenant) {
        return res.status(400).json({ error: "Store URL is already taken" });
      }
      
      const tenant = await storage.createTenant({
        ...tenantData,
        status: 'trial',
        subscriptionTier: 'starter',
        subscriptionStatus: 'trial'
      });
      
      console.log("Created tenant:", tenant.id);
      res.json(tenant);
    } catch (error) {
      console.error("Error creating tenant:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid tenant data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create tenant" });
    }
  });

  // Get tenant by ID
  app.get("/api/tenants/:id", async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error) {
      console.error("Error fetching tenant:", error);
      res.status(500).json({ error: "Failed to fetch tenant" });
    }
  });

  // Get tenant by slug
  app.get("/api/tenants/slug/:slug", async (req, res) => {
    try {
      const tenant = await storage.getTenantBySlug(req.params.slug);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error) {
      console.error("Error fetching tenant:", error);
      res.status(500).json({ error: "Failed to fetch tenant" });
    }
  });

  // Update tenant
  app.patch("/api/tenants/:id", async (req, res) => {
    try {
      const tenant = await storage.updateTenant(req.params.id, req.body);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error) {
      console.error("Error updating tenant:", error);
      res.status(500).json({ error: "Failed to update tenant" });
    }
  });

  // Get user's tenants
  app.get("/api/users/:userId/tenants", async (req, res) => {
    try {
      const tenants = await storage.getUserTenants(req.params.userId);
      res.json(tenants);
    } catch (error) {
      console.error("Error fetching user tenants:", error);
      res.status(500).json({ error: "Failed to fetch tenants" });
    }
  });

  // Join tenant as member
  app.post("/api/tenants/:tenantId/members", async (req, res) => {
    try {
      const { userId, role = 'member' } = req.body;
      
      const membership = await storage.createTenantMembership({
        tenantId: req.params.tenantId,
        userId,
        role,
        memberData: {
          points: 0,
          tier: 'basic'
        },
        status: 'active'
      });
      
      res.json(membership);
    } catch (error) {
      console.error("Error creating tenant membership:", error);
      res.status(500).json({ error: "Failed to join tenant" });
    }
  });

  // Get tenant members
  app.get("/api/tenants/:tenantId/members", async (req, res) => {
    try {
      const members = await storage.getTenantMembers(req.params.tenantId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching tenant members:", error);
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });
}