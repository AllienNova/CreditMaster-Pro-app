-- Drop billing_profiles table (TASK-WBH-03 / FND-016, FND-017)
-- The billing-profile-store mock that populated this table has been removed.
-- Real Stripe API is now the source of truth for payment methods and invoices.
drop table if exists public.billing_profiles;
