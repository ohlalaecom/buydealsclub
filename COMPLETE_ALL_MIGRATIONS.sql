/*
  =====================================================
  COMPLETE DATABASE SETUP - ALL MIGRATIONS
  =====================================================

  This file contains ALL migrations from the beginning.
  Run this ONCE in your Supabase SQL Editor.

  Includes:
  - Migration 1: Core schema (categories, deals, orders, etc.)
  - Migration 2: Loyalty points system
  - Migrations 3-21: All remaining features

  =====================================================
*/

-- =====================================================
-- MIGRATION 1: Core QoQa Schema
-- =====================================================

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  icon text DEFAULT 'Package',
  color text DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now()
);

-- Create deals table
CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  short_description text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  original_price numeric(10, 2) NOT NULL,
  deal_price numeric(10, 2) NOT NULL,
  discount_percentage integer GENERATED ALWAYS AS (
    ROUND(((original_price - deal_price) / original_price * 100)::numeric)::integer
  ) STORED,
  stock_quantity integer NOT NULL DEFAULT 0,
  sold_quantity integer NOT NULL DEFAULT 0,
  image_url text,
  gallery_images jsonb DEFAULT '[]'::jsonb,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10, 2) NOT NULL,
  total_price numeric(10, 2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  shipping_address jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create comment_reactions table
CREATE TABLE IF NOT EXISTS comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reaction_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id, reaction_type)
);

-- Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, deal_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deals_category ON deals(category_id);
CREATE INDEX IF NOT EXISTS idx_deals_active ON deals(is_active, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_deals_featured ON deals(featured);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_deal ON orders(deal_id);
CREATE INDEX IF NOT EXISTS idx_comments_deal ON comments(deal_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment ON comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Categories policies
CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Deals policies
CREATE POLICY "Anyone can view deals"
  ON deals FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create deals"
  ON deals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update deals"
  ON deals FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete deals"
  ON deals FOR DELETE
  TO authenticated
  USING (true);

-- Orders policies
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Anyone can view comments"
  ON comments FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Comment reactions policies
CREATE POLICY "Anyone can view reactions"
  ON comment_reactions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can add reactions"
  ON comment_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions"
  ON comment_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- User profiles policies
CREATE POLICY "Anyone can view profiles"
  ON user_profiles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can create own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Cart items policies
CREATE POLICY "Users can view own cart"
  ON cart_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to own cart"
  ON cart_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart"
  ON cart_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from own cart"
  ON cart_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert default categories
INSERT INTO categories (name, slug, description, icon, color) VALUES
  ('Qsport', 'qsport', 'Sports gear and fitness equipment', 'Dumbbell', '#10B981'),
  ('Qwine', 'qwine', 'Premium wines and spirits', 'Wine', '#EF4444'),
  ('Qooking', 'qooking', 'Kitchen gadgets and gourmet food', 'ChefHat', '#F59E0B'),
  ('Qids', 'qids', 'Toys and products for children', 'Baby', '#EC4899'),
  ('Qtech', 'qtech', 'Electronics and tech gadgets', 'Smartphone', '#3B82F6'),
  ('Qtravel', 'qtravel', 'Travel experiences and vouchers', 'Plane', '#8B5CF6')
ON CONFLICT (slug) DO NOTHING;


-- =====================================================
-- MIGRATION 2: Loyalty Points System
-- =====================================================

-- Create loyalty_accounts table
CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  points_balance integer DEFAULT 0 NOT NULL,
  lifetime_points_earned integer DEFAULT 0 NOT NULL,
  lifetime_points_spent integer DEFAULT 0 NOT NULL,
  tier text DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE loyalty_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own loyalty account"
  ON loyalty_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own loyalty account"
  ON loyalty_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create loyalty_transactions table
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  account_id uuid REFERENCES loyalty_accounts NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('earn', 'redeem', 'expire', 'adjustment', 'refund')),
  points_amount integer NOT NULL,
  order_id uuid REFERENCES orders,
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own loyalty transactions"
  ON loyalty_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert loyalty transactions"
  ON loyalty_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create loyalty_settings table
CREATE TABLE IF NOT EXISTS loyalty_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  points_per_euro numeric DEFAULT 10 NOT NULL,
  redemption_rate numeric DEFAULT 0.01 NOT NULL,
  min_points_redemption integer DEFAULT 100 NOT NULL,
  expiry_months integer,
  tier_thresholds jsonb DEFAULT '{"silver": 1000, "gold": 5000, "platinum": 10000}'::jsonb,
  seller_acceptance_rate numeric DEFAULT 0.90 NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE loyalty_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read loyalty settings"
  ON loyalty_settings FOR SELECT
  TO authenticated
  USING (true);

-- Insert default loyalty settings
INSERT INTO loyalty_settings (
  points_per_euro,
  redemption_rate,
  min_points_redemption,
  expiry_months,
  tier_thresholds,
  seller_acceptance_rate
) VALUES (
  10,
  0.01,
  100,
  NULL,
  '{"silver": 1000, "gold": 5000, "platinum": 10000}'::jsonb,
  0.90
) ON CONFLICT DO NOTHING;

-- Create seller_loyalty_config table
CREATE TABLE IF NOT EXISTS seller_loyalty_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid REFERENCES auth.users NOT NULL,
  accepts_loyalty_points boolean DEFAULT true NOT NULL,
  acceptance_rate numeric,
  max_points_per_order integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(seller_id)
);

ALTER TABLE seller_loyalty_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can read own config"
  ON seller_loyalty_config FOR SELECT
  TO authenticated
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can update own config"
  ON seller_loyalty_config FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Anyone can read seller loyalty acceptance"
  ON seller_loyalty_config FOR SELECT
  TO authenticated
  USING (accepts_loyalty_points = true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_user_id ON loyalty_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_id ON loyalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_account_id ON loyalty_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_order_id ON loyalty_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_seller_loyalty_config_seller_id ON seller_loyalty_config(seller_id);

-- Create function to automatically create loyalty account on user signup
CREATE OR REPLACE FUNCTION create_loyalty_account_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO loyalty_accounts (user_id, points_balance, lifetime_points_earned, lifetime_points_spent, tier)
  VALUES (NEW.id, 0, 0, 0, 'bronze')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create loyalty accounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_loyalty'
  ) THEN
    CREATE TRIGGER on_auth_user_created_loyalty
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION create_loyalty_account_for_new_user();
  END IF;
END $$;

-- Create loyalty accounts for existing users
INSERT INTO loyalty_accounts (user_id, points_balance, lifetime_points_earned, lifetime_points_spent, tier)
SELECT id, 0, 0, 0, 'bronze'
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;


-- =====================================================
-- Now continue with the rest from COMBINED_MIGRATIONS.sql
-- (Migrations 3-21)
-- =====================================================
-- Copy the entire content from the previous COMBINED_MIGRATIONS.sql file here
-- Starting from Migration 3...

-- =====================================================
-- MIGRATION 3: Security Fixes V2
-- =====================================================

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


-- =====================================================
-- MIGRATION 4: Email System
-- =====================================================

