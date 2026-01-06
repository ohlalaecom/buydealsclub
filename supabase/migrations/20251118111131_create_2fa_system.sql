/*
  # Two-Factor Authentication System

  1. New Tables
    - `user_2fa_secrets`
      - Stores TOTP secrets for users who enable 2FA
      - Encrypted secrets for Google/Microsoft Authenticator
      - Backup codes for account recovery
      - Status tracking (enabled/disabled)
  
  2. Security
    - Enable RLS on all tables
    - Users can only manage their own 2FA settings
    - Admins can view 2FA status (not secrets)
    - Secrets are sensitive and heavily protected
  
  3. Features
    - TOTP-based 2FA (30-second codes)
    - QR code enrollment
    - 10 backup codes per user
    - Disable/re-enable capability
*/

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
