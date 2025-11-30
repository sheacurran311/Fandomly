#!/usr/bin/env tsx
/**
 * API Endpoint Tester
 * 
 * Tests critical API endpoints to ensure they return expected responses
 * Useful for smoke testing after migrations or major refactors
 */

import * as http from 'http';

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  passed: boolean;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

/**
 * Make an HTTP request to test an endpoint
 */
async function testEndpoint(
  method: string,
  path: string,
  expectedStatus: number | number[],
  body?: any,
  headers?: Record<string, string>
): Promise<TestResult> {
  const startTime = Date.now();
  const expectedStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const duration = Date.now() - startTime;
        const passed = expectedStatuses.includes(res.statusCode || 0);
        
        const result: TestResult = {
          endpoint: path,
          method,
          status: res.statusCode || 0,
          passed,
          duration,
        };
        
        if (!passed) {
          try {
            const jsonData = JSON.parse(data);
            result.error = jsonData.error || jsonData.message || 'Unknown error';
          } catch {
            result.error = data.substring(0, 100);
          }
        }
        
        resolve(result);
      });
    });
    
    req.on('error', (error) => {
      const duration = Date.now() - startTime;
      resolve({
        endpoint: path,
        method,
        status: 0,
        passed: false,
        duration,
        error: error.message,
      });
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

/**
 * Wait for server to be ready
 */
async function waitForServer(maxAttempts = 10): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const result = await testEndpoint('GET', '/api/health', [200, 404], undefined, {});
      if (result.status > 0) {
        return true;
      }
    } catch {
      // Ignore errors during warmup
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

/**
 * Run all API endpoint tests
 */
async function main() {
  console.log('🔍 Testing API Endpoints...\n');
  console.log('Note: Server must be running on port 5000\n');
  
  // Check if server is running
  const serverReady = await waitForServer();
  if (!serverReady) {
    console.error('❌ Server not responding on port 5000');
    console.error('   Please start the server with: npm run dev\n');
    process.exit(1);
  }
  
  console.log('✓ Server is running\n');
  
  // Define critical endpoints to test
  const tests = [
    // Public endpoints (no auth required)
    { method: 'GET', path: '/api/programs/public/test-slug', expectedStatus: [200, 404] },
    { method: 'GET', path: '/api/storage/test.jpg', expectedStatus: [200, 404, 500] },
    
    // Add more endpoint tests as needed
    // Note: These are basic smoke tests. Full API testing would require:
    // - Authentication token generation
    // - Database setup/teardown
    // - Test data creation
    // - More comprehensive assertions
  ];
  
  console.log(`Running ${tests.length} endpoint tests...\n`);
  
  for (const test of tests) {
    const result = await testEndpoint(
      test.method,
      test.path,
      test.expectedStatus
    );
    
    results.push(result);
    
    const icon = result.passed ? '✓' : '✗';
    const status = result.passed ? `${result.status} OK` : `${result.status} Error`;
    console.log(`${icon} ${test.method} ${test.path} - ${status} (${result.duration}ms)`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }
  
  // Print summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  
  console.log(`\n📊 Test Summary:`);
  console.log(`   Total: ${results.length}`);
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  
  if (failed === 0) {
    console.log('\n✅ All endpoint tests passed!\n');
    process.exit(0);
  } else {
    console.log(`\n❌ ${failed} endpoint test(s) failed\n`);
    process.exit(1);
  }
}

// Run tests
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