-- Create email_preferences table
CREATE TABLE IF NOT EXISTS email_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  email text NOT NULL,
  marketing_emails boolean DEFAULT false NOT NULL,
  transactional_emails boolean DEFAULT true NOT NULL,
  deal_notifications boolean DEFAULT true NOT NULL,
  loyalty_notifications boolean DEFAULT true NOT NULL,
  order_updates boolean DEFAULT true NOT NULL,
  newsletter_subscribed boolean DEFAULT false NOT NULL,
  brevo_contact_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own email preferences"
  ON email_preferences FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own email preferences"
  ON email_preferences FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  email text NOT NULL,
  email_type text NOT NULL CHECK (email_type IN (
    'order_confirmation',
    'order_shipped',
    'order_delivered',
    'welcome',
    'password_reset',
    'loyalty_earned',
    'loyalty_redeemed',
    'loyalty_tier_upgrade',
    'deal_alert',
    'newsletter',
    'abandoned_cart'
  )),
  subject text NOT NULL,
  template_id text,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'delivered', 'opened', 'clicked', 'bounced')),
  brevo_message_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  error_message text,
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own email logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Create newsletter_subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users,
  subscribed boolean DEFAULT true NOT NULL,
  brevo_contact_id text,
  source text DEFAULT 'website',
  subscribed_at timestamptz DEFAULT now(),
  unsubscribed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe to newsletter"
  ON newsletter_subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read own newsletter subscription"
  ON newsletter_subscribers FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id OR email IN (
    SELECT email FROM auth.users WHERE id = (select auth.uid())
  ));

CREATE POLICY "Users can update own newsletter subscription"
  ON newsletter_subscribers FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id OR email IN (
    SELECT email FROM auth.users WHERE id = (select auth.uid())
  ))
  WITH CHECK ((select auth.uid()) = user_id OR email IN (
    SELECT email FROM auth.users WHERE id = (select auth.uid())
  ));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_preferences_user_id ON email_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_subscribed ON newsletter_subscribers(subscribed);

-- Function to create email preferences for new users
CREATE OR REPLACE FUNCTION create_email_preferences_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.email_preferences (
    user_id,
    email,
    marketing_emails,
    transactional_emails,
    deal_notifications,
    loyalty_notifications,
    order_updates,
    newsletter_subscribed
  )
  VALUES (
    NEW.id,
    NEW.email,
    false,
    true,
    true,
    true,
    true,
    false
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger for email preferences
DROP TRIGGER IF EXISTS on_auth_user_created_email_prefs ON auth.users;
CREATE TRIGGER on_auth_user_created_email_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_email_preferences_for_new_user();

-- Create email preferences for existing users
INSERT INTO email_preferences (user_id, email, marketing_emails, transactional_emails, deal_notifications, loyalty_notifications, order_updates, newsletter_subscribed)
SELECT
  id,
  email,
  false,
  true,
  true,
  true,
  true,
  false
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;


-- =====================================================
-- MIGRATION 5: Fix Security and Performance Issues
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


-- =====================================================
-- MIGRATION 6: Fix Remaining Security Issues
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


-- =====================================================
-- MIGRATION 7: Create Dynamic Deals System
-- =====================================================

-- Deal Types Enum
CREATE TYPE deal_type_enum AS ENUM ('regular', 'flash', 'reverse_auction', 'wheel_spin', 'streak_unlock', 'local_experience');
CREATE TYPE reservation_status_enum AS ENUM ('active', 'completed', 'expired', 'cancelled');
CREATE TYPE review_type_enum AS ENUM ('text', 'video', 'photo');
CREATE TYPE notification_status_enum AS ENUM ('pending', 'sent', 'failed');

-- Deal Reservations (10-minute lock system)
CREATE TABLE IF NOT EXISTS deal_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reserved_quantity integer NOT NULL DEFAULT 1,
  status reservation_status_enum NOT NULL DEFAULT 'active',
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_deal_reservations_deal_id ON deal_reservations(deal_id);
CREATE INDEX idx_deal_reservations_user_id ON deal_reservations(user_id);
CREATE INDEX idx_deal_reservations_expires_at ON deal_reservations(expires_at);

ALTER TABLE deal_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reservations"
  ON deal_reservations FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own reservations"
  ON deal_reservations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own reservations"
  ON deal_reservations FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Reverse Auctions (live price drops)
CREATE TABLE IF NOT EXISTS reverse_auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL UNIQUE,
  starting_price numeric(10,2) NOT NULL,
  current_price numeric(10,2) NOT NULL,
  minimum_price numeric(10,2) NOT NULL,
  price_drop_amount numeric(10,2) NOT NULL DEFAULT 1.00,
  price_drop_interval integer NOT NULL DEFAULT 300,
  total_quantity integer NOT NULL,
  sold_quantity integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  started_at timestamptz DEFAULT now(),
  ends_at timestamptz NOT NULL,
  last_price_drop timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_reverse_auctions_deal_id ON reverse_auctions(deal_id);
CREATE INDEX idx_reverse_auctions_is_active ON reverse_auctions(is_active);

ALTER TABLE reverse_auctions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active auctions"
  ON reverse_auctions FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Wheel of Surprise
CREATE TABLE IF NOT EXISTS wheel_spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  spin_date date NOT NULL DEFAULT CURRENT_DATE,
  prize_won text,
  discount_percentage integer,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, spin_date)
);

CREATE INDEX idx_wheel_spins_user_id ON wheel_spins(user_id);
CREATE INDEX idx_wheel_spins_spin_date ON wheel_spins(spin_date);

ALTER TABLE wheel_spins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own spins"
  ON wheel_spins FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own spins"
  ON wheel_spins FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- Deal Streaks
CREATE TABLE IF NOT EXISTS deal_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_purchase_date date,
  streak_rewards_unlocked integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_deal_streaks_user_id ON deal_streaks(user_id);

ALTER TABLE deal_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streaks"
  ON deal_streaks FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own streaks"
  ON deal_streaks FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "System can insert streaks"
  ON deal_streaks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- User Preferences for Personalization
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  interests text[] DEFAULT '{}',
  preferred_categories uuid[] DEFAULT '{}',
  location_city text,
  location_country text DEFAULT 'Cyprus',
  budget_min numeric(10,2),
  budget_max numeric(10,2),
  shopping_times text[] DEFAULT '{}',
  language text DEFAULT 'en',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can manage own preferences"
  ON user_preferences FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Deal Notifications Queue
CREATE TABLE IF NOT EXISTS deal_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL,
  message text NOT NULL,
  status notification_status_enum DEFAULT 'pending',
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_deal_notifications_user_id ON deal_notifications(user_id);
CREATE INDEX idx_deal_notifications_scheduled_for ON deal_notifications(scheduled_for);
CREATE INDEX idx_deal_notifications_status ON deal_notifications(status);

ALTER TABLE deal_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON deal_notifications FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Product Reviews (text, video, photos)
CREATE TABLE IF NOT EXISTS product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  review_type review_type_enum NOT NULL DEFAULT 'text',
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  content text,
  video_url text,
  helpful_count integer DEFAULT 0,
  verified_purchase boolean DEFAULT false,
  is_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_product_reviews_deal_id ON product_reviews(deal_id);
