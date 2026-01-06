-- =====================================================

-- Add missing foreign key indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_comments_deal_id ON comments(deal_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_account_id ON loyalty_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_order_id ON loyalty_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_id ON loyalty_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_user_id ON newsletter_subscribers(user_id);

CREATE INDEX IF NOT EXISTS idx_orders_deal_id ON orders(deal_id);

-- Remove unused indexes
DROP INDEX IF EXISTS idx_email_logs_email_type;
DROP INDEX IF EXISTS idx_email_logs_status;
DROP INDEX IF EXISTS idx_email_logs_user_id;
DROP INDEX IF EXISTS idx_newsletter_subscribers_email;
DROP INDEX IF EXISTS idx_newsletter_subscribers_subscribed;
DROP INDEX IF EXISTS idx_cart_items_deal_id;
DROP INDEX IF EXISTS idx_comment_reactions_user_id;

-- Fix multiple permissive policies on seller_loyalty_config
DROP POLICY IF EXISTS "Anyone can read accepting sellers" ON seller_loyalty_config;
DROP POLICY IF EXISTS "Sellers can manage own config" ON seller_loyalty_config;

-- Create a single comprehensive SELECT policy
CREATE POLICY "Read seller loyalty config"
  ON seller_loyalty_config
  FOR SELECT
  TO authenticated
  USING (
    accepts_loyalty_points = true OR
    seller_id = auth.uid()
  );

-- Create specific policies for INSERT, UPDATE, DELETE
CREATE POLICY "Sellers can insert own config"
  ON seller_loyalty_config
  FOR INSERT
  TO authenticated
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers can update own config"
  ON seller_loyalty_config
  FOR UPDATE
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers can delete own config"
  ON seller_loyalty_config
  FOR DELETE
  TO authenticated
  USING (seller_id = auth.uid());


