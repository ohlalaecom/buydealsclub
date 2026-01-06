/*
  # Fix Security and Performance Issues - Part 1
  
  1. Add missing indexes for foreign keys
  2. Remove duplicate indexes
*/

-- ==================================
-- Add Missing Indexes for Foreign Keys
-- ==================================

CREATE INDEX IF NOT EXISTS idx_commission_transactions_deal_id ON commission_transactions(deal_id);
CREATE INDEX IF NOT EXISTS idx_commission_transactions_order_id ON commission_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_customer_deal_requests_fulfilled_by_deal_id ON customer_deal_requests(fulfilled_by_deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_alerts_category_id ON deal_alerts(category_id);
CREATE INDEX IF NOT EXISTS idx_deal_alerts_deal_id ON deal_alerts(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_request_offers_deal_id ON deal_request_offers(deal_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_usage_order_id ON promo_code_usage(order_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_category_id ON promo_codes(category_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_created_by ON promo_codes(created_by);
CREATE INDEX IF NOT EXISTS idx_promo_codes_deal_id ON promo_codes(deal_id);
CREATE INDEX IF NOT EXISTS idx_social_shares_user_id ON social_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_applications_reviewed_by ON vendor_applications(reviewed_by);

-- ==================================
-- Remove Duplicate Indexes
-- ==================================

DROP INDEX IF EXISTS idx_comments_deal;
DROP INDEX IF EXISTS idx_comments_user;
DROP INDEX IF EXISTS idx_orders_deal;
DROP INDEX IF EXISTS idx_vendor_metrics_top_deal;