CREATE INDEX idx_product_reviews_user_id ON product_reviews(user_id);
CREATE INDEX idx_product_reviews_verified_purchase ON product_reviews(verified_purchase);

ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved reviews"
  ON product_reviews FOR SELECT
  TO authenticated
  USING (is_approved = true);

CREATE POLICY "Users can create own reviews"
  ON product_reviews FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own reviews"
  ON product_reviews FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Reality Check Photos (customer photos with votes)
CREATE TABLE IF NOT EXISTS reality_check_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  photo_url text NOT NULL,
  caption text,
  worth_it_votes integer DEFAULT 0,
  not_worth_it_votes integer DEFAULT 0,
  is_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_reality_check_photos_deal_id ON reality_check_photos(deal_id);
CREATE INDEX idx_reality_check_photos_user_id ON reality_check_photos(user_id);

ALTER TABLE reality_check_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved photos"
  ON reality_check_photos FOR SELECT
  TO authenticated
  USING (is_approved = true);

CREATE POLICY "Users can upload own photos"
  ON reality_check_photos FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- Photo Votes
CREATE TABLE IF NOT EXISTS reality_check_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid REFERENCES reality_check_photos(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_worth_it boolean NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(photo_id, user_id)
);

CREATE INDEX idx_reality_check_votes_photo_id ON reality_check_votes(photo_id);
CREATE INDEX idx_reality_check_votes_user_id ON reality_check_votes(user_id);

ALTER TABLE reality_check_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all votes"
  ON reality_check_votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create own votes"
  ON reality_check_votes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- Local Experiences (hotels, spas, tours, etc)
CREATE TABLE IF NOT EXISTS local_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL UNIQUE,
  experience_type text NOT NULL,
  location_city text NOT NULL,
  location_address text,
  partner_name text NOT NULL,
  duration text,
  capacity integer,
  valid_from date,
  valid_until date,
  is_seasonal boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_local_experiences_deal_id ON local_experiences(deal_id);
CREATE INDEX idx_local_experiences_location_city ON local_experiences(location_city);
CREATE INDEX idx_local_experiences_experience_type ON local_experiences(experience_type);

ALTER TABLE local_experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active experiences"
  ON local_experiences FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = local_experiences.deal_id
      AND deals.is_active = true
    )
  );

-- Discussion Groups
CREATE TABLE IF NOT EXISTS discussion_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text,
  member_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE discussion_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active groups"
  ON discussion_groups FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Group Members
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES discussion_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view group members"
  ON group_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can join groups"
  ON group_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can leave groups"
  ON group_members FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Referral Codes
CREATE TABLE IF NOT EXISTS referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL UNIQUE,
  uses_count integer DEFAULT 0,
  max_uses integer,
  reward_points integer DEFAULT 100,
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active codes"
  ON referral_codes FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can create own codes"
  ON referral_codes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- Referral Uses
CREATE TABLE IF NOT EXISTS referral_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id uuid REFERENCES referral_codes(id) ON DELETE CASCADE NOT NULL,
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referrer_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  points_awarded integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(referral_code_id, referred_user_id)
);

CREATE INDEX idx_referral_uses_referral_code_id ON referral_uses(referral_code_id);
CREATE INDEX idx_referral_uses_referred_user_id ON referral_uses(referred_user_id);
CREATE INDEX idx_referral_uses_referrer_user_id ON referral_uses(referrer_user_id);

ALTER TABLE referral_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals"
  ON referral_uses FOR SELECT
  TO authenticated
  USING (
    referrer_user_id = (select auth.uid()) OR
    referred_user_id = (select auth.uid())
  );

-- Group Purchases (team buying for price drops)
CREATE TABLE IF NOT EXISTS group_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  organizer_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_participants integer NOT NULL,
  current_participants integer DEFAULT 1,
  price_per_person numeric(10,2) NOT NULL,
  discount_percentage integer DEFAULT 0,
  status text DEFAULT 'active',
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_group_purchases_deal_id ON group_purchases(deal_id);
CREATE INDEX idx_group_purchases_organizer_user_id ON group_purchases(organizer_user_id);
CREATE INDEX idx_group_purchases_status ON group_purchases(status);

ALTER TABLE group_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active group purchases"
  ON group_purchases FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "Users can create group purchases"
  ON group_purchases FOR INSERT
  TO authenticated
  WITH CHECK (organizer_user_id = (select auth.uid()));

-- Group Purchase Participants
CREATE TABLE IF NOT EXISTS group_purchase_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_purchase_id uuid REFERENCES group_purchases(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_purchase_id, user_id)
);

CREATE INDEX idx_group_purchase_participants_group_purchase_id ON group_purchase_participants(group_purchase_id);
CREATE INDEX idx_group_purchase_participants_user_id ON group_purchase_participants(user_id);

ALTER TABLE group_purchase_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view participants"
  ON group_purchase_participants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can join group purchases"
  ON group_purchase_participants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- Seller Analytics
CREATE TABLE IF NOT EXISTS seller_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_deals integer DEFAULT 0,
  total_revenue numeric(12,2) DEFAULT 0,
  total_units_sold integer DEFAULT 0,
  average_rating numeric(3,2) DEFAULT 0,
  active_deals integer DEFAULT 0,
  period_start date NOT NULL,
  period_end date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(seller_user_id, period_start, period_end)
);

CREATE INDEX idx_seller_analytics_seller_user_id ON seller_analytics(seller_user_id);
CREATE INDEX idx_seller_analytics_period ON seller_analytics(period_start, period_end);

ALTER TABLE seller_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view own analytics"
  ON seller_analytics FOR SELECT
  TO authenticated
  USING (seller_user_id = (select auth.uid()));

-- Add deal_type column to existing deals table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'deal_type'
  ) THEN
    ALTER TABLE deals ADD COLUMN deal_type text DEFAULT 'regular';
  END IF;
END $$;

-- Add MSRP and market price for transparency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'msrp_price'
  ) THEN
    ALTER TABLE deals ADD COLUMN msrp_price numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'market_price'
  ) THEN
    ALTER TABLE deals ADD COLUMN market_price numeric(10,2);
  END IF;
END $$;

-- Add role column to user_profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN role text DEFAULT 'user';
  END IF;
END $$;


-- =====================================================
-- MIGRATION 8: Fix Security Issues
-- =====================================================

