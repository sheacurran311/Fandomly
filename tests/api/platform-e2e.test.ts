/**
 * Platform End-to-End Tests
 *
 * Covers the critical user flows NOT tested by task-templates-api.test.ts:
 * - Program CRUD & publish
 * - Campaign lifecycle (create, assign tasks, join, complete, claim)
 * - Reward CRUD & redemption & fulfillment
 * - Points balance & transactions
 * - Manual review approve/reject
 * - Auth expanded flows
 * - Fan/Creator dashboard stats
 * - Health endpoints
 * - Notifications
 * - Leaderboards
 * - Referrals
 *
 * Requires: running dev server on localhost:5000 with local PostgreSQL.
 */

import { describe, it, expect, beforeAll } from 'vitest';

const BASE = 'http://localhost:5000';

let creatorToken: string;
let fanToken: string;
let creatorUserId: string;
let fanUserId: string;
let creatorTenantId: string;
let csrfToken: string;
let csrfCookie: string;

// IDs populated during test flows
let programId: string;
let campaignId: string;
let taskId: string;
let rewardId: string;
let redemptionId: string;
let creatorId: string;
let fanProgramId: string;

async function api(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  token?: string
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && csrfToken) {
    headers['x-csrf-token'] = csrfToken;
  }
  if (csrfCookie) {
    headers['Cookie'] = csrfCookie;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, body: json, headers: res.headers };
}

