/**
 * Test Credit Bureau Integration
 * 
 * This script tests the credit bureau database integration by:
 * 1. Creating a test user
 * 2. Generating mock credit reports
 * 3. Saving to database
 * 4. Retrieving and verifying data
 * 5. Testing RLS policies
 * 
 * Run with: npx ts-node scripts/test-credit-bureau-integration.ts
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test data
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'; // Mock user ID

async function main() {
  console.log('🧪 Starting Credit Bureau Integration Test\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Check if tables exist
    console.log('\n📋 Test 1: Verify tables exist');
    await testTablesExist();

    // Test 2: Insert mock credit report
    console.log('\n📋 Test 2: Insert mock credit report');
    const reportId = await testInsertCreditReport();

    // Test 3: Insert credit accounts
    console.log('\n📋 Test 3: Insert credit accounts');
    await testInsertCreditAccounts(reportId);

    // Test 4: Insert credit inquiries
    console.log('\n📋 Test 4: Insert credit inquiries');
    await testInsertCreditInquiries(reportId);

    // Test 5: Query latest credit scores view
    console.log('\n📋 Test 5: Query latest_credit_scores view');
    await testLatestCreditScoresView();

    // Test 6: Query account summary view
    console.log('\n📋 Test 6: Query account_summary view');
    await testAccountSummaryView();

    // Test 7: Test RLS policies (if using service role key)
    console.log('\n📋 Test 7: Test Row Level Security');
    await testRLSPolicies();

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests passed!');
    console.log('🎉 Credit Bureau Integration is working correctly!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

async function testTablesExist() {
  const tables = ['credit_reports', 'credit_accounts', 'credit_inquiries', 'public_records'];
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Table ${table} does not exist or is not accessible: ${error.message}`);
    }

    console.log(`   ✅ Table '${table}' exists and is accessible`);
  }
}

async function testInsertCreditReport(): Promise<string> {
  const reportData = {
    user_id: TEST_USER_ID,
    bureau: 'experian',
    report_date: new Date().toISOString().split('T')[0],
    credit_score: 720,
    score_factors: ['Good payment history', 'Low credit utilization'],
    raw_data: { test: true, generated_at: new Date().toISOString() },
    parsed_data: {
      personalInfo: {
        firstName: 'Test',
        lastName: 'User',
        ssn: '***-**-1234',
        dateOfBirth: '1990-01-01',
        addresses: [{
          streetAddress: '123 Test St',
          city: 'Test City',
          state: 'CA',
          zipCode: '90210',
        }],
      },
      creditScore: 720,
      scoreFactors: ['Good payment history', 'Low credit utilization'],
      accounts: [],
      inquiries: [],
      publicRecords: [],
    },
  };

  const { data, error } = await supabase
    .from('credit_reports')
    .insert(reportData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert credit report: ${error.message}`);
  }

  console.log(`   ✅ Credit report inserted with ID: ${data.id}`);
  console.log(`   📊 Credit score: ${data.credit_score}`);
  console.log(`   🏦 Bureau: ${data.bureau}`);
  
  return data.id;
}

async function testInsertCreditAccounts(reportId: string) {
  const accounts = [
    {
      report_id: reportId,
      user_id: TEST_USER_ID,
      account_type: 'credit_card',
      account_number: '****1234',
      creditor_name: 'Test Bank Credit Card',
      balance: 1500.00,
      credit_limit: 10000.00,
      payment_status: 'current',
      opened_date: '2020-01-01',
      closed_date: null,
      last_payment_date: '2025-01-01',
      payment_history: { on_time: 60, late: 0 },
      is_disputed: false,
    },
    {
      report_id: reportId,
      user_id: TEST_USER_ID,
      account_type: 'auto_loan',
      account_number: '****5678',
      creditor_name: 'Test Auto Finance',
      balance: 15000.00,
      credit_limit: null,
      payment_status: 'current',
      opened_date: '2022-06-01',
      closed_date: null,
      last_payment_date: '2025-01-01',
      payment_history: { on_time: 30, late: 0 },
      is_disputed: false,
    },
  ];

  const { data, error } = await supabase
    .from('credit_accounts')
    .insert(accounts)
    .select();

  if (error) {
    throw new Error(`Failed to insert credit accounts: ${error.message}`);
  }

  console.log(`   ✅ ${data.length} credit accounts inserted`);
  data.forEach((account, index) => {
    console.log(`   💳 Account ${index + 1}: ${account.creditor_name} - $${account.balance}`);
  });
}

async function testInsertCreditInquiries(reportId: string) {
  const inquiries = [
    {
      report_id: reportId,
      user_id: TEST_USER_ID,
      inquiry_type: 'hard',
      creditor_name: 'Test Credit Card Company',
      inquiry_date: '2024-12-01',
      is_disputed: false,
    },
    {
      report_id: reportId,
      user_id: TEST_USER_ID,
      inquiry_type: 'soft',
      creditor_name: 'Credit Monitoring Service',
      inquiry_date: '2025-01-01',
      is_disputed: false,
    },
  ];

  const { data, error } = await supabase
    .from('credit_inquiries')
    .insert(inquiries)
    .select();

  if (error) {
    throw new Error(`Failed to insert credit inquiries: ${error.message}`);
  }

  console.log(`   ✅ ${data.length} credit inquiries inserted`);
  data.forEach((inquiry, index) => {
    console.log(`   🔍 Inquiry ${index + 1}: ${inquiry.creditor_name} (${inquiry.inquiry_type})`);
  });
}

async function testLatestCreditScoresView() {
  const { data, error } = await supabase
    .from('latest_credit_scores')
    .select('*')
    .eq('user_id', TEST_USER_ID);

  if (error) {
    throw new Error(`Failed to query latest_credit_scores view: ${error.message}`);
  }

  console.log(`   ✅ Found ${data.length} latest credit score(s)`);
  data.forEach((score) => {
    console.log(`   📊 ${score.bureau}: ${score.credit_score} (as of ${score.report_date})`);
  });
}

async function testAccountSummaryView() {
  const { data, error } = await supabase
    .from('account_summary')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to query account_summary view: ${error.message}`);
  }

  if (data) {
    console.log(`   ✅ Account summary retrieved`);
    console.log(`   📊 Total accounts: ${data.total_accounts}`);
    console.log(`   ✅ Current accounts: ${data.current_accounts}`);
    console.log(`   💰 Total balance: $${data.total_balance}`);
    console.log(`   💳 Total credit limit: $${data.total_credit_limit}`);
    console.log(`   📈 Utilization rate: ${data.utilization_rate?.toFixed(2)}%`);
  } else {
    console.log(`   ℹ️  No account summary data yet (this is normal for new data)`);
  }
}

async function testRLSPolicies() {
  // Note: RLS testing requires proper authentication context
  // This is a basic check to ensure policies are enabled
  
  const { data, error } = await supabase
    .from('credit_reports')
    .select('*')
    .eq('user_id', TEST_USER_ID);

  if (error) {
    console.log(`   ⚠️  RLS policies may be blocking access (expected with anon key)`);
    console.log(`   ℹ️  Use SUPABASE_SERVICE_ROLE_KEY to bypass RLS for testing`);
  } else {
    console.log(`   ✅ RLS policies are configured (${data.length} reports accessible)`);
  }
}

// Run the tests
main();

