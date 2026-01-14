#!/usr/bin/env tsx
/**
 * Social API Verification Test Runner
 * 
 * On-demand testing of social platform API verification.
 * Use this for manual QA of external API integrations.
 * 
 * Prerequisites:
 *   - Database with test user having valid social connections
 *   - Valid OAuth tokens for the platform being tested
 *   - Real social actions (follows, likes, etc.) to have occurred
 * 
 * Usage:
 *   npm run test:social -- --platform=twitter --type=follow
 *   npm run test:social -- --platform=youtube --type=subscribe
 *   npm run test:social -- --all (runs all available tests)
 *   npm run test:social -- --list (lists available tests)
 * 
 * Environment:
 *   TEST_USER_ID=<user-id>  - User ID to test verification for
 *   DATABASE_URL=<url>      - Database connection string
 */

import { db } from '../server/db';
import { socialConnections, users } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

interface TestConfig {
  platform: string;
  taskType: string;
  name: string;
  description: string;
  targetDataKey: string; // What settings field is needed
  verificationFunction: string;
}

// Available verification tests
const availableTests: TestConfig[] = [
  // Twitter
  {
    platform: 'twitter',
    taskType: 'follow',
    name: 'Twitter Follow',
    description: 'Verify user follows a specific Twitter account',
    targetDataKey: 'creatorTwitterId',
    verificationFunction: 'verifyTwitterFollow',
  },
  {
    platform: 'twitter',
    taskType: 'like',
    name: 'Twitter Like',
    description: 'Verify user liked a specific tweet',
    targetDataKey: 'tweetId',
    verificationFunction: 'verifyTwitterLike',
  },
  {
    platform: 'twitter',
    taskType: 'retweet',
    name: 'Twitter Retweet',
    description: 'Verify user retweeted a specific tweet',
    targetDataKey: 'tweetId',
    verificationFunction: 'verifyTwitterRetweet',
  },
  
  // YouTube
  {
    platform: 'youtube',
    taskType: 'subscribe',
    name: 'YouTube Subscribe',
    description: 'Verify user subscribed to a YouTube channel',
    targetDataKey: 'channelId',
    verificationFunction: 'verifyYouTubeSubscription',
  },
  {
    platform: 'youtube',
    taskType: 'like',
    name: 'YouTube Like',
    description: 'Verify user liked a YouTube video',
    targetDataKey: 'videoId',
    verificationFunction: 'verifyYouTubeLike',
  },
  {
    platform: 'youtube',
    taskType: 'comment',
    name: 'YouTube Comment',
    description: 'Verify user commented on a YouTube video',
    targetDataKey: 'videoId',
    verificationFunction: 'verifyYouTubeComment',
  },
  
  // Spotify
  {
    platform: 'spotify',
    taskType: 'follow_artist',
    name: 'Spotify Follow Artist',
    description: 'Verify user follows a Spotify artist',
    targetDataKey: 'artistId',
    verificationFunction: 'verifySpotifyFollowArtist',
  },
  {
    platform: 'spotify',
    taskType: 'follow_playlist',
    name: 'Spotify Follow Playlist',
    description: 'Verify user follows a Spotify playlist',
    targetDataKey: 'playlistId',
    verificationFunction: 'verifySpotifyFollowPlaylist',
  },
  
  // TikTok (smart detection, limited)
  {
    platform: 'tiktok',
    taskType: 'follow',
    name: 'TikTok Follow',
    description: 'Verify TikTok follow (smart detection)',
    targetDataKey: 'creatorTikTokId',
    verificationFunction: 'verifyTikTokFollow',
  },
  
  // Facebook (manual, limited API)
  {
    platform: 'facebook',
    taskType: 'like_page',
    name: 'Facebook Page Like',
    description: 'Verify Facebook page like (limited API)',
    targetDataKey: 'pageId',
    verificationFunction: 'verifyFacebookPageLike',
  },
  
  // Discord (requires bot)
  {
    platform: 'discord',
    taskType: 'join',
    name: 'Discord Join',
    description: 'Verify user joined Discord server (requires bot)',
    targetDataKey: 'serverId',
    verificationFunction: 'verifyDiscordJoin',
  },
  
  // Twitch
  {
    platform: 'twitch',
    taskType: 'follow',
    name: 'Twitch Follow',
    description: 'Verify user follows a Twitch channel',
    targetDataKey: 'channelId',
    verificationFunction: 'verifyTwitchFollow',
  },
];

