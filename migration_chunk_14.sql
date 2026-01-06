-- =====================================================

-- Add missing foreign key indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cart_items_deal_id ON cart_items(deal_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON comment_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);

-- Remove unused indexes
DROP INDEX IF EXISTS idx_comments_deal_id;
DROP INDEX IF EXISTS idx_comments_user_id;
DROP INDEX IF EXISTS idx_loyalty_transactions_account_id;
DROP INDEX IF EXISTS idx_loyalty_transactions_order_id;
DROP INDEX IF EXISTS idx_loyalty_transactions_user_id;
DROP INDEX IF EXISTS idx_newsletter_subscribers_user_id;
DROP INDEX IF EXISTS idx_orders_deal_id;

-- Optimize RLS policies on seller_loyalty_config
DROP POLICY IF EXISTS "Read seller loyalty config" ON seller_loyalty_config;
DROP POLICY IF EXISTS "Sellers can insert own config" ON seller_loyalty_config;
DROP POLICY IF EXISTS "Sellers can update own config" ON seller_loyalty_config;
DROP POLICY IF EXISTS "Sellers can delete own config" ON seller_loyalty_config;

-- Recreate policies with optimized auth function calls
CREATE POLICY "Read seller loyalty config"
  ON seller_loyalty_config
  FOR SELECT
  TO authenticated
  USING (
    accepts_loyalty_points = true OR
    seller_id = (select auth.uid())
  );

CREATE POLICY "Sellers can insert own config"
  ON seller_loyalty_config
  FOR INSERT
  TO authenticated
  WITH CHECK (seller_id = (select auth.uid()));

CREATE POLICY "Sellers can update own config"
  ON seller_loyalty_config
  FOR UPDATE
  TO authenticated
  USING (seller_id = (select auth.uid()))
  WITH CHECK (seller_id = (select auth.uid()));

CREATE POLICY "Sellers can delete own config"
  ON seller_loyalty_config
  FOR DELETE
  TO authenticated
  USING (seller_id = (select auth.uid()));


