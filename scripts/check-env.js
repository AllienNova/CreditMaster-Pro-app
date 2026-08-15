#!/usr/bin/env node

/**
 * Environment Variable Checker
 *
 * Verifies all required environment variables are set
 * Run with: node scripts/check-env.js
 */

const requiredVars = {
  Supabase: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  Stripe: [
    "STRIPE_SECRET_KEY",
    "NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID",
    "NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID",
    "NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID",
    "STRIPE_WEBHOOK_SECRET",
  ],
  "Resend (Email)": ["RESEND_API_KEY", "EMAIL_FROM"],
  "AWS S3": [
    "AWS_REGION",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_S3_BUCKET",
  ],
  "AIML API": ["AIML_API_KEY", "AIML_API_URL"],
  "App Config": ["NEXT_PUBLIC_APP_URL"],
  // Gates all five /api/cron/* routes, which mutate data across every user
  // (session cleanup, dispute status, reminder email, snapshot writes). The
  // routes now fail closed without it, so a missing value means the scheduled
  // jobs silently stop rather than run unauthenticated — still an outage, and
  // one worth catching here before deploy rather than in a support ticket.
  "Scheduled jobs": ["CRON_SECRET"],
};

const optionalVars = {
  Development: ["NODE_ENV"],
};

console.log("\n🔍 Checking Environment Variables...\n");

let allPresent = true;
let missingCount = 0;

// Check required variables
for (const [category, vars] of Object.entries(requiredVars)) {
  console.log(`\n📦 ${category}:`);

  for (const varName of vars) {
    const value = process.env[varName];
    const isPresent = !!value;
    const icon = isPresent ? "✅" : "❌";

    if (isPresent) {
      // Mask sensitive values
      const displayValue =
        varName.includes("SECRET") || varName.includes("KEY")
          ? value.substring(0, 10) + "..." + value.substring(value.length - 4)
          : value.substring(0, 30) + (value.length > 30 ? "..." : "");
      console.log(`  ${icon} ${varName}: ${displayValue}`);
    } else {
      console.log(`  ${icon} ${varName}: MISSING`);
      allPresent = false;
      missingCount++;
    }
  }
}

// Check optional variables
console.log(`\n\n🔧 Optional:`);
for (const [category, vars] of Object.entries(optionalVars)) {
  for (const varName of vars) {
    const value = process.env[varName];
    const icon = value ? "✅" : "⚠️";
    console.log(`  ${icon} ${varName}: ${value || "Not set (using default)"}`);
  }
}

// Summary
console.log("\n" + "=".repeat(60));
if (allPresent) {
  console.log("✅ All required environment variables are set!");
  console.log("\nYou can now run:");
  console.log("  npm run dev     - Start development server");
  console.log("  npm test        - Run tests");
  console.log("  npm run build   - Build for production");
} else {
  console.log(
    `❌ Missing ${missingCount} required environment variable${missingCount > 1 ? "s" : ""}`,
  );
  console.log("\nTo fix:");
  console.log("  1. Copy .env.local.example to .env.local");
  console.log("  2. Fill in the missing values");
  console.log("  3. Restart your dev server");
  console.log("\nSee TESTING_GUIDE.md for setup instructions");
  process.exit(1);
}
console.log("=".repeat(60) + "\n");
