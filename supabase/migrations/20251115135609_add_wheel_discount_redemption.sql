/*
  # Add Wheel Discount Redemption System

  1. Changes to Tables
    - Add redemption tracking columns to `wheel_spins` table
      - `is_redeemed` (boolean) - tracks if discount has been used
      - `expires_at` (timestamptz) - when the discount expires (7 days)
  
  2. Notes
    - Wheel discounts expire after 7 days
    - Each discount can only be redeemed once
    - Users can have multiple active discounts
*/

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
