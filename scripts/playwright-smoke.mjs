/**
 * Playwright Smoke Tests - Creator & Fan Dashboards
 *
 * Pre-req:
 *   - Run scripts/playwright-login.mjs once to produce playwright-auth.json
 *
 * Usage:
 *   BASE_URL=https://your-env.example.com \
 *   PW_STORAGE=playwright-auth.json \
 *   node scripts/playwright-smoke.mjs
 *
 * Options:
 *   --verbose    Show detailed output for each route
 *   --creator    Only test creator dashboard routes
 *   --fan        Only test fan dashboard routes
 */

import { chromium } from "playwright";
import { existsSync } from "fs";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const STORAGE_STATE = process.env.PW_STORAGE || "playwright-auth.json";
const VERBOSE = process.argv.includes("--verbose");
const CREATOR_ONLY = process.argv.includes("--creator");
const FAN_ONLY = process.argv.includes("--fan");

// Creator Dashboard Routes
const creatorRoutes = [
  { path: "/creator-dashboard", name: "Creator Dashboard Home" },
  { path: "/creator-dashboard/program-builder", name: "Program Builder" },
  { path: "/creator-dashboard/task-builder", name: "Task Builder" },
  { path: "/creator-dashboard/tasks", name: "Tasks List" },
  { path: "/creator-dashboard/rewards", name: "Rewards Management" },
  { path: "/creator-dashboard/social", name: "Social Connections" },
  { path: "/creator-dashboard/settings", name: "Creator Settings" },
];

// Fan Dashboard Routes
const fanRoutes = [
  { path: "/fan-dashboard", name: "Fan Dashboard Home" },
  { path: "/fan-dashboard/tasks", name: "Fan Tasks" },
  { path: "/fan-dashboard/social", name: "Fan Social Connections" },
  { path: "/fan-dashboard/points", name: "Fan Points" },
  { path: "/fan-dashboard/rewards", name: "Fan Rewards" },
  { path: "/fan-dashboard/settings", name: "Fan Settings" },
];

// Public Routes (no auth required)
const publicRoutes = [
  { path: "/", name: "Home Page" },
  { path: "/privacy-policy", name: "Privacy Policy" },
  { path: "/terms-of-service", name: "Terms of Service" },
  { path: "/data-deletion", name: "Data Deletion" },
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
      currentUrl.includes("user-type-selection") ||
      currentUrl.includes("fan-onboarding") ||
      currentUrl.includes("creator-onboarding");

    // Check for error pages
    const isErrorPage = 
      currentUrl.includes("/error") ||
      currentUrl.includes("/404") ||
      currentUrl.includes("/500");

    const passed = status === 200 && !redirectedToAuth && !isErrorPage;

    const result = {
      path: route.path,
      name: route.name,
      status,
      currentUrl,
      duration,
      passed,
      redirectedToAuth,
      isErrorPage,
    };

    results.push(result);

    if (passed) {
      console.log(`  ✔ ${route.name} (${duration}ms)`);
    } else {
      const reason = redirectedToAuth ? "redirected to auth" : 
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
  console.log("║           Playwright Smoke Tests - Dashboards              ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log(`\nBase URL: ${BASE_URL}`);
  console.log(`Auth State: ${STORAGE_STATE}`);
  
  // Check if auth state exists
  if (!existsSync(STORAGE_STATE)) {
    console.error(`\n❌ Auth state file not found: ${STORAGE_STATE}`);
    console.error("   Run: npm run smoke:pw:login");
    process.exitCode = 1;
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const results = [];
  
  try {
    // Test public routes without auth
    console.log("\n📄 Public Routes (no auth):");
    const publicContext = await browser.newContext();
    const publicPage = await publicContext.newPage();
    
    for (const route of publicRoutes) {
      await testRoute(publicPage, route, results);
    }
    await publicContext.close();

    // Test authenticated routes
    const authContext = await browser.newContext({ storageState: STORAGE_STATE });
    const authPage = await authContext.newPage();

    // Creator routes
    if (!FAN_ONLY) {
      console.log("\n👤 Creator Dashboard Routes:");
      for (const route of creatorRoutes) {
        await testRoute(authPage, route, results);
      }
    }

    // Fan routes
    if (!CREATOR_ONLY) {
      console.log("\n🎉 Fan Dashboard Routes:");
      for (const route of fanRoutes) {
        await testRoute(authPage, route, results);
      }
    }

    await authContext.close();
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
      console.log(`  - ${r.name}: ${r.error || (r.redirectedToAuth ? "Auth redirect" : `Status ${r.status}`)}`);
    });
    process.exitCode = 1;
  } else {
    console.log("\n✅ All smoke tests passed!");
  }
}

main().catch((err) => {
  console.error("\n💥 Smoke tests crashed:", err);
  process.exitCode = 1;
});
