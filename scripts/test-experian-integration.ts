/**
 * Test Experian API Integration
 *
 * This script tests the Experian API connection with real credentials
 */

import { ExperianClient } from '../src/lib/credit-bureau/experian-client';
import type { UserPII, CreditReportRequest } from '../src/lib/credit-bureau/types';

async function testExperianIntegration(): Promise<void> {
  console.log('🧪 Testing Experian API Integration...\n');

  // 1. Load credentials from environment
  const clientId = process.env.EXPERIAN_CLIENT_ID;
  const clientSecret = process.env.EXPERIAN_CLIENT_SECRET;
  const sandbox = process.env.EXPERIAN_SANDBOX_MODE === 'true';

  if (!clientId || !clientSecret) {
    console.error('❌ Missing Experian credentials!');
    console.error('Please set EXPERIAN_CLIENT_ID and EXPERIAN_CLIENT_SECRET in .env.local');
    process.exit(1);
  }

  console.log('✅ Credentials loaded');
  console.log(`   Client ID: ${clientId.substring(0, 10)}...`);
  console.log(`   Sandbox Mode: ${sandbox}\n`);

  // 2. Initialize Experian client
  const client = new ExperianClient(clientId, clientSecret, sandbox);
  console.log('✅ Experian client initialized\n');

  // 3. Test OAuth token retrieval
  console.log('🔑 Testing OAuth token retrieval...');
  try {
    // Access the private method through a test
    const testRequest: CreditReportRequest = {
      user_id: 'test-user',
      bureau: 'experian',
      report_type: 'full',
      consumer_consent: true,
      permissible_purpose: 'ACCOUNT_REVIEW'
    };

    const testPII: UserPII = {
      firstName: 'John',
      lastName: 'Doe',
      ssn: '666000001', // Experian sandbox test SSN
      dateOfBirth: '1980-01-01',
      addresses: [{
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '90210',
        type: 'current'
      }]
    };

    console.log('📊 Attempting to fetch credit report...');
    const response = await client.getCreditReport(testRequest, testPII);

    if (response.success && response.data) {
      console.log('✅ Credit report retrieved successfully!');
      console.log(`   Credit Score: ${response.data.credit_score}`);
      console.log(`   Accounts: ${response.data.accounts?.length || 0}`);
      console.log(`   Inquiries: ${response.data.inquiries?.length || 0}`);
      console.log(`   Public Records: ${response.data.public_records?.length || 0}`);
    } else {
      console.log('⚠️  Credit report request returned with error:');
      console.log(`   Error: ${response.error}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    }
    process.exit(1);
  }

  console.log('\n✅ Experian integration test complete!');
}

// Run the test
testExperianIntegration().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