function printUsage() {
  console.log(`
${colors.cyan}╔════════════════════════════════════════════════════════════╗
║         Social API Verification Test Runner                ║
╚════════════════════════════════════════════════════════════╝${colors.reset}

${colors.yellow}Usage:${colors.reset}
  npm run test:social -- --platform=<platform> --type=<type> [options]

${colors.yellow}Options:${colors.reset}
  --platform=<platform>   Platform to test (twitter, youtube, spotify, etc.)
  --type=<type>           Task type to test (follow, like, subscribe, etc.)
  --target=<value>        Target ID for verification (e.g., tweet ID, channel ID)
  --user=<user-id>        User ID to test (or set TEST_USER_ID env var)
  --all                   Run all available tests
  --list                  List all available tests
  --verbose               Show detailed output
  --dry-run               Check connection status without calling APIs

${colors.yellow}Examples:${colors.reset}
  npm run test:social -- --list
  npm run test:social -- --platform=twitter --type=follow --target=12345 --user=abc123
  npm run test:social -- --platform=youtube --type=subscribe --target=UC12345

${colors.yellow}Environment Variables:${colors.reset}
  TEST_USER_ID            Default user ID for testing
  DATABASE_URL            Database connection string
`);
}

function listAvailableTests() {
  console.log(`
${colors.cyan}╔════════════════════════════════════════════════════════════╗
║              Available Verification Tests                  ║
╚════════════════════════════════════════════════════════════╝${colors.reset}
`);

  const platforms = [...new Set(availableTests.map(t => t.platform))];
  
  for (const platform of platforms) {
    const platformTests = availableTests.filter(t => t.platform === platform);
    console.log(`${colors.yellow}${platform.toUpperCase()}${colors.reset}`);
    
    for (const test of platformTests) {
      console.log(`  ${colors.green}--platform=${test.platform} --type=${test.taskType}${colors.reset}`);
      console.log(`    ${test.name}: ${colors.dim}${test.description}${colors.reset}`);
      console.log(`    Requires: ${colors.cyan}--target=<${test.targetDataKey}>${colors.reset}`);
    }
    console.log('');
  }
}

async function checkUserConnection(userId: string, platform: string) {
  try {
    const [connection] = await db
      .select()
      .from(socialConnections)
      .where(
        and(
          eq(socialConnections.userId, userId),
          eq(socialConnections.platform, platform),
          eq(socialConnections.isActive, true)
        )
      );
    
    if (!connection) {
      return { connected: false, error: `No active ${platform} connection found` };
    }
    
    // Check token expiry
    if (connection.tokenExpiresAt && new Date() >= connection.tokenExpiresAt) {
      return { 
        connected: true, 
        expired: true, 
        error: 'Token expired - user needs to reconnect',
        connection 
      };
    }
    
    return { 
      connected: true, 
      expired: false,
      connection,
      username: connection.platformUsername,
      platformUserId: connection.platformUserId,
    };
  } catch (error) {
    return { connected: false, error: String(error) };
  }
}

