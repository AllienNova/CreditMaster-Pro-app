/**
 * Test Experian API Integration (JavaScript version)
 * 
 * This script tests the Experian API connection with real credentials
 */

require('dotenv').config({ path: '.env.local' });

async function testExperianOAuth() {
  console.log('🧪 Testing Experian OAuth 2.0...\n');

  // 1. Load credentials
  const clientId = process.env.EXPERIAN_CLIENT_ID;
  const clientSecret = process.env.EXPERIAN_CLIENT_SECRET;
  const apiUrl = process.env.EXPERIAN_API_URL || 'https://sandbox-us-api.experian.com';

  if (!clientId || !clientSecret) {
    console.error('❌ Missing Experian credentials!');
    console.error('Please set EXPERIAN_CLIENT_ID and EXPERIAN_CLIENT_SECRET in .env.local');
    process.exit(1);
  }

  console.log('✅ Credentials loaded');
  console.log(`   Client ID: ${clientId.substring(0, 15)}...`);
  console.log(`   API URL: ${apiUrl}\n`);

  // 2. Test OAuth token retrieval
  console.log('🔑 Testing OAuth token retrieval...');
  console.log('   Using client credentials flow...\n');

  try {
    const tokenEndpoint = `${apiUrl}/oauth2/v1/token`;

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'client_id': clientId,
        'client_secret': clientSecret,
        'grant_type': 'client_credentials'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Token request failed: ${response.status} ${response.statusText}`);
      console.error(`   Response: ${errorText}`);
      process.exit(1);
    }

    const data = await response.json();
    
    if (data.access_token) {
      console.log('✅ OAuth token retrieved successfully!');
      console.log(`   Token: ${data.access_token.substring(0, 20)}...`);
      console.log(`   Expires in: ${data.expires_in} seconds`);
      console.log(`   Token type: ${data.token_type}`);
    } else {
      console.error('❌ No access token in response');
      console.error(`   Response: ${JSON.stringify(data, null, 2)}`);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
    process.exit(1);
  }

  console.log('\n✅ Experian OAuth test complete!');
  console.log('\n📋 Next Steps:');
  console.log('   1. Test credit report fetch');
  console.log('   2. Integrate with API routes');
  console.log('   3. Update UI components');
}

// Run the test
testExperianOAuth().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

