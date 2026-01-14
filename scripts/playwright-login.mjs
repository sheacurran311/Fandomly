/**
 * Playwright login helper for Dynamic-authenticated sessions.
 *
 * Usage:
 *   BASE_URL=https://your-env.example.com \
 *   node scripts/playwright-login.mjs
 *
 * What it does:
 *   - Opens a headed Chromium window
 *   - Navigates to BASE_URL (default http://localhost:3000)
 *   - You log in manually (Dynamic wallet/email)
 *   - When you land on any dashboard route, it saves storage state to playwright-auth.json
 *
 * Notes:
 *   - Headed on purpose so you can complete the Dynamic flow.
 *   - Timeout is generous (5 minutes).
 */

import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const STORAGE_STATE = process.env.PW_STORAGE || "playwright-auth.json";

async function main() {
  console.log(`Launching Chromium (headed). Base URL: ${BASE_URL}`);
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(BASE_URL, { waitUntil: "load" });
  console.log("Please complete login in the opened browser window...");

  // Wait until user reaches a dashboard-like route (creator or fan)
  const start = Date.now();
  const timeoutMs = 5 * 60 * 1000; // 5 minutes

  while (Date.now() - start < timeoutMs) {
    const url = page.url();
    if (
      url.includes("/creator-dashboard") ||
      url.includes("/fan-dashboard")
    ) {
      console.log(`Dashboard detected: ${url}`);
      break;
    }
    await page.waitForTimeout(1000);
  }

  await context.storageState({ path: STORAGE_STATE });
  console.log(`Saved storage state to ${STORAGE_STATE}`);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

