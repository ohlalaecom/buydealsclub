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


