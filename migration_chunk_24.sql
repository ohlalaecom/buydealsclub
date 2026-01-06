-- =====================================================

-- Fix RLS policies on newsletter_subscribers
DROP POLICY IF EXISTS "Users can update own newsletter subscription" ON newsletter_subscribers;
DROP POLICY IF EXISTS "Users can read own newsletter subscription" ON newsletter_subscribers;

CREATE POLICY "Users can update own newsletter subscription"
  ON newsletter_subscribers
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can read own newsletter subscription"
  ON newsletter_subscribers
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Drop unused indexes
DROP INDEX IF EXISTS idx_group_members_group_id;
DROP INDEX IF EXISTS idx_group_members_user_id;
DROP INDEX IF EXISTS idx_referral_codes_code;
DROP INDEX IF EXISTS idx_referral_uses_referral_code_id;
DROP INDEX IF EXISTS idx_referral_uses_referred_user_id;
DROP INDEX IF EXISTS idx_group_purchases_deal_id;
DROP INDEX IF EXISTS idx_reverse_auctions_deal_id;
DROP INDEX IF EXISTS idx_reverse_auctions_is_active;
DROP INDEX IF EXISTS idx_deal_reservations_expires_at;
DROP INDEX IF EXISTS idx_wheel_spins_user_id;
DROP INDEX IF EXISTS idx_wheel_spins_spin_date;
DROP INDEX IF EXISTS idx_cart_items_deal_id;
DROP INDEX IF EXISTS idx_comment_reactions_user_id;
DROP INDEX IF EXISTS idx_email_logs_user_id;
DROP INDEX IF EXISTS idx_user_preferences_user_id;
DROP INDEX IF EXISTS idx_deal_notifications_user_id;
DROP INDEX IF EXISTS idx_deal_notifications_scheduled_for;
DROP INDEX IF EXISTS idx_deal_notifications_status;
DROP INDEX IF EXISTS idx_product_reviews_deal_id;
DROP INDEX IF EXISTS idx_product_reviews_user_id;
DROP INDEX IF EXISTS idx_product_reviews_verified_purchase;
DROP INDEX IF EXISTS idx_local_experiences_deal_id;
DROP INDEX IF EXISTS idx_local_experiences_location_city;
DROP INDEX IF EXISTS idx_reality_check_photos_deal_id;
DROP INDEX IF EXISTS idx_reality_check_photos_user_id;
DROP INDEX IF EXISTS idx_reality_check_votes_photo_id;
DROP INDEX IF EXISTS idx_reality_check_votes_user_id;
DROP INDEX IF EXISTS idx_local_experiences_experience_type;
DROP INDEX IF EXISTS idx_group_purchases_organizer_user_id;
DROP INDEX IF EXISTS idx_comments_deal_id;
DROP INDEX IF EXISTS idx_group_purchase_participants_group_purchase_id;
DROP INDEX IF EXISTS idx_group_purchase_participants_user_id;
DROP INDEX IF EXISTS idx_comments_user_id;
DROP INDEX IF EXISTS idx_seller_analytics_seller_user_id;
DROP INDEX IF EXISTS idx_seller_analytics_period;
DROP INDEX IF EXISTS idx_orders_deal_id;
DROP INDEX IF EXISTS idx_wheel_spins_deal_id;
DROP INDEX IF EXISTS idx_wheel_spins_user_redemption;
DROP INDEX IF EXISTS idx_deal_notifications_deal_id;
DROP INDEX IF EXISTS idx_loyalty_transactions_account_id;
DROP INDEX IF EXISTS idx_loyalty_transactions_order_id;
DROP INDEX IF EXISTS idx_loyalty_transactions_user_id;
DROP INDEX IF EXISTS idx_newsletter_subscribers_user_id;
DROP INDEX IF EXISTS idx_deal_translations_deal_language;


