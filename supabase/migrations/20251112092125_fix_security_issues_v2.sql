/*
  # Fix Security Issues

  1. Add Missing Indexes
    - Add index for cart_items.deal_id foreign key
    - Add index for comment_reactions.user_id foreign key

  2. Optimize RLS Policies
    - Replace auth.uid() with (select auth.uid()) in all policies
    - This prevents re-evaluation for each row, improving performance

  3. Fix Policy Conflicts
    - Remove duplicate SELECT policy on seller_loyalty_config

  4. Fix Function Search Path
    - Set search_path for create_loyalty_account_for_new_user function

  5. Remove Unused Indexes
    - Drop indexes that are not being used by queries
*/

-- Add missing indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_cart_items_deal_id ON cart_items(deal_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON comment_reactions(user_id);

-- Drop unused indexes to reduce overhead
DROP INDEX IF EXISTS idx_deals_active;
DROP INDEX IF EXISTS idx_deals_featured;
DROP INDEX IF EXISTS idx_orders_deal;
DROP INDEX IF EXISTS idx_comments_deal;
DROP INDEX IF EXISTS idx_comments_user;
DROP INDEX IF EXISTS idx_comment_reactions_comment;
DROP INDEX IF EXISTS idx_user_profiles_username;
DROP INDEX IF EXISTS idx_loyalty_accounts_user_id;
DROP INDEX IF EXISTS idx_loyalty_transactions_user_id;
DROP INDEX IF EXISTS idx_loyalty_transactions_account_id;
DROP INDEX IF EXISTS idx_loyalty_transactions_order_id;
DROP INDEX IF EXISTS idx_seller_loyalty_config_seller_id;

-- Fix orders RLS policies
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can create own orders" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;

CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Fix comments RLS policies
DROP POLICY IF EXISTS "Authenticated users can create comments" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;

CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Fix comment_reactions RLS policies
DROP POLICY IF EXISTS "Authenticated users can add reactions" ON comment_reactions;
DROP POLICY IF EXISTS "Users can delete own reactions" ON comment_reactions;

CREATE POLICY "Authenticated users can add reactions"
  ON comment_reactions FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own reactions"
  ON comment_reactions FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Fix user_profiles RLS policies
DROP POLICY IF EXISTS "Users can create own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Users can create own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- Fix cart_items RLS policies
DROP POLICY IF EXISTS "Users can view own cart" ON cart_items;
DROP POLICY IF EXISTS "Users can add to own cart" ON cart_items;
DROP POLICY IF EXISTS "Users can update own cart" ON cart_items;
DROP POLICY IF EXISTS "Users can delete from own cart" ON cart_items;

CREATE POLICY "Users can view own cart"
  ON cart_items FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can add to own cart"
  ON cart_items FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own cart"
  ON cart_items FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete from own cart"
  ON cart_items FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Fix loyalty_accounts RLS policies
DROP POLICY IF EXISTS "Users can read own loyalty account" ON loyalty_accounts;
DROP POLICY IF EXISTS "Users can update own loyalty account" ON loyalty_accounts;

CREATE POLICY "Users can read own loyalty account"
  ON loyalty_accounts FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own loyalty account"
  ON loyalty_accounts FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Fix loyalty_transactions RLS policies
DROP POLICY IF EXISTS "Users can read own loyalty transactions" ON loyalty_transactions;
DROP POLICY IF EXISTS "System can insert loyalty transactions" ON loyalty_transactions;

CREATE POLICY "Users can read own loyalty transactions"
  ON loyalty_transactions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "System can insert loyalty transactions"
  ON loyalty_transactions FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- Fix seller_loyalty_config RLS policies - remove duplicate
DROP POLICY IF EXISTS "Sellers can read own config" ON seller_loyalty_config;
DROP POLICY IF EXISTS "Sellers can update own config" ON seller_loyalty_config;
DROP POLICY IF EXISTS "Anyone can read seller loyalty acceptance" ON seller_loyalty_config;

CREATE POLICY "Sellers can manage own config"
  ON seller_loyalty_config FOR ALL
  TO authenticated
  USING ((select auth.uid()) = seller_id)
  WITH CHECK ((select auth.uid()) = seller_id);

CREATE POLICY "Anyone can read accepting sellers"
  ON seller_loyalty_config FOR SELECT
  TO authenticated
  USING (accepts_loyalty_points = true);

-- Fix function search path - drop trigger first, then function, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created_loyalty ON auth.users;
DROP FUNCTION IF EXISTS create_loyalty_account_for_new_user() CASCADE;

CREATE OR REPLACE FUNCTION create_loyalty_account_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.loyalty_accounts (user_id, points_balance, lifetime_points_earned, lifetime_points_spent, tier)
  VALUES (NEW.id, 0, 0, 0, 'bronze')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created_loyalty
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_loyalty_account_for_new_user();
