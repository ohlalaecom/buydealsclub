/*
  # Create Purchases Table

  1. New Tables
    - `purchases`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - References auth.users
      - `deal_id` (uuid) - References deals
      - `quantity` (integer) - Quantity purchased
      - `purchase_price` (decimal) - Price per unit at time of purchase
      - `total_price` (decimal) - Total price for this purchase
      - `status` (text) - Purchase status (confirmed, refunded, cancelled)
      - `payment_order_id` (uuid) - References payment_orders
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `purchases` table
    - Add policy for users to read their own purchases

  3. Indexes
    - Index on user_id for user purchase history
    - Index on deal_id for deal purchase tracking
    - Index on created_at for sorting
*/

-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  purchase_price decimal(10, 2) NOT NULL,
  total_price decimal(10, 2) GENERATED ALWAYS AS (purchase_price * quantity) STORED,
  status text NOT NULL DEFAULT 'confirmed',
  payment_order_id uuid REFERENCES payment_orders(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_deal_id ON purchases(deal_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_payment_order_id ON purchases(payment_order_id);

-- Enable RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own purchases
CREATE POLICY "Users can read own purchases"
  ON purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_purchases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER purchases_updated_at
  BEFORE UPDATE ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_purchases_updated_at();