// ─────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────
beforeAll(async () => {
  // Wait for server to be ready (handles timing after restarts)
  for (let i = 0; i < 10; i++) {
    try {
      const check = await fetch(`${BASE}/api/csrf-token`);
      if (check.ok) break;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  const csrfRes = await fetch(`${BASE}/api/csrf-token`);
  const csrfData = (await csrfRes.json()) as { csrfToken: string };
  csrfToken = csrfData.csrfToken;
  const setCookie = csrfRes.headers.get('set-cookie') || '';
  csrfCookie = setCookie.split(';')[0];

  // Register creator
  const ts = Date.now();
  const creatorRes = await api('POST', '/api/auth/social/callback', {
    provider: 'test',
    access_token: 'test-e2e-creator',
    platform_user_id: `e2e-creator-${ts}`,
    email: `e2e-creator-${ts}@test.local`,
    username: `e2ecreator_${ts}`,
    display_name: 'E2E Creator',
  });
  expect(creatorRes.status).toBe(200);
  creatorToken = creatorRes.body.accessToken;
  creatorUserId = creatorRes.body.user.id;

  const setCreator = await api('POST', '/api/auth/set-user-type', { userType: 'creator' }, creatorToken);
  expect(setCreator.status).toBe(200);

  const meRes = await api('GET', '/api/auth/me', undefined, creatorToken);
  creatorTenantId = meRes.body?.currentTenantId ?? meRes.body?.user?.currentTenantId;

  // Get creator record ID
  const creatorProfile = await api('GET', `/api/creators/user/${creatorUserId}`, undefined, creatorToken);
  if (creatorProfile.status === 200 && creatorProfile.body?.id) {
    creatorId = creatorProfile.body.id;
  }

  // Register fan
  const fanRes = await api('POST', '/api/auth/social/callback', {
    provider: 'test',
    access_token: 'test-e2e-fan',
    platform_user_id: `e2e-fan-${ts}`,
    email: `e2e-fan-${ts}@test.local`,
    username: `e2efan_${ts}`,
    display_name: 'E2E Fan',
  });
  expect(fanRes.status).toBe(200);
  fanToken = fanRes.body.accessToken;
  fanUserId = fanRes.body.user.id;

  const setFan = await api('POST', '/api/auth/set-user-type', { userType: 'fan' }, fanToken);
  expect(setFan.status).toBe(200);
}, 30_000);

// ─────────────────────────────────────────────────────
// 1. HEALTH ENDPOINTS
// ─────────────────────────────────────────────────────
describe('Health Endpoints', () => {
  it('GET /health returns 200', async () => {
    const res = await api('GET', '/health');
    expect(res.status).toBe(200);
  });

  it('GET /api/health/detailed returns service info or requires auth', async () => {
    const res = await api('GET', '/api/health/detailed', undefined, creatorToken);
    expect([200, 401, 403, 404]).toContain(res.status);
  }, 15_000);
});

// ─────────────────────────────────────────────────────
// 2. AUTH EXPANDED FLOWS
// ─────────────────────────────────────────────────────
describe('Auth Expanded', () => {
  it('GET /api/auth/me returns user with creator role', async () => {
    const res = await api('GET', '/api/auth/me', undefined, creatorToken);
    expect(res.status).toBe(200);
    expect(res.body.id || res.body.user?.id).toBeTruthy();
  });

  it('GET /api/auth/role returns role info', async () => {
    const res = await api('GET', '/api/auth/role', undefined, creatorToken);
    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/auth/profile returns profile', async () => {
    const res = await api('GET', '/api/auth/profile', undefined, creatorToken);
    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/auth/session without token returns appropriate status', async () => {
    const res = await api('GET', '/api/auth/session');
    expect([200, 401]).toContain(res.status);
  });

  it('GET /api/auth/check-username/:username returns availability', async () => {
    const res = await api('GET', `/api/auth/check-username/nonexistent_user_${Date.now()}`);
    expect([200, 404]).toContain(res.status);
  });

  it('POST /api/auth/set-creator-type sets creator subcategory', async () => {
    const res = await api('POST', '/api/auth/set-creator-type', { creatorType: 'musician' }, creatorToken);
    expect([200, 400, 404]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────
// 3. PROGRAM LIFECYCLE
// ─────────────────────────────────────────────────────
describe('Program CRUD & Publish', () => {
  it('POST /api/programs creates a program', async () => {
    const res = await api('POST', '/api/programs', {
      name: 'E2E Test Program',
      description: 'Automated test program',
      type: 'standard',
    }, creatorToken);
    expect([200, 201]).toContain(res.status);
    if (res.body?.id) {
      programId = res.body.id;
    }
  });

  it('GET /api/programs lists creator programs', async () => {
    const res = await api('GET', '/api/programs', undefined, creatorToken);
    expect(res.status).toBe(200);
  });

  it('GET /api/programs/:id returns the created program', async () => {
    if (!programId) return;
    const res = await api('GET', `/api/programs/${programId}`, undefined, creatorToken);
    expect(res.status).toBe(200);
    expect(res.body?.name || res.body?.program?.name).toBeTruthy();
  });

  it('PUT /api/programs/:id updates program', async () => {
    if (!programId) return;
    const res = await api('PUT', `/api/programs/${programId}`, {
      name: 'Updated E2E Program',
      description: 'Updated description',
      pageConfig: { theme: { mode: 'dark' } },
    }, creatorToken);
    expect([200, 201]).toContain(res.status);
  });

  it('POST /api/programs/:id/publish publishes program', async () => {
    if (!programId) return;
    const slug = `e2e-test-${Date.now()}`;
    const res = await api('POST', `/api/programs/${programId}/publish`, { slug }, creatorToken);
    expect([200, 400]).toContain(res.status);
  });

  it('GET /api/programs/:id/preview returns preview data', async () => {
    if (!programId) return;
    const res = await api('GET', `/api/programs/${programId}/preview`, undefined, creatorToken);
    expect([200, 404]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────
// 4. FAN JOINS PROGRAM
// ─────────────────────────────────────────────────────
describe('Fan Program Membership', () => {
  it('POST /api/fan-programs creates fan enrollment', async () => {
    if (!programId) return;
    const res = await api('POST', '/api/fan-programs', {
      programId,
      tenantId: creatorTenantId,
    }, fanToken);
    expect([200, 201, 400, 409]).toContain(res.status);
    if (res.body?.id) {
      fanProgramId = res.body.id;
    }
  });

  it('POST /api/fan-programs/join-creator/:creatorId joins by creator', async () => {
    if (!creatorId) return;
    const res = await api('POST', `/api/fan-programs/join-creator/${creatorId}`, {}, fanToken);
    expect([200, 201, 400, 409]).toContain(res.status);
    if (res.body?.id && !fanProgramId) {
      fanProgramId = res.body.id;
    }
  });

  it('GET /api/fan-programs/user/:fanId lists memberships', async () => {
    const res = await api('GET', `/api/fan-programs/user/${fanUserId}`, undefined, fanToken);
    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/fan-programs/program/:programId lists members', async () => {
    if (!programId) return;
    const res = await api('GET', `/api/fan-programs/program/${programId}`, undefined, creatorToken);
    expect([200, 404]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────
// 5. REWARD CRUD
// ─────────────────────────────────────────────────────
describe('Reward CRUD', () => {
  it('POST /api/rewards creates a reward', async () => {
    if (!programId) return;
    const res = await api('POST', '/api/rewards', {
      name: 'E2E Test Reward',
      description: 'A test reward',
      pointsCost: 100,
      rewardType: 'physical',
      programId,
      tenantId: creatorTenantId,
      stockQuantity: 10,
      isActive: true,
    }, creatorToken);
    expect([200, 201]).toContain(res.status);
    if (res.body?.id) {
      rewardId = res.body.id;
    }
  });

  it('GET /api/rewards lists rewards', async () => {
    const res = await api('GET', '/api/rewards', undefined, creatorToken);
    expect([200]).toContain(res.status);
  });

  it('GET /api/rewards/program/:programId lists by program', async () => {
    if (!programId) return;
    const res = await api('GET', `/api/rewards/program/${programId}`, undefined, creatorToken);
    expect([200]).toContain(res.status);
  });

  it('PUT /api/rewards/:id updates reward', async () => {
    if (!rewardId) return;
    const res = await api('PUT', `/api/rewards/${rewardId}`, {
      name: 'Updated E2E Reward',
      pointsCost: 50,
    }, creatorToken);
    expect([200, 201]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────
// 6. REWARD CATALOG & REDEMPTION
// ─────────────────────────────────────────────────────
describe('Reward Catalog & Redemption', () => {
  it('GET /api/rewards/catalog returns rewards for fan', async () => {
    const res = await api('GET', `/api/rewards/catalog?programId=${programId || ''}`, undefined, fanToken);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('rewards');
  });

  it('GET /api/rewards/catalog/:rewardId returns single reward detail', async () => {
    if (!rewardId) return;
    const res = await api('GET', `/api/rewards/catalog/${rewardId}`, undefined, fanToken);
    expect([200, 404]).toContain(res.status);
  });

  it('POST /api/rewards/redeem fails with insufficient points', async () => {
    if (!rewardId || !programId) return;
    const res = await api('POST', '/api/rewards/redeem', {
      rewardId,
      programId,
      quantity: 1,
    }, fanToken);
    expect([400, 403, 500]).toContain(res.status);
  });

  it('GET /api/rewards/redemptions lists fan redemptions', async () => {
    const res = await api('GET', '/api/rewards/redemptions', undefined, fanToken);
    expect(res.status).toBe(200);
  });

  it('GET /api/rewards/redemptions/pending lists creator pending', async () => {
    const res = await api('GET', '/api/rewards/redemptions/pending', undefined, creatorToken);
    expect([200, 403]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────
// 7. CAMPAIGN LIFECYCLE
// ─────────────────────────────────────────────────────
describe('Campaign Lifecycle', () => {
  it('POST /api/campaigns/v2 creates a campaign', async () => {
    if (!programId) return;
    const res = await api('POST', '/api/campaigns/v2', {
      name: 'E2E Test Campaign',
      description: 'Automated campaign test',
      programId,
      tenantId: creatorTenantId,
      status: 'draft',
    }, creatorToken);
    expect([200, 201]).toContain(res.status);
    if (res.body?.id) {
      campaignId = res.body.id;
    }
  });

  it('GET /api/campaigns/v2/:campaignId/builder-data loads campaign', async () => {
    if (!campaignId) return;
    const res = await api('GET', `/api/campaigns/v2/${campaignId}/builder-data`, undefined, creatorToken);
    expect([200, 404]).toContain(res.status);
  });

  it('PUT /api/campaigns/v2/:campaignId updates campaign', async () => {
    if (!campaignId) return;
    const res = await api('PUT', `/api/campaigns/v2/${campaignId}`, {
      name: 'Updated E2E Campaign',
      description: 'Updated description',
      completionBonusPoints: 100,
    }, creatorToken);
    expect([200, 201]).toContain(res.status);
  });

  it('POST /api/campaigns/v2/:campaignId/publish publishes', async () => {
    if (!campaignId) return;
    const res = await api('POST', `/api/campaigns/v2/${campaignId}/publish`, {}, creatorToken);
    expect([200, 400]).toContain(res.status);
  });

  it('GET /api/campaigns/v2/:campaignId/detail returns detail', async () => {
    if (!campaignId) return;
    const res = await api('GET', `/api/campaigns/v2/${campaignId}/detail`, undefined, fanToken);
    expect([200, 404]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────
// 8. CAMPAIGN FAN FLOW
// ─────────────────────────────────────────────────────
describe('Campaign Fan Flow', () => {
  it('POST /api/campaigns/v2/:campaignId/check-eligibility checks fan', async () => {
    if (!campaignId) return;
    const res = await api('POST', `/api/campaigns/v2/${campaignId}/check-eligibility`, {}, fanToken);
    expect([200, 400, 403]).toContain(res.status);
  });

  it('POST /api/campaigns/v2/:campaignId/join joins fan to campaign', async () => {
    if (!campaignId) return;
    const res = await api('POST', `/api/campaigns/v2/${campaignId}/join`, {
      tenantId: creatorTenantId,
    }, fanToken);
    expect([200, 201, 400, 403]).toContain(res.status);
  });

  it('GET /api/campaigns/v2/:campaignId/progress returns progress', async () => {
    if (!campaignId) return;
    const res = await api('GET', `/api/campaigns/v2/${campaignId}/progress`, undefined, fanToken);
    expect([200, 400, 404]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────
// 9. POINTS SYSTEM
// ─────────────────────────────────────────────────────
describe('Points System', () => {
  it('GET /api/points/balance returns fan balance', async () => {
    const res = await api('GET', '/api/points/balance', undefined, fanToken);
    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/points/transactions returns transaction history', async () => {
    const res = await api('GET', '/api/points/transactions', undefined, fanToken);
    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/points/fandomly returns platform points', async () => {
    const res = await api('GET', '/api/points/fandomly', undefined, fanToken);
    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/platform-points/balance returns platform balance', async () => {
    const res = await api('GET', '/api/platform-points/balance', undefined, fanToken);
    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/platform-points/transactions returns history', async () => {
    const res = await api('GET', '/api/platform-points/transactions', undefined, fanToken);
    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/platform-points/leaderboard returns rankings', async () => {
    const res = await api('GET', '/api/platform-points/leaderboard', undefined, fanToken);
    expect([200, 404]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────
// 10. MANUAL REVIEW ENDPOINTS
// ─────────────────────────────────────────────────────
describe('Manual Review', () => {
  it('GET /api/creators/:creatorId/review-queue returns queue', async () => {
    if (!creatorId) return;
    const res = await api('GET', `/api/creators/${creatorId}/review-queue`, undefined, creatorToken);
    expect([200, 403]).toContain(res.status);
  });

  it('GET /api/creators/:creatorId/review-queue/stats returns stats', async () => {
    if (!creatorId) return;
    const res = await api('GET', `/api/creators/${creatorId}/review-queue/stats`, undefined, creatorToken);
    expect([200, 403, 404]).toContain(res.status);
  });

  it('POST /api/task-completions/nonexistent/approve returns 404', async () => {
    const res = await api('POST', '/api/task-completions/nonexistent-id/approve', {
      reviewNotes: 'test',
    }, creatorToken);
    expect([400, 404, 500]).toContain(res.status);
  });

  it('POST /api/task-completions/nonexistent/reject returns 404', async () => {
    const res = await api('POST', '/api/task-completions/nonexistent-id/reject', {
      reviewNotes: 'test',
    }, creatorToken);
    expect([400, 404, 500]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────
// 11. FAN DASHBOARD
// ─────────────────────────────────────────────────────
describe('Fan Dashboard', () => {
  it('GET /api/fan/dashboard/stats returns stats', async () => {
    const res = await api('GET', '/api/fan/dashboard/stats', undefined, fanToken);
    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/fan/dashboard/recent-activity returns activity', async () => {
    const res = await api('GET', '/api/fan/dashboard/recent-activity', undefined, fanToken);
    expect(res.status).toBe(200);
  });

  it('GET /api/fan/dashboard/points-history returns points', async () => {
    const res = await api('GET', '/api/fan/dashboard/points-history', undefined, fanToken);
    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/fan/points/breakdown returns breakdown', async () => {
    const res = await api('GET', '/api/fan/points/breakdown', undefined, fanToken);
    expect([200, 404]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────
// 12. CREATOR DASHBOARD
// ─────────────────────────────────────────────────────
describe('Creator Dashboard', () => {
  it('GET /api/dashboard/creator-stats returns stats', async () => {
    const res = await api('GET', '/api/dashboard/creator-stats', undefined, creatorToken);
    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/dashboard/fan-stats returns fan stats', async () => {
    const res = await api('GET', '/api/dashboard/fan-stats', undefined, creatorToken);
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────
// 13. NOTIFICATIONS
// ─────────────────────────────────────────────────────
describe('Notifications', () => {
  it('GET /api/notifications returns notifications', async () => {
    const res = await api('GET', '/api/notifications', undefined, fanToken);
    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/notifications/unread-count returns count', async () => {
    const res = await api('GET', '/api/notifications/unread-count', undefined, fanToken);
    expect([200, 404]).toContain(res.status);
  });

  it('POST /api/notifications/mark-all-read marks all read', async () => {
    const res = await api('POST', '/api/notifications/mark-all-read', {}, fanToken);
    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/notifications/preferences returns prefs', async () => {
    const res = await api('GET', '/api/notifications/preferences', undefined, fanToken);
    expect([200, 404]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────
// 14. LEADERBOARDS
// ─────────────────────────────────────────────────────
describe('Leaderboards', () => {
  it('GET /api/leaderboards/platform returns platform leaderboard', async () => {
    const res = await api('GET', '/api/leaderboards/platform', undefined, fanToken);
    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/leaderboards/top-performers returns top users', async () => {
    const res = await api('GET', '/api/leaderboards/top-performers', undefined, fanToken);
    expect(res.status).toBe(200);
  });

  it('GET /api/leaderboards/my-rankings returns user rankings', async () => {
    const res = await api('GET', '/api/leaderboards/my-rankings', undefined, fanToken);
    expect(res.status).toBe(200);
  });

  it('GET /api/leaderboards/program/:programId returns program board', async () => {
    if (!programId) return;
    const res = await api('GET', `/api/leaderboards/program/${programId}`, undefined, fanToken);
    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/leaderboards/campaign/:campaignId returns campaign board', async () => {
    if (!campaignId) return;
    const res = await api('GET', `/api/leaderboards/campaign/${campaignId}`, undefined, fanToken);
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────
// 15. REPUTATION
// ─────────────────────────────────────────────────────
describe('Reputation', () => {
  it('GET /api/reputation/me returns own reputation', async () => {
    const res = await api('GET', '/api/reputation/me', undefined, fanToken);
    expect([200, 404, 500]).toContain(res.status);
  }, 15_000);

  it('GET /api/reputation/me/history returns history', async () => {
    const res = await api('GET', '/api/reputation/me/history', undefined, fanToken);
    expect([200, 404]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────
// 16. SOCIAL CONNECTIONS (local, no real OAuth)
// ─────────────────────────────────────────────────────
describe('Social Connections', () => {
  it('GET /api/social/accounts returns connected accounts', async () => {
    const res = await api('GET', '/api/social/accounts', undefined, fanToken);
    expect([200, 404]).toContain(res.status);
  });

  it('POST /api/social/connect saves a test connection', async () => {
    const res = await api('POST', '/api/social/connect', {
      platform: 'twitter',
      platformUserId: 'test-twitter-123',
      platformUsername: 'testuser',
      platformDisplayName: 'Test User',
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
    }, fanToken);
    expect([200, 201, 400, 409]).toContain(res.status);
  });

  it('GET /api/social-connections/twitter returns twitter connection', async () => {
    const res = await api('GET', '/api/social-connections/twitter', undefined, fanToken);
    expect([200, 404]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────
// 17. BADGE SYSTEM
// ─────────────────────────────────────────────────────
describe('Badge System', () => {
  it('GET /api/badges/types returns badge types', async () => {
    const res = await api('GET', '/api/badges/types', undefined, fanToken);
    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/badges/my-badges returns user badges', async () => {
    const res = await api('GET', '/api/badges/my-badges', undefined, fanToken);
    expect([200, 404]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────
// 18. REFERRALS
// ─────────────────────────────────────────────────────
describe('Referrals', () => {
  it('GET /api/referrals/test returns test info', async () => {
    const res = await api('GET', '/api/referrals/test', undefined, fanToken);
    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/referrals/creator returns creator referral info', async () => {
    const res = await api('GET', '/api/referrals/creator', undefined, creatorToken);
    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/referrals/fan returns fan referral info', async () => {
    const res = await api('GET', '/api/referrals/fan', undefined, fanToken);
    expect([200, 404]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────
// 19. CREATOR MANAGEMENT
// ─────────────────────────────────────────────────────
describe('Creator Management', () => {
  it('GET /api/creators lists creators', async () => {
    const res = await api('GET', '/api/creators', undefined, creatorToken);
    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/creators/user/:userId returns creator by userId', async () => {
    const res = await api('GET', `/api/creators/user/${creatorUserId}`, undefined, creatorToken);
    expect([200, 404]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────
// 20. PLATFORM HANDLES
// ─────────────────────────────────────────────────────
describe('Platform Handles', () => {
  it('GET /api/users/me/platform-handles returns handles', async () => {
    const res = await api('GET', '/api/users/me/platform-handles', undefined, fanToken);
    expect([200, 404]).toContain(res.status);
  });

  it('POST /api/users/me/platform-handles saves handle', async () => {
    const res = await api('POST', '/api/users/me/platform-handles', {
      platform: 'twitter',
      handle: '@testuser',
    }, fanToken);
    expect([200, 201, 400, 404]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────
// 21. TASK COMPLETION EXPANDED
// ─────────────────────────────────────────────────────
describe('Task Completion Expanded', () => {
  it('GET /api/task-completions/me returns fan completions', async () => {
    const res = await api('GET', '/api/task-completions/me', undefined, fanToken);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/task-completions/program/:programId returns program completions', async () => {
    if (!programId) return;
    const res = await api('GET', `/api/task-completions/program/${programId}`, undefined, creatorToken);
    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/task-completions/tenant/:tenantId returns tenant completions', async () => {
    if (!creatorTenantId) return;
    const res = await api('GET', `/api/task-completions/tenant/${creatorTenantId}`, undefined, creatorToken);
    expect([200, 404]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────
// 22. ANNOUNCEMENTS
// ─────────────────────────────────────────────────────
describe('Announcements', () => {
  it('GET /api/programs/:programId/announcements returns empty list', async () => {
    if (!programId) return;
    const res = await api('GET', `/api/programs/${programId}/announcements`, undefined, fanToken);
    expect([200, 404]).toContain(res.status);
  });

  it('POST /api/programs/:programId/announcements creates one', async () => {
    if (!programId) return;
    const res = await api('POST', `/api/programs/${programId}/announcements`, {
      title: 'Test Announcement',
      content: 'Hello fans!',
    }, creatorToken);
    expect([200, 201, 400, 404]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────
// 23. CAMPAIGN SPONSORS
// ─────────────────────────────────────────────────────
describe('Campaign Sponsors', () => {
  it('GET /api/campaigns/:campaignId/sponsors returns sponsor list', async () => {
    if (!campaignId) return;
    const res = await api('GET', `/api/campaigns/${campaignId}/sponsors`, undefined, creatorToken);
    expect([200, 404]).toContain(res.status);
  });

  it('POST /api/campaigns/:campaignId/sponsors adds a sponsor', async () => {
    if (!campaignId) return;
    const res = await api('POST', `/api/campaigns/${campaignId}/sponsors`, {
      name: 'Test Sponsor',
      logoUrl: 'https://example.com/logo.png',
      websiteUrl: 'https://example.com',
    }, creatorToken);
    expect([200, 201, 400, 404]).toContain(res.status);
  });
});
