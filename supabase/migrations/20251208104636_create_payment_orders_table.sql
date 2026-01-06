/*
  # Create Payment Orders Table for Mypos Integration

  1. New Tables
    - `payment_orders`
      - `id` (uuid, primary key)
      - `order_id` (text, unique) - Unique order identifier for payment gateway
      - `user_id` (uuid) - References auth.users
      - `amount` (decimal) - Total order amount
      - `currency` (text) - Currency code (e.g., ZAR, EUR)
      - `status` (text) - Order status (pending, completed, failed, cancelled)
      - `payment_method` (text) - Payment method used (mypos)
      - `transaction_id` (text) - Payment gateway transaction ID
      - `customer_info` (jsonb) - Customer details for payment
      - `order_items` (jsonb) - Array of order items
      - `payment_response` (jsonb) - Raw payment gateway response
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `payment_orders` table
    - Add policy for users to read their own orders
    - Add policy for authenticated users to create orders

  3. Indexes
    - Index on order_id for fast lookups
    - Index on user_id for user order history
    - Index on status for filtering
    - Index on created_at for sorting
*/

-- Create payment_orders table
CREATE TABLE IF NOT EXISTS payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount decimal(10, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'ZAR',
  status text NOT NULL DEFAULT 'pending',
  payment_method text NOT NULL DEFAULT 'mypos',
  transaction_id text,
  customer_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  order_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  payment_response jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_orders_order_id ON payment_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at ON payment_orders(created_at DESC);

-- Enable RLS
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own orders
CREATE POLICY "Users can read own payment orders"
  ON payment_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can create their own orders
CREATE POLICY "Users can create own payment orders"
  ON payment_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER payment_orders_updated_at
  BEFORE UPDATE ON payment_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_orders_updated_at();