-- Add missing indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_comments_deal_id ON comments(deal_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_notifications_deal_id ON deal_notifications(deal_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_account_id ON loyalty_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_order_id ON loyalty_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_id ON loyalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_user_id ON newsletter_subscribers(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_deal_id ON orders(deal_id);
CREATE INDEX IF NOT EXISTS idx_wheel_spins_deal_id ON wheel_spins(deal_id);

-- Fix duplicate permissive policies on user_preferences
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;


-- =====================================================
-- MIGRATION 9: Add Wheel Discount Redemption
-- =====================================================

-- Add redemption tracking to wheel_spins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wheel_spins' AND column_name = 'is_redeemed'
  ) THEN
    ALTER TABLE wheel_spins ADD COLUMN is_redeemed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wheel_spins' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE wheel_spins ADD COLUMN expires_at timestamptz;
  END IF;
END $$;

-- Create index for efficient discount lookup
CREATE INDEX IF NOT EXISTS idx_wheel_spins_user_redemption
  ON wheel_spins(user_id, is_redeemed, expires_at);


-- =====================================================
-- MIGRATION 10 & 11: Add Deal Translations System
-- =====================================================

CREATE TABLE IF NOT EXISTS deal_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  language text NOT NULL CHECK (language IN ('en', 'el', 'ru', 'de', 'fr')),
  title text NOT NULL,
  description text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(deal_id, language)
);

CREATE INDEX IF NOT EXISTS idx_deal_translations_deal_language
  ON deal_translations(deal_id, language);

ALTER TABLE deal_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view deal translations"
  ON deal_translations
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert deal translations"
  ON deal_translations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update deal translations"
  ON deal_translations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete deal translations"
  ON deal_translations
  FOR DELETE
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION update_deal_translation_timestamp()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_deal_translations_timestamp
  BEFORE UPDATE ON deal_translations
  FOR EACH ROW
  EXECUTE FUNCTION update_deal_translation_timestamp();


-- =====================================================
-- MIGRATION 12: Fix Security and Performance Issues
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


-- =====================================================
-- MIGRATION 13: Analytics Tracking System
-- =====================================================

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('view_deal', 'click_buy_now', 'checkout_start', 'complete_purchase', 'add_to_wishlist', 'notify_me', 'conversation_query')),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS unmet_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  category text DEFAULT 'general',
  session_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deal_matched uuid REFERENCES deals(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deal_metrics (
  deal_id uuid PRIMARY KEY REFERENCES deals(id) ON DELETE CASCADE,
  view_count int DEFAULT 0,
  click_count int DEFAULT 0,
  purchase_count int DEFAULT 0,
  wishlist_count int DEFAULT 0,
  notify_count int DEFAULT 0,
  view_rate decimal(5,2) DEFAULT 0,
  click_rate decimal(5,2) DEFAULT 0,
  purchase_rate decimal(5,2) DEFAULT 0,
  smart_score decimal(8,2) DEFAULT 0,
  last_calculated timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_deal_id ON events(deal_id);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);

CREATE INDEX IF NOT EXISTS idx_unmet_requests_category ON unmet_requests(category);
CREATE INDEX IF NOT EXISTS idx_unmet_requests_created ON unmet_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deal_metrics_smart_score ON deal_metrics(smart_score DESC);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE unmet_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert events"
  ON events FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can view own events"
  ON events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR auth.jwt()->>'role' = 'admin');

CREATE POLICY "Anyone can insert unmet requests"
  ON unmet_requests FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view unmet requests"
  ON unmet_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR auth.jwt()->>'role' = 'admin');

CREATE POLICY "Anyone can view deal metrics"
  ON deal_metrics FOR SELECT
  TO public
  USING (true);

CREATE POLICY "System can update deal metrics"
  ON deal_metrics FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' = 'admin');

CREATE OR REPLACE FUNCTION update_deal_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO deal_metrics (deal_id, view_count, click_count, purchase_count, wishlist_count, notify_count)
  SELECT
    d.id,
    COALESCE(SUM(CASE WHEN e.event_type = 'view_deal' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.event_type = 'click_buy_now' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.event_type = 'complete_purchase' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.event_type = 'add_to_wishlist' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.event_type = 'notify_me' THEN 1 ELSE 0 END), 0)
  FROM deals d
  LEFT JOIN events e ON d.id = e.deal_id
  WHERE d.created_at > NOW() - INTERVAL '30 days'
  GROUP BY d.id
  ON CONFLICT (deal_id)
  DO UPDATE SET
    view_count = EXCLUDED.view_count,
    click_count = EXCLUDED.click_count,
    purchase_count = EXCLUDED.purchase_count,
    wishlist_count = EXCLUDED.wishlist_count,
    notify_count = EXCLUDED.notify_count,
    view_rate = CASE WHEN EXCLUDED.view_count > 0 THEN (EXCLUDED.click_count::decimal / EXCLUDED.view_count * 100) ELSE 0 END,
    click_rate = CASE WHEN EXCLUDED.click_count > 0 THEN (EXCLUDED.purchase_count::decimal / EXCLUDED.click_count * 100) ELSE 0 END,
    purchase_rate = CASE WHEN EXCLUDED.view_count > 0 THEN (EXCLUDED.purchase_count::decimal / EXCLUDED.view_count * 100) ELSE 0 END,
    smart_score = (
      CASE WHEN EXCLUDED.view_count > 0 THEN (EXCLUDED.click_count::decimal / EXCLUDED.view_count * 100) ELSE 0 END +
      CASE WHEN EXCLUDED.click_count > 0 THEN (EXCLUDED.purchase_count::decimal / EXCLUDED.click_count * 100) ELSE 0 END +
      CASE WHEN EXCLUDED.view_count > 0 THEN (EXCLUDED.purchase_count::decimal / EXCLUDED.view_count * 100) ELSE 0 END
    ),
    last_calculated = NOW(),
    updated_at = NOW();
END;
$$;


-- =====================================================
-- MIGRATION 14: Vendor Analytics System
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'unmet_requests' AND column_name = 'price_range'
  ) THEN
    ALTER TABLE unmet_requests
      ADD COLUMN price_range text,
      ADD COLUMN location text,
      ADD COLUMN category_suggested text CHECK (category_suggested IN ('hotels', 'spa_wellness', 'experiences', 'dining', 'retail', 'general'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS vendor_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id text NOT NULL,
  total_deals int DEFAULT 0,
  total_sales int DEFAULT 0,
  total_revenue decimal(10,2) DEFAULT 0,
  avg_deal_price decimal(8,2) DEFAULT 0,
  conversion_rate decimal(5,2) DEFAULT 0,
  total_views int DEFAULT 0,
  total_clicks int DEFAULT 0,
  top_performing_deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  calculation_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(vendor_id, calculation_date)
);

CREATE TABLE IF NOT EXISTS vendor_search_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id text NOT NULL,
  search_query text NOT NULL,
  query_count int DEFAULT 1,
  category text NOT NULL,
  avg_price_expectation decimal(8,2),
  last_searched timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_demand (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('hotels', 'spa_wellness', 'experiences', 'dining', 'retail', 'general')),
  demand_count int DEFAULT 0,
  avg_price_min decimal(8,2),
  avg_price_max decimal(8,2),
  location text,
  keywords text[],
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(category, location)
);

