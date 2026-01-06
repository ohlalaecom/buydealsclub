/*
  # Remove Loyalty Points System

  1. Drops
    - Drop loyalty_accounts table
    - Drop loyalty_transactions table
    - Drop loyalty_settings table
    - Drop seller_loyalty_config table
    - Drop referral_codes table
    - Drop referral_uses table
    - Drop related functions and triggers

  2. Important Notes
    - This permanently removes all loyalty points data
    - All referral codes and uses will be deleted
    - This action cannot be undone
*/

-- Drop trigger and function for auto-creating loyalty accounts
DROP TRIGGER IF EXISTS on_auth_user_created_loyalty ON auth.users;
DROP FUNCTION IF EXISTS create_loyalty_account_for_new_user();

-- Drop loyalty points related functions
DROP FUNCTION IF EXISTS award_loyalty_points(uuid, integer, text);
DROP FUNCTION IF EXISTS redeem_loyalty_points(uuid, integer, text);
DROP FUNCTION IF EXISTS update_loyalty_tier(uuid);

-- Drop referral tables (with CASCADE to handle foreign keys)
DROP TABLE IF EXISTS referral_uses CASCADE;
DROP TABLE IF EXISTS referral_codes CASCADE;

-- Drop loyalty tables (with CASCADE to handle foreign keys)
DROP TABLE IF EXISTS loyalty_transactions CASCADE;
DROP TABLE IF EXISTS seller_loyalty_config CASCADE;
DROP TABLE IF EXISTS loyalty_accounts CASCADE;
DROP TABLE IF EXISTS loyalty_settings CASCADE;
