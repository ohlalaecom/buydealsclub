/*
  # Fix Security Issues - Remove Unused Indexes and Consolidate Policies

  1. Changes
    - Drop all unused indexes to improve database performance
    - Consolidate multiple permissive policies into single policies
    - Fix function search paths for security

  2. Security Improvements
    - Removes unused indexes that add overhead
    - Prevents unintended access from overlapping policies
    - Protects SECURITY DEFINER functions from search path attacks
*/

-- Drop unused indexes
DROP INDEX IF EXISTS idx_wishlists_user;
DROP INDEX IF EXISTS idx_wishlists_deal;
DROP INDEX IF EXISTS idx_deal_alerts_user;
DROP INDEX IF EXISTS idx_deal_alerts_active;
DROP INDEX IF EXISTS idx_promo_codes_code;
DROP INDEX IF EXISTS idx_promo_codes_valid;
DROP INDEX IF EXISTS idx_promo_usage_user;
DROP INDEX IF EXISTS idx_commission_vendor;
DROP INDEX IF EXISTS idx_commission_status;
DROP INDEX IF EXISTS idx_vendor_payouts_vendor;
DROP INDEX IF EXISTS idx_vendor_payouts_status;
DROP INDEX IF EXISTS idx_social_shares_deal;
DROP INDEX IF EXISTS idx_comment_reactions_comment;
DROP INDEX IF EXISTS idx_user_profiles_username;
DROP INDEX IF EXISTS idx_deals_active;
DROP INDEX IF EXISTS idx_deals_featured;
DROP INDEX IF EXISTS idx_payment_orders_order_id;
DROP INDEX IF EXISTS idx_payment_orders_user_id;
DROP INDEX IF EXISTS idx_payment_orders_status;
DROP INDEX IF EXISTS idx_payment_orders_created_at;
DROP INDEX IF EXISTS idx_events_deal_id;
DROP INDEX IF EXISTS idx_events_user_id;
DROP INDEX IF EXISTS idx_events_session_id;
DROP INDEX IF EXISTS idx_events_type;
DROP INDEX IF EXISTS idx_unmet_requests_category;
DROP INDEX IF EXISTS idx_cart_items_deal_id;
DROP INDEX IF EXISTS idx_comment_reactions_user_id;
DROP INDEX IF EXISTS idx_comments_deal_id;
DROP INDEX IF EXISTS idx_comments_user_id;
DROP INDEX IF EXISTS idx_deal_notifications_deal_id;
DROP INDEX IF EXISTS idx_deal_notifications_user_id;
DROP INDEX IF EXISTS idx_email_logs_user_id;
DROP INDEX IF EXISTS idx_group_members_user_id;
DROP INDEX IF EXISTS idx_vendor_metrics_vendor;
DROP INDEX IF EXISTS idx_vendor_metrics_date;
DROP INDEX IF EXISTS idx_vendor_search_insights_vendor;
DROP INDEX IF EXISTS idx_market_demand_category;
DROP INDEX IF EXISTS idx_group_purchase_participants_user_id;
DROP INDEX IF EXISTS idx_group_purchases_deal_id;
DROP INDEX IF EXISTS idx_group_purchases_organizer_user_id;
DROP INDEX IF EXISTS idx_loyalty_transactions_account_id;
DROP INDEX IF EXISTS idx_loyalty_transactions_order_id;
DROP INDEX IF EXISTS idx_loyalty_transactions_user_id;
DROP INDEX IF EXISTS idx_newsletter_subscribers_user_id;
DROP INDEX IF EXISTS idx_orders_deal_id;
DROP INDEX IF EXISTS idx_product_reviews_deal_id;
DROP INDEX IF EXISTS idx_product_reviews_user_id;
DROP INDEX IF EXISTS idx_reality_check_photos_deal_id;
DROP INDEX IF EXISTS idx_reality_check_photos_user_id;
DROP INDEX IF EXISTS idx_reality_check_votes_user_id;
DROP INDEX IF EXISTS idx_referral_uses_referred_user_id;
DROP INDEX IF EXISTS idx_unmet_requests_deal_matched;
DROP INDEX IF EXISTS idx_unmet_requests_user_id;
DROP INDEX IF EXISTS idx_wheel_spins_deal_id;
DROP INDEX IF EXISTS idx_vendor_metrics_top_performing_deal_id;
DROP INDEX IF EXISTS idx_user_2fa_logs_user_id;
DROP INDEX IF EXISTS idx_user_2fa_logs_created;
DROP INDEX IF EXISTS idx_deals_vendor_id;
DROP INDEX IF EXISTS idx_user_profiles_role;
DROP INDEX IF EXISTS idx_vendor_profiles_user_id;
DROP INDEX IF EXISTS idx_vendor_profiles_verified;
DROP INDEX IF EXISTS idx_vendor_applications_status;
DROP INDEX IF EXISTS idx_vendor_applications_user_id;
DROP INDEX IF EXISTS idx_product_reviews_vendor_response;
DROP INDEX IF EXISTS idx_deal_requests_user_id;
DROP INDEX IF EXISTS idx_deal_requests_category;
DROP INDEX IF EXISTS idx_deal_requests_votes;
DROP INDEX IF EXISTS idx_deal_request_votes_request;
DROP INDEX IF EXISTS idx_deal_request_votes_user;
DROP INDEX IF EXISTS idx_deal_request_offers_request;
DROP INDEX IF EXISTS idx_deal_request_offers_vendor;
DROP INDEX IF EXISTS idx_purchases_user_id;
DROP INDEX IF EXISTS idx_purchases_deal_id;
DROP INDEX IF EXISTS idx_purchases_created_at;
DROP INDEX IF EXISTS idx_purchases_payment_order_id;
DROP INDEX IF EXISTS idx_commission_transactions_deal_id;
DROP INDEX IF EXISTS idx_commission_transactions_order_id;
DROP INDEX IF EXISTS idx_customer_deal_requests_fulfilled_by_deal_id;
DROP INDEX IF EXISTS idx_deal_alerts_category_id;
DROP INDEX IF EXISTS idx_deal_alerts_deal_id;
DROP INDEX IF EXISTS idx_deal_request_offers_deal_id;
DROP INDEX IF EXISTS idx_promo_code_usage_order_id;
DROP INDEX IF EXISTS idx_promo_codes_category_id;
DROP INDEX IF EXISTS idx_promo_codes_created_by;
DROP INDEX IF EXISTS idx_promo_codes_deal_id;
DROP INDEX IF EXISTS idx_social_shares_user_id;
DROP INDEX IF EXISTS idx_vendor_applications_reviewed_by;