async function runVerificationTest(
  test: TestConfig,
  userId: string,
  targetValue: string,
  verbose: boolean
) {
  console.log(`\n${colors.cyan}Testing: ${test.name}${colors.reset}`);
  console.log(`${colors.dim}${test.description}${colors.reset}`);
  
  // Step 1: Check connection
  console.log(`\n${colors.yellow}1. Checking ${test.platform} connection...${colors.reset}`);
  const connectionStatus = await checkUserConnection(userId, test.platform);
  
  if (!connectionStatus.connected) {
    console.log(`${colors.red}✖ ${connectionStatus.error}${colors.reset}`);
    return { passed: false, error: connectionStatus.error };
  }
  
  if (connectionStatus.expired) {
    console.log(`${colors.red}✖ ${connectionStatus.error}${colors.reset}`);
    return { passed: false, error: connectionStatus.error };
  }
  
  console.log(`${colors.green}✔ Connected as @${connectionStatus.username}${colors.reset}`);
  if (verbose) {
    console.log(`  Platform User ID: ${connectionStatus.platformUserId}`);
  }
  
  // Step 2: Import and run verification
  console.log(`\n${colors.yellow}2. Running verification...${colors.reset}`);
  
  try {
    // Dynamic import of verification service
    const verificationModule = await import('../server/services/social-verification-service');
    const verifyFn = (verificationModule as any)[test.verificationFunction];
    
    if (!verifyFn) {
      console.log(`${colors.red}✖ Verification function not found: ${test.verificationFunction}${colors.reset}`);
      return { passed: false, error: 'Verification function not implemented' };
    }
    
    console.log(`  Calling ${test.verificationFunction}(${userId}, ${targetValue})`);
    const result = await verifyFn(userId, targetValue);
    
    if (result.verified) {
      console.log(`${colors.green}✔ Verification PASSED${colors.reset}`);
      console.log(`  Message: ${result.message}`);
      if (verbose && result.proof) {
        console.log(`  Proof: ${JSON.stringify(result.proof, null, 2)}`);
      }
      return { passed: true, result };
    } else {
      console.log(`${colors.red}✖ Verification FAILED${colors.reset}`);
      console.log(`  Message: ${result.message}`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      return { passed: false, result };
    }
  } catch (error) {
    console.log(`${colors.red}✖ Verification error: ${error}${colors.reset}`);
    return { passed: false, error: String(error) };
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  const getArg = (name: string) => {
    const arg = args.find(a => a.startsWith(`--${name}=`));
    return arg ? arg.split('=')[1] : undefined;
  };
  
  const hasFlag = (name: string) => args.includes(`--${name}`);
  
  // Handle help/list
  if (args.length === 0 || hasFlag('help')) {
    printUsage();
    return;
  }
  
  if (hasFlag('list')) {
    listAvailableTests();
    return;
  }
  
  // Get parameters
  const platform = getArg('platform');
  const taskType = getArg('type');
  const targetValue = getArg('target');
  const userId = getArg('user') || process.env.TEST_USER_ID;
  const verbose = hasFlag('verbose');
  const dryRun = hasFlag('dry-run');
  const runAll = hasFlag('all');
  
  // Validate
  if (!userId) {
    console.error(`${colors.red}Error: User ID required. Use --user=<id> or set TEST_USER_ID env var${colors.reset}`);
    process.exitCode = 1;
    return;
  }
  
  console.log(`
${colors.cyan}╔════════════════════════════════════════════════════════════╗
║         Social API Verification Test Runner                ║
╚════════════════════════════════════════════════════════════╝${colors.reset}

User ID: ${userId}
${dryRun ? `${colors.yellow}DRY RUN MODE - No API calls will be made${colors.reset}` : ''}
`);

  // Run all tests or specific test
  if (runAll) {
    console.log(`${colors.yellow}Running all available tests...${colors.reset}`);
    const results: { test: string; passed: boolean }[] = [];
    
    for (const test of availableTests) {
      // For --all mode, we just check connections
      const connectionStatus = await checkUserConnection(userId, test.platform);
      const passed = connectionStatus.connected && !connectionStatus.expired;
      
      results.push({ test: test.name, passed });
      
      if (passed) {
        console.log(`${colors.green}✔ ${test.name} - Connection OK${colors.reset}`);
      } else {
        console.log(`${colors.red}✖ ${test.name} - ${connectionStatus.error}${colors.reset}`);
      }
    }
    
    // Summary
    const passedCount = results.filter(r => r.passed).length;
    console.log(`\n${colors.cyan}Summary: ${passedCount}/${results.length} platforms connected${colors.reset}`);
    
  } else {
    // Specific test
    if (!platform || !taskType) {
      console.error(`${colors.red}Error: --platform and --type are required${colors.reset}`);
      printUsage();
      process.exitCode = 1;
      return;
    }
    
    const test = availableTests.find(t => t.platform === platform && t.taskType === taskType);
    
    if (!test) {
      console.error(`${colors.red}Error: Unknown test: platform=${platform} type=${taskType}${colors.reset}`);
      console.log(`Use --list to see available tests`);
      process.exitCode = 1;
      return;
    }
    
    if (!targetValue && !dryRun) {
      console.error(`${colors.red}Error: --target=<${test.targetDataKey}> is required for this test${colors.reset}`);
      process.exitCode = 1;
      return;
    }
    
    if (dryRun) {
      // Just check connection
      const connectionStatus = await checkUserConnection(userId, platform);
      if (connectionStatus.connected && !connectionStatus.expired) {
        console.log(`${colors.green}✔ ${platform} connection OK - @${connectionStatus.username}${colors.reset}`);
      } else {
        console.log(`${colors.red}✖ ${connectionStatus.error}${colors.reset}`);
        process.exitCode = 1;
      }
    } else {
      // Run actual verification
      const result = await runVerificationTest(test, userId, targetValue!, verbose);
      
      if (!result.passed) {
        process.exitCode = 1;
      }
    }
  }
}

main().catch((err) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exitCode = 1;
});