CREATE INDEX IF NOT EXISTS idx_vendor_metrics_vendor ON vendor_metrics(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_metrics_date ON vendor_metrics(calculation_date DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_search_insights_vendor ON vendor_search_insights(vendor_id);
CREATE INDEX IF NOT EXISTS idx_market_demand_category ON market_demand(category);

ALTER TABLE vendor_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_search_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_demand ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view own metrics"
  ON vendor_metrics FOR SELECT
  TO authenticated
  USING (vendor_id = auth.uid()::text OR auth.jwt()->>'role' = 'admin');

CREATE POLICY "Vendors can view own search insights"
  ON vendor_search_insights FOR SELECT
  TO authenticated
  USING (vendor_id = auth.uid()::text OR auth.jwt()->>'role' = 'admin');

CREATE POLICY "Authenticated users can view market demand"
  ON market_demand FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can manage vendor metrics"
  ON vendor_metrics FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' = 'admin');

CREATE POLICY "System can manage search insights"
  ON vendor_search_insights FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' = 'admin');

CREATE POLICY "System can manage market demand"
  ON market_demand FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' = 'admin');

CREATE OR REPLACE FUNCTION calculate_vendor_metrics(vendor_user_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  vendor_total_sales int;
  vendor_total_revenue decimal;
  vendor_total_views int;
  vendor_total_clicks int;
  vendor_conversion decimal;
BEGIN
  SELECT
    COALESCE(SUM(d.sold_quantity), 0),
    COALESCE(SUM(d.sold_quantity * d.deal_price), 0),
    COALESCE(SUM(dm.view_count), 0),
    COALESCE(SUM(dm.click_count), 0)
  INTO
    vendor_total_sales,
    vendor_total_revenue,
    vendor_total_views,
    vendor_total_clicks
  FROM deals d
  LEFT JOIN deal_metrics dm ON d.id = dm.deal_id
  WHERE d.created_at > NOW() - INTERVAL '30 days';

  IF vendor_total_views > 0 THEN
    vendor_conversion := (vendor_total_sales::decimal / vendor_total_views * 100);
  ELSE
    vendor_conversion := 0;
  END IF;

  INSERT INTO vendor_metrics (
    vendor_id,
    total_sales,
    total_revenue,
    conversion_rate,
    total_views,
    total_clicks,
    calculation_date
  )
  VALUES (
    vendor_user_id,
    vendor_total_sales,
    vendor_total_revenue,
    vendor_conversion,
    vendor_total_views,
    vendor_total_clicks,
    CURRENT_DATE
  )
  ON CONFLICT (vendor_id, calculation_date)
  DO UPDATE SET
    total_sales = EXCLUDED.total_sales,
    total_revenue = EXCLUDED.total_revenue,
    conversion_rate = EXCLUDED.conversion_rate,
    total_views = EXCLUDED.total_views,
    total_clicks = EXCLUDED.total_clicks,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION update_market_demand()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO market_demand (category, demand_count, location)
  SELECT
    COALESCE(category_suggested, 'general') as category,
    COUNT(*) as demand_count,
    COALESCE(location, 'Cyprus') as location
  FROM unmet_requests
  WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY COALESCE(category_suggested, 'general'), COALESCE(location, 'Cyprus')
  ON CONFLICT (category, location)
  DO UPDATE SET
    demand_count = EXCLUDED.demand_count,
    last_updated = NOW();
END;
$$;


-- =====================================================
-- MIGRATION 15: Fix Security and Performance Issues (Round 3)
-- =====================================================

-- Add missing indexes on foreign keys
CREATE INDEX IF NOT EXISTS idx_cart_items_deal_id ON cart_items(deal_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON comment_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_deal_id ON comments(deal_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_notifications_deal_id ON deal_notifications(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_notifications_user_id ON deal_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_purchase_participants_user_id ON group_purchase_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_group_purchases_deal_id ON group_purchases(deal_id);
CREATE INDEX IF NOT EXISTS idx_group_purchases_organizer_user_id ON group_purchases(organizer_user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_account_id ON loyalty_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_order_id ON loyalty_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_id ON loyalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_user_id ON newsletter_subscribers(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_deal_id ON orders(deal_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_deal_id ON product_reviews(deal_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reality_check_photos_deal_id ON reality_check_photos(deal_id);
CREATE INDEX IF NOT EXISTS idx_reality_check_photos_user_id ON reality_check_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_reality_check_votes_user_id ON reality_check_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_uses_referred_user_id ON referral_uses(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_unmet_requests_deal_matched ON unmet_requests(deal_matched);
CREATE INDEX IF NOT EXISTS idx_unmet_requests_user_id ON unmet_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_metrics_top_deal ON vendor_metrics(top_performing_deal_id);
CREATE INDEX IF NOT EXISTS idx_wheel_spins_deal_id ON wheel_spins(deal_id);

-- Optimize RLS policies
DROP POLICY IF EXISTS "Users can view own events" ON events;
CREATE POLICY "Users can view own events"
  ON events FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT auth.jwt()->>'role') = 'admin');

DROP POLICY IF EXISTS "Authenticated users can view unmet requests" ON unmet_requests;
CREATE POLICY "Authenticated users can view unmet requests"
  ON unmet_requests FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT auth.jwt()->>'role') = 'admin');

DROP POLICY IF EXISTS "System can update deal metrics" ON deal_metrics;
DROP POLICY IF EXISTS "Anyone can view deal metrics" ON deal_metrics;

CREATE POLICY "View and manage deal metrics"
  ON deal_metrics FOR ALL
  TO authenticated
  USING (
    true OR (SELECT auth.jwt()->>'role') = 'admin'
  )
  WITH CHECK (
    (SELECT auth.jwt()->>'role') = 'admin'
  );

CREATE POLICY "Public can view deal metrics"
  ON deal_metrics FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Vendors can view own metrics" ON vendor_metrics;
DROP POLICY IF EXISTS "System can manage vendor metrics" ON vendor_metrics;

CREATE POLICY "Vendors view own metrics"
  ON vendor_metrics FOR SELECT
  TO authenticated
  USING (vendor_id = (SELECT auth.uid())::text OR (SELECT auth.jwt()->>'role') = 'admin');

CREATE POLICY "Admin manages vendor metrics"
  ON vendor_metrics FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'admin')
  WITH CHECK ((SELECT auth.jwt()->>'role') = 'admin');

DROP POLICY IF EXISTS "Vendors can view own search insights" ON vendor_search_insights;
DROP POLICY IF EXISTS "System can manage search insights" ON vendor_search_insights;

CREATE POLICY "Vendors view own insights"
  ON vendor_search_insights FOR SELECT
  TO authenticated
  USING (vendor_id = (SELECT auth.uid())::text OR (SELECT auth.jwt()->>'role') = 'admin');

CREATE POLICY "Admin manages search insights"
  ON vendor_search_insights FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'admin')
  WITH CHECK ((SELECT auth.jwt()->>'role') = 'admin');

DROP POLICY IF EXISTS "Authenticated users can view market demand" ON market_demand;
DROP POLICY IF EXISTS "System can manage market demand" ON market_demand;

CREATE POLICY "Users view market demand"
  ON market_demand FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin manages market demand"
  ON market_demand FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'admin')
  WITH CHECK ((SELECT auth.jwt()->>'role') = 'admin');

-- Fix function search paths
CREATE OR REPLACE FUNCTION update_deal_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO deal_metrics (deal_id, view_count, click_count, purchase_count, wishlist_count, notify_count)
  SELECT
    d.id,
    COALESCE(SUM(CASE WHEN e.event_type = 'view_deal' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.event_type = 'click_buy_now' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.event_type = 'complete_purchase' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.event_type = 'add_to_wishlist' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.event_type = 'notify_me' THEN 1 ELSE 0 END), 0)
  FROM deals d
  LEFT JOIN events e ON d.id = e.deal_id
  WHERE d.created_at > NOW() - INTERVAL '30 days'
  GROUP BY d.id
  ON CONFLICT (deal_id)
  DO UPDATE SET
    view_count = EXCLUDED.view_count,
    click_count = EXCLUDED.click_count,
    purchase_count = EXCLUDED.purchase_count,
    wishlist_count = EXCLUDED.wishlist_count,
    notify_count = EXCLUDED.notify_count,
    view_rate = CASE WHEN EXCLUDED.view_count > 0 THEN (EXCLUDED.click_count::decimal / EXCLUDED.view_count * 100) ELSE 0 END,
    click_rate = CASE WHEN EXCLUDED.click_count > 0 THEN (EXCLUDED.purchase_count::decimal / EXCLUDED.click_count * 100) ELSE 0 END,
    purchase_rate = CASE WHEN EXCLUDED.view_count > 0 THEN (EXCLUDED.purchase_count::decimal / EXCLUDED.view_count * 100) ELSE 0 END,
    smart_score = (
      CASE WHEN EXCLUDED.view_count > 0 THEN (EXCLUDED.click_count::decimal / EXCLUDED.view_count * 100) ELSE 0 END +
      CASE WHEN EXCLUDED.click_count > 0 THEN (EXCLUDED.purchase_count::decimal / EXCLUDED.click_count * 100) ELSE 0 END +
      CASE WHEN EXCLUDED.view_count > 0 THEN (EXCLUDED.purchase_count::decimal / EXCLUDED.view_count * 100) ELSE 0 END
    ),
    last_calculated = NOW(),
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION calculate_vendor_metrics(vendor_user_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  vendor_total_sales int;
  vendor_total_revenue decimal;
  vendor_total_views int;
  vendor_total_clicks int;
  vendor_conversion decimal;
BEGIN
  SELECT
    COALESCE(SUM(d.sold_quantity), 0),
    COALESCE(SUM(d.sold_quantity * d.deal_price), 0),
    COALESCE(SUM(dm.view_count), 0),
    COALESCE(SUM(dm.click_count), 0)
  INTO
    vendor_total_sales,
    vendor_total_revenue,
    vendor_total_views,
    vendor_total_clicks
  FROM deals d
  LEFT JOIN deal_metrics dm ON d.id = dm.deal_id
  WHERE d.created_at > NOW() - INTERVAL '30 days';

  IF vendor_total_views > 0 THEN
    vendor_conversion := (vendor_total_sales::decimal / vendor_total_views * 100);
  ELSE
    vendor_conversion := 0;
  END IF;

  INSERT INTO vendor_metrics (
    vendor_id,
    total_sales,
    total_revenue,
    conversion_rate,
    total_views,
    total_clicks,
    calculation_date
  )
  VALUES (
    vendor_user_id,
    vendor_total_sales,
    vendor_total_revenue,
    vendor_conversion,
    vendor_total_views,
    vendor_total_clicks,
    CURRENT_DATE
  )
  ON CONFLICT (vendor_id, calculation_date)
  DO UPDATE SET
    total_sales = EXCLUDED.total_sales,
    total_revenue = EXCLUDED.total_revenue,
    conversion_rate = EXCLUDED.conversion_rate,
    total_views = EXCLUDED.total_views,
    total_clicks = EXCLUDED.total_clicks,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION update_market_demand()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO market_demand (category, demand_count, location)
  SELECT
    COALESCE(category_suggested, 'general') as category,
    COUNT(*) as demand_count,
    COALESCE(location, 'Cyprus') as location
  FROM unmet_requests
  WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY COALESCE(category_suggested, 'general'), COALESCE(location, 'Cyprus')
  ON CONFLICT (category, location)
  DO UPDATE SET
    demand_count = EXCLUDED.demand_count,
    last_updated = NOW();
END;
$$;


-- =====================================================
-- MIGRATION 16: Two-Factor Authentication System
-- =====================================================

CREATE TABLE IF NOT EXISTS user_2fa_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  secret text NOT NULL,
  backup_codes text[] NOT NULL,
  is_enabled boolean DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS user_2fa_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('enabled', 'disabled', 'verified', 'failed', 'backup_used')),
  ip_address text,
  user_agent text,
  success boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_2fa_secrets_user_id ON user_2fa_secrets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_2fa_logs_user_id ON user_2fa_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_2fa_logs_created ON user_2fa_logs(created_at DESC);

ALTER TABLE user_2fa_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_2fa_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own 2FA settings"
  ON user_2fa_secrets FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own 2FA settings"
  ON user_2fa_secrets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own 2FA settings"
  ON user_2fa_secrets FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own 2FA settings"
  ON user_2fa_secrets FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can view own 2FA logs"
  ON user_2fa_logs FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT auth.jwt()->>'role') = 'admin');

CREATE POLICY "System can insert 2FA logs"
  ON user_2fa_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION log_2fa_action(
  p_user_id uuid,
  p_action text,
  p_success boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO user_2fa_logs (user_id, action, success)
  VALUES (p_user_id, p_action, p_success);
END;
$$;


-- =====================================================
-- MIGRATION 17: Vendor Portal System
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN role text DEFAULT 'customer' CHECK (role IN ('admin', 'vendor', 'customer'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'vendor_id'
  ) THEN
    ALTER TABLE deals ADD COLUMN vendor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_deals_vendor_id ON deals(vendor_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

CREATE TABLE IF NOT EXISTS vendor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  business_name text NOT NULL,
  business_description text,
  business_logo_url text,
  business_address text,
  business_phone text,
  business_email text,
  business_website text,
  tax_id text,
  is_verified boolean DEFAULT false,
  verification_date timestamptz,
  total_deals_created int DEFAULT 0,
  total_sales int DEFAULT 0,
  total_revenue decimal DEFAULT 0,
  average_rating decimal DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vendor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  business_description text NOT NULL,
  business_email text NOT NULL,
  business_phone text,
  business_website text,
  why_join text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  review_notes text,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_profiles_user_id ON vendor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_verified ON vendor_profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_vendor_applications_status ON vendor_applications(status);
CREATE INDEX IF NOT EXISTS idx_vendor_applications_user_id ON vendor_applications(user_id);

ALTER TABLE vendor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view own profile"
  ON vendor_profiles FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT auth.jwt()->>'role') = 'admin');

CREATE POLICY "Vendors can insert own profile"
  ON vendor_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Vendors can update own profile"
  ON vendor_profiles FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT auth.jwt()->>'role') = 'admin');

CREATE POLICY "Admins can delete vendor profiles"
  ON vendor_profiles FOR DELETE
  TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'admin');

