/**
 * Playwright Smoke Tests - Admin Dashboard
 *
 * Pre-req:
 *   - Create an admin user: npm run create-admin
 *   - Login as admin and save state: PW_STORAGE=playwright-admin-auth.json npm run smoke:pw:login
 *
 * Usage:
 *   BASE_URL=https://your-env.example.com \
 *   PW_STORAGE=playwright-admin-auth.json \
 *   node scripts/playwright-admin-smoke.mjs
 *
 * Options:
 *   --verbose    Show detailed output for each route
 */

import { chromium } from "playwright";
import { existsSync } from "fs";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const STORAGE_STATE = process.env.PW_STORAGE || "playwright-admin-auth.json";
const VERBOSE = process.argv.includes("--verbose");

// Admin Dashboard Routes
const adminRoutes = [
  { path: "/admin-dashboard", name: "Admin Dashboard Home" },
  { path: "/admin-dashboard/overview", name: "Overview / Stats" },
  { path: "/admin-dashboard/users", name: "User Management" },
  { path: "/admin-dashboard/creators", name: "Creator Management" },
  { path: "/admin-dashboard/agencies", name: "Agency Management" },
  { path: "/admin-dashboard/platform-tasks", name: "Platform Tasks" },
  { path: "/admin-dashboard/platform-tasks/create", name: "Create Platform Task" },
  { path: "/admin-dashboard/tasks", name: "All Tasks" },
  { path: "/admin-dashboard/analytics", name: "Analytics" },
  { path: "/admin-dashboard/nft-management", name: "NFT Management" },
  { path: "/admin-dashboard/profile", name: "Admin Profile" },
];

async function testRoute(page, route, results) {
  const url = `${BASE_URL}${route.path}`;
  const startTime = Date.now();
  
  try {
    const resp = await page.goto(url, { 
      waitUntil: "domcontentloaded",
      timeout: 30000 
    });
    const status = resp?.status() ?? 0;
    const currentUrl = page.url();
    const duration = Date.now() - startTime;

    // Check for auth redirects
    const redirectedToAuth =
      currentUrl.includes("login") ||
      currentUrl.includes("user-type-selection");

    // Check for permission denied (non-admin trying to access admin routes)
    const permissionDenied =
      currentUrl.includes("/unauthorized") ||
      currentUrl.includes("/forbidden") ||
      currentUrl.includes("/403");

    // Check for error pages
    const isErrorPage = 
      currentUrl.includes("/error") ||
      currentUrl.includes("/404") ||
      currentUrl.includes("/500");

    const passed = status === 200 && !redirectedToAuth && !permissionDenied && !isErrorPage;

    const result = {
      path: route.path,
      name: route.name,
      status,
      currentUrl,
      duration,
      passed,
      redirectedToAuth,
      permissionDenied,
      isErrorPage,
    };

    results.push(result);

    if (passed) {
      console.log(`  ✔ ${route.name} (${duration}ms)`);
    } else {
      const reason = redirectedToAuth ? "redirected to auth" : 
                     permissionDenied ? "permission denied" :
                     isErrorPage ? "error page" : 
                     `status ${status}`;
      console.error(`  ✖ ${route.name} - ${reason}`);
      if (VERBOSE) {
        console.error(`    URL: ${currentUrl}`);
      }
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    results.push({
      path: route.path,
      name: route.name,
      status: 0,
      error: error.message,
      duration,
      passed: false,
    });
    console.error(`  ✖ ${route.name} - ${error.message}`);
  }
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║         Playwright Smoke Tests - Admin Dashboard           ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log(`\nBase URL: ${BASE_URL}`);
  console.log(`Auth State: ${STORAGE_STATE}`);
  
  // Check if auth state exists
  if (!existsSync(STORAGE_STATE)) {
    console.error(`\n❌ Admin auth state file not found: ${STORAGE_STATE}`);
    console.error("   Steps to create:");
    console.error("   1. Create admin: npm run create-admin");
    console.error("   2. Save auth state: PW_STORAGE=playwright-admin-auth.json npm run smoke:pw:login");
    process.exitCode = 1;
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const results = [];
  
  try {
    const context = await browser.newContext({ storageState: STORAGE_STATE });
    const page = await context.newPage();

    console.log("\n🔐 Admin Dashboard Routes:");
    for (const route of adminRoutes) {
      await testRoute(page, route, results);
    }

    await context.close();
  } finally {
    await browser.close();
  }

  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║                      Test Summary                          ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log(`  Total Routes: ${results.length}`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Duration: ${(totalDuration / 1000).toFixed(2)}s`);

  if (failed > 0) {
    console.log("\n❌ Failed Routes:");
    results.filter(r => !r.passed).forEach(r => {
      const reason = r.error || 
                     (r.redirectedToAuth ? "Auth redirect" : 
                      r.permissionDenied ? "Permission denied (not admin?)" :
                      `Status ${r.status}`);
      console.log(`  - ${r.name}: ${reason}`);
    });
    console.log("\n💡 Tip: Make sure you're logged in as an admin user.");
    process.exitCode = 1;
  } else {
    console.log("\n✅ All admin smoke tests passed!");
  }
}

main().catch((err) => {
  console.error("\n💥 Admin smoke tests crashed:", err);
  process.exitCode = 1;
});
