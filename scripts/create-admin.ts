/**
 * Create Admin User Script
 *
 * Run with: npx ts-node scripts/create-admin.ts
 * Or: npx tsx scripts/create-admin.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://lyqnofqfihrmqgltxnqq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cW5vZnFmaWhybXFnbHR4bnFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE3NDI5MywiZXhwIjoyMDc2NzUwMjkzfQ.y3yRIdweLE-XHE_loWRauWpgHgGQvA6jNSdPWfbwRKM';

// Admin user to create
const ADMIN_EMAIL = 'kimhons@gmail.com';
const ADMIN_PASSWORD = 'FynvitaAdmin2024!'; // Change this after first login!
const ADMIN_NAME = 'Kim Hons';

async function createAdminUser() {
  console.log('Creating Supabase client with service role...');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Check if user already exists
    console.log(`Checking if user ${ADMIN_EMAIL} exists...`);
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === ADMIN_EMAIL
    );

    if (existingUser) {
      console.log('User already exists. Updating role to admin...');

      // Update user metadata to include admin role
      const { data: updatedUser, error: updateError } =
        await supabase.auth.admin.updateUserById(existingUser.id, {
          app_metadata: { role: 'admin' },
          user_metadata: { full_name: ADMIN_NAME, role: 'admin' },
        });

      if (updateError) {
        console.error('Error updating user:', updateError);
        return;
      }

      console.log('✅ User updated with admin role!');
      console.log('User ID:', updatedUser.user.id);
      console.log('Email:', updatedUser.user.email);

      // Update profile in database
      await updateProfile(supabase, existingUser.id, ADMIN_NAME);
      return;
    }

    // Create new user
    console.log(`Creating new admin user: ${ADMIN_EMAIL}...`);
    const { data: newUser, error: createError } =
      await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true, // Auto-confirm email
        app_metadata: { role: 'admin' },
        user_metadata: { full_name: ADMIN_NAME, role: 'admin' },
      });

    if (createError) {
      console.error('Error creating user:', createError);
      return;
    }

    console.log('✅ Admin user created successfully!');
    console.log('User ID:', newUser.user.id);
    console.log('Email:', newUser.user.email);
    console.log('Password:', ADMIN_PASSWORD);
    console.log('\n⚠️  IMPORTANT: Change your password after first login!');

    // Create profile
    await updateProfile(supabase, newUser.user.id, ADMIN_NAME);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function updateProfile(supabase: any, userId: string, fullName: string) {
  console.log('Creating/updating profile...');

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: userId,
      full_name: fullName,
      role: 'admin',
      subscription_tier: 'enterprise',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    console.log('Profile update note:', profileError.message);
    // Profile table might not exist yet or have different schema
  } else {
    console.log('✅ Profile created/updated!');
  }
}

createAdminUser();