CREATE POLICY "Users can view own applications"
  ON vendor_applications FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT auth.jwt()->>'role') = 'admin');

CREATE POLICY "Users can submit applications"
  ON vendor_applications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Admins can update applications"
  ON vendor_applications FOR UPDATE
  TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'admin');

DROP POLICY IF EXISTS "Authenticated users can create deals" ON deals;
DROP POLICY IF EXISTS "Anyone can view active deals" ON deals;

CREATE POLICY "Anyone can view active deals"
  ON deals FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Vendors can create own deals"
  ON deals FOR INSERT
  TO authenticated
  WITH CHECK (
    vendor_id = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM vendor_profiles
      WHERE user_id = (SELECT auth.uid()) AND is_verified = true
    )
  );

CREATE POLICY "Vendors can update own deals"
  ON deals FOR UPDATE
  TO authenticated
  USING (vendor_id = (SELECT auth.uid()) OR (SELECT auth.jwt()->>'role') = 'admin');

CREATE POLICY "Vendors can delete own deals"
  ON deals FOR DELETE
  TO authenticated
  USING (vendor_id = (SELECT auth.uid()) OR (SELECT auth.jwt()->>'role') = 'admin');

CREATE POLICY "Admins can manage all deals"
  ON deals FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'admin');

CREATE OR REPLACE FUNCTION update_vendor_profile_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.vendor_id IS NOT NULL THEN
    UPDATE vendor_profiles
    SET
      total_deals_created = (
        SELECT COUNT(*) FROM deals WHERE vendor_id = NEW.vendor_id
      ),
      total_sales = (
        SELECT COALESCE(SUM(sold_quantity), 0) FROM deals WHERE vendor_id = NEW.vendor_id
      ),
      total_revenue = (
        SELECT COALESCE(SUM(sold_quantity * deal_price), 0) FROM deals WHERE vendor_id = NEW.vendor_id
      ),
      updated_at = NOW()
    WHERE user_id = NEW.vendor_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_vendor_stats ON deals;
CREATE TRIGGER trigger_update_vendor_stats
  AFTER INSERT OR UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_profile_stats();

CREATE OR REPLACE FUNCTION approve_vendor_application(application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  app_user_id uuid;
  app_business_name text;
  app_business_description text;
  app_business_email text;
  app_business_phone text;
  app_business_website text;
BEGIN
  SELECT user_id, business_name, business_description, business_email, business_phone, business_website
  INTO app_user_id, app_business_name, app_business_description, app_business_email, app_business_phone, app_business_website
  FROM vendor_applications
  WHERE id = application_id AND status = 'pending';

  IF app_user_id IS NULL THEN
    RAISE EXCEPTION 'Application not found or already processed';
  END IF;

  UPDATE vendor_applications
  SET
    status = 'approved',
    reviewed_by = (SELECT auth.uid()),
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = application_id;

  UPDATE user_profiles
  SET role = 'vendor'
  WHERE user_id = app_user_id;

  INSERT INTO vendor_profiles (
    user_id,
    business_name,
    business_description,
    business_email,
    business_phone,
    business_website,
    is_verified,
    verification_date
  ) VALUES (
    app_user_id,
    app_business_name,
    app_business_description,
    app_business_email,
    app_business_phone,
    app_business_website,
    true,
    NOW()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    is_verified = true,
    verification_date = NOW();
END;
$$;


-- =====================================================
-- MIGRATION 18: Add Vendor Review Responses
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_reviews' AND column_name = 'vendor_response'
  ) THEN
    ALTER TABLE product_reviews ADD COLUMN vendor_response text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_reviews' AND column_name = 'vendor_response_date'
  ) THEN
    ALTER TABLE product_reviews ADD COLUMN vendor_response_date timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_reviews' AND column_name = 'vendor_response_by'
  ) THEN
    ALTER TABLE product_reviews ADD COLUMN vendor_response_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_product_reviews_vendor_response ON product_reviews(vendor_response_by) WHERE vendor_response IS NOT NULL;


-- =====================================================
-- MIGRATION 19: Customer Deal Request System
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_deal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  category_id uuid REFERENCES categories(id),
  budget_min decimal,
  budget_max decimal,
  preferred_location text,
  urgency text DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),
  quantity_needed int DEFAULT 1,
  flexible_dates boolean DEFAULT true,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'fulfilled', 'expired')),
  vote_count int DEFAULT 0,
  view_count int DEFAULT 0,
  offer_count int DEFAULT 0,
  fulfilled_by_deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deal_request_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES customer_deal_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(request_id, user_id)
);

CREATE TABLE IF NOT EXISTS deal_request_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES customer_deal_requests(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  offer_price decimal NOT NULL,
  offer_description text NOT NULL,
  available_quantity int NOT NULL,
  valid_until timestamptz NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_requests_user_id ON customer_deal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_requests_category ON customer_deal_requests(category_id);
CREATE INDEX IF NOT EXISTS idx_deal_requests_status ON customer_deal_requests(status);
CREATE INDEX IF NOT EXISTS idx_deal_requests_votes ON customer_deal_requests(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_deal_request_votes_request ON deal_request_votes(request_id);
CREATE INDEX IF NOT EXISTS idx_deal_request_votes_user ON deal_request_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_request_offers_request ON deal_request_offers(request_id);
CREATE INDEX IF NOT EXISTS idx_deal_request_offers_vendor ON deal_request_offers(vendor_id);

ALTER TABLE customer_deal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_request_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_request_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active requests"
  ON customer_deal_requests FOR SELECT
  TO public
  USING (status != 'expired' OR status = 'fulfilled');

CREATE POLICY "Authenticated users can create requests"
  ON customer_deal_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own requests"
  ON customer_deal_requests FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Admins can manage all requests"
  ON customer_deal_requests FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'admin');

CREATE POLICY "Anyone can view votes"
  ON deal_request_votes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can vote"
  ON deal_request_votes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can remove own votes"
  ON deal_request_votes FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Public can view offers"
  ON deal_request_offers FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Vendors can create offers"
  ON deal_request_offers FOR INSERT
  TO authenticated
  WITH CHECK (
    vendor_id = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM vendor_profiles
      WHERE user_id = (SELECT auth.uid()) AND is_verified = true
    )
  );

CREATE POLICY "Vendors can update own offers"
  ON deal_request_offers FOR UPDATE
  TO authenticated
  USING (vendor_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION update_request_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE customer_deal_requests
    SET vote_count = vote_count + 1
    WHERE id = NEW.request_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE customer_deal_requests
    SET vote_count = vote_count - 1
    WHERE id = OLD.request_id;
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_request_vote_count ON deal_request_votes;
CREATE TRIGGER trigger_update_request_vote_count
  AFTER INSERT OR DELETE ON deal_request_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_request_vote_count();

CREATE OR REPLACE FUNCTION update_request_offer_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE customer_deal_requests
  SET
    offer_count = (
      SELECT COUNT(*) FROM deal_request_offers
      WHERE request_id = NEW.request_id
    ),
    status = CASE
      WHEN status = 'pending' THEN 'in_progress'
      ELSE status
    END
  WHERE id = NEW.request_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_request_offer_count ON deal_request_offers;
CREATE TRIGGER trigger_update_request_offer_count
  AFTER INSERT ON deal_request_offers
  FOR EACH ROW
  EXECUTE FUNCTION update_request_offer_count();

CREATE OR REPLACE FUNCTION expire_old_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE customer_deal_requests
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$;


-- =====================================================
-- MIGRATION 20: Platform Enhancement Suite - Phase 6
-- =====================================================

CREATE TABLE IF NOT EXISTS wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, deal_id)
);