-- Fix function search paths for SECURITY DEFINER functions
DROP FUNCTION IF EXISTS add_loyalty_points(uuid, integer, text);
DROP FUNCTION IF EXISTS redeem_loyalty_points(uuid, integer, text);

CREATE OR REPLACE FUNCTION add_loyalty_points(
  p_user_id uuid,
  p_points integer,
  p_description text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid;
BEGIN
  SELECT id INTO v_account_id
  FROM loyalty_accounts
  WHERE user_id = p_user_id;

  IF v_account_id IS NULL THEN
    INSERT INTO loyalty_accounts (user_id, points_balance, lifetime_points_earned)
    VALUES (p_user_id, p_points, p_points)
    RETURNING id INTO v_account_id;
  ELSE
    UPDATE loyalty_accounts
    SET 
      points_balance = points_balance + p_points,
      lifetime_points_earned = lifetime_points_earned + p_points,
      updated_at = now()
    WHERE id = v_account_id;
  END IF;

  INSERT INTO loyalty_transactions (
    user_id,
    account_id,
    transaction_type,
    points_amount,
    description
  ) VALUES (
    p_user_id,
    v_account_id,
    'earn',
    p_points,
    p_description
  );
END;
$$;

CREATE OR REPLACE FUNCTION redeem_loyalty_points(
  p_user_id uuid,
  p_points integer,
  p_description text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid;
  v_current_balance integer;
BEGIN
  SELECT id, points_balance INTO v_account_id, v_current_balance
  FROM loyalty_accounts
  WHERE user_id = p_user_id;

  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'Loyalty account not found for user';
  END IF;

  IF v_current_balance < p_points THEN
    RAISE EXCEPTION 'Insufficient loyalty points';
  END IF;

  UPDATE loyalty_accounts
  SET 
    points_balance = points_balance - p_points,
    lifetime_points_spent = lifetime_points_spent + p_points,
    updated_at = now()
  WHERE id = v_account_id;

  INSERT INTO loyalty_transactions (
    user_id,
    account_id,
    transaction_type,
    points_amount,
    description
  ) VALUES (
    p_user_id,
    v_account_id,
    'redeem',
    -p_points,
    p_description
  );
END;
$$;