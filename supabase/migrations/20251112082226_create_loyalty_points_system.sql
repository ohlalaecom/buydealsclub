/*
  # Loyalty Points System

  1. New Tables
    - `loyalty_accounts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users) - User who owns the account
      - `points_balance` (integer) - Current loyalty points balance
      - `lifetime_points_earned` (integer) - Total points earned over time
      - `lifetime_points_spent` (integer) - Total points redeemed over time
      - `tier` (text) - Loyalty tier (bronze, silver, gold, platinum)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `loyalty_transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users) - User performing the transaction
      - `account_id` (uuid, references loyalty_accounts) - Loyalty account
      - `transaction_type` (text) - Type: earn, redeem, expire, adjustment
      - `points_amount` (integer) - Points earned/spent (positive or negative)
      - `order_id` (uuid, references orders, nullable) - Related order if applicable
      - `description` (text) - Transaction description
      - `created_at` (timestamptz)

    - `loyalty_settings`
      - `id` (uuid, primary key)
      - `points_per_euro` (numeric) - Points earned per euro spent (e.g., 10 points per €1)
      - `redemption_rate` (numeric) - Euro value per point (e.g., 100 points = €1)
      - `min_points_redemption` (integer) - Minimum points required to redeem
      - `expiry_months` (integer) - Months until points expire (null = never)
      - `tier_thresholds` (jsonb) - Tier upgrade thresholds
      - `seller_acceptance_rate` (numeric) - % of points value seller receives (default 0.9)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `seller_loyalty_config`
      - `id` (uuid, primary key)
      - `seller_id` (uuid, references auth.users) - Seller/business account
      - `accepts_loyalty_points` (boolean) - Whether seller accepts points
      - `acceptance_rate` (numeric) - Custom rate (null uses system default)
      - `max_points_per_order` (integer) - Max points redeemable per order (null = unlimited)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can read their own loyalty accounts and transactions
    - Only authenticated users can earn/redeem points
    - Admins can manage loyalty settings and seller configurations

  3. Important Notes
    - Points are earned as a percentage of purchase amount
    - Points can be redeemed at checkout for discounts
    - Sellers opt-in to accept loyalty points
    - System tracks all point transactions for auditing
    - Tier system rewards high-value customers
*/

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