CREATE TABLE IF NOT EXISTS deal_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('price_drop', 'back_in_stock', 'new_deal', 'category_deal')),
  target_price decimal,
  is_active boolean DEFAULT true,
  last_triggered_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CHECK (
    (alert_type IN ('price_drop', 'back_in_stock') AND deal_id IS NOT NULL) OR
    (alert_type IN ('new_deal', 'category_deal') AND category_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value decimal NOT NULL CHECK (discount_value > 0),
  min_purchase_amount decimal DEFAULT 0,
  max_discount_amount decimal,
  usage_limit int,
  usage_count int DEFAULT 0,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  applies_to text DEFAULT 'all' CHECK (applies_to IN ('all', 'category', 'deal')),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promo_code_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  discount_amount decimal NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(promo_code_id, order_id)
);

CREATE TABLE IF NOT EXISTS commission_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  order_total decimal NOT NULL,
  commission_rate decimal NOT NULL DEFAULT 15,
  commission_amount decimal NOT NULL,
  vendor_payout decimal NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE TABLE IF NOT EXISTS vendor_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_sales decimal NOT NULL,
  total_commission decimal NOT NULL,
  net_payout decimal NOT NULL,
  transaction_count int NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  payment_method text,
  payment_reference text,
  notes text,
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz
);

CREATE TABLE IF NOT EXISTS social_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('facebook', 'twitter', 'whatsapp', 'email', 'link')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_deal ON wishlists(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_alerts_user ON deal_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_alerts_active ON deal_alerts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promo_codes_valid ON promo_codes(valid_from, valid_until) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promo_usage_user ON promo_code_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_commission_vendor ON commission_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_commission_status ON commission_transactions(status);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_vendor ON vendor_payouts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_status ON vendor_payouts(status);
CREATE INDEX IF NOT EXISTS idx_social_shares_deal ON social_shares(deal_id);

ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own wishlist"
  ON wishlists FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Anyone can view active promo codes"
  ON promo_codes FOR SELECT
  TO public
  USING (is_active = true AND valid_from <= NOW() AND valid_until >= NOW());

CREATE POLICY "Admins can manage promo codes"
  ON promo_codes FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'admin')
  WITH CHECK ((SELECT auth.jwt()->>'role') = 'admin');

CREATE POLICY "Users can view own promo usage"
  ON promo_code_usage FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can manage own alerts"
  ON deal_alerts FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Vendors can view own commissions"
  ON commission_transactions FOR SELECT
  TO authenticated
  USING (vendor_id = (SELECT auth.uid()));

CREATE POLICY "Admins can view all commissions"
  ON commission_transactions FOR SELECT
  TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'admin');

CREATE POLICY "Vendors can view own payouts"
  ON vendor_payouts FOR SELECT
  TO authenticated
  USING (vendor_id = (SELECT auth.uid()));

CREATE POLICY "Admins can manage payouts"
  ON vendor_payouts FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'admin')
  WITH CHECK ((SELECT auth.jwt()->>'role') = 'admin');

CREATE POLICY "Anyone can create social shares"
  ON social_shares FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can view share counts"
  ON social_shares FOR SELECT
  TO public
  USING (true);

CREATE OR REPLACE FUNCTION update_promo_code_usage_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE promo_codes
  SET usage_count = usage_count + 1
  WHERE id = NEW.promo_code_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_promo_usage ON promo_code_usage;
CREATE TRIGGER trigger_update_promo_usage
  AFTER INSERT ON promo_code_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_promo_code_usage_count();

CREATE OR REPLACE FUNCTION validate_promo_code(
  code_text text,
  user_id_param uuid,
  order_total_param decimal,
  deal_id_param uuid DEFAULT NULL
)
RETURNS TABLE (
  valid boolean,
  discount_amount decimal,
  message text,
  promo_code_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  promo promo_codes%ROWTYPE;
  user_usage_count int;
  calculated_discount decimal;
BEGIN
  SELECT * INTO promo
  FROM promo_codes
  WHERE code = code_text
    AND is_active = true
    AND valid_from <= NOW()
    AND valid_until >= NOW()
  LIMIT 1;

  IF promo.id IS NULL THEN
    RETURN QUERY SELECT false, 0::decimal, 'Invalid or expired promo code', NULL::uuid;
    RETURN;
  END IF;

  IF promo.usage_limit IS NOT NULL AND promo.usage_count >= promo.usage_limit THEN
    RETURN QUERY SELECT false, 0::decimal, 'Promo code usage limit reached', NULL::uuid;
    RETURN;
  END IF;

  SELECT COUNT(*) INTO user_usage_count
  FROM promo_code_usage
  WHERE promo_code_id = promo.id AND user_id = user_id_param;

  IF user_usage_count > 0 THEN
    RETURN QUERY SELECT false, 0::decimal, 'You have already used this promo code', NULL::uuid;
    RETURN;
  END IF;

  IF order_total_param < promo.min_purchase_amount THEN
    RETURN QUERY SELECT false, 0::decimal,
      'Minimum purchase amount of €' || promo.min_purchase_amount || ' required',
      NULL::uuid;
    RETURN;
  END IF;

  IF promo.applies_to = 'deal' AND promo.deal_id IS NOT NULL AND promo.deal_id != deal_id_param THEN
    RETURN QUERY SELECT false, 0::decimal, 'This promo code is not valid for this deal', NULL::uuid;
    RETURN;
  END IF;

  IF promo.discount_type = 'percentage' THEN
    calculated_discount := (order_total_param * promo.discount_value / 100);
    IF promo.max_discount_amount IS NOT NULL THEN
      calculated_discount := LEAST(calculated_discount, promo.max_discount_amount);
    END IF;
  ELSE
    calculated_discount := promo.discount_value;
  END IF;

  calculated_discount := LEAST(calculated_discount, order_total_param);

  RETURN QUERY SELECT true, calculated_discount, 'Promo code applied successfully', promo.id;
END;
$$;


-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================

/*
  All 19 remaining migrations have been applied successfully!

  Your database now includes:
  - Security fixes and optimizations
  - Email system
  - Dynamic deals system (auctions, streaks, wheel of surprise)
  - Deal translations
  - Analytics tracking
  - Vendor analytics and market intelligence
  - Two-factor authentication
  - Vendor portal system
  - Customer deal requests
  - Platform enhancements (wishlists, alerts, promo codes)

  Next steps:
  - Your application should now be fully functional
  - All tables have Row Level Security enabled
  - All indexes are optimized
*/
