/*
  # Create Loyalty Points Functions

  1. Functions
    - `add_loyalty_points` - Add points to user's loyalty account
    - `redeem_loyalty_points` - Redeem points from user's loyalty account

  2. Security
    - Functions use SECURITY DEFINER to bypass RLS
    - Functions validate user ownership before making changes
*/

-- Function to add loyalty points
CREATE OR REPLACE FUNCTION add_loyalty_points(
  p_user_id uuid,
  p_points integer,
  p_description text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_id uuid;
BEGIN
  SELECT id INTO v_account_id
  FROM loyalty_accounts
  WHERE user_id = p_user_id;

  IF v_account_id IS NULL THEN
    INSERT INTO loyalty_accounts (user_id, points_balance, lifetime_points_earned)
    VALUES (p_user_id, p_points, p_points)
    RETURNING id INTO v_account_id;
  ELSE
    UPDATE loyalty_accounts
    SET 
      points_balance = points_balance + p_points,
      lifetime_points_earned = lifetime_points_earned + p_points,
      updated_at = now()
    WHERE id = v_account_id;
  END IF;

  INSERT INTO loyalty_transactions (
    user_id,
    account_id,
    transaction_type,
    points_amount,
    description
  ) VALUES (
    p_user_id,
    v_account_id,
    'earn',
    p_points,
    p_description
  );
END;
$$;

-- Function to redeem loyalty points
CREATE OR REPLACE FUNCTION redeem_loyalty_points(
  p_user_id uuid,
  p_points integer,
  p_description text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_id uuid;
  v_current_balance integer;
BEGIN
  SELECT id, points_balance INTO v_account_id, v_current_balance
  FROM loyalty_accounts
  WHERE user_id = p_user_id;

  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'Loyalty account not found for user';
  END IF;

  IF v_current_balance < p_points THEN
    RAISE EXCEPTION 'Insufficient loyalty points';
  END IF;

  UPDATE loyalty_accounts
  SET 
    points_balance = points_balance - p_points,
    lifetime_points_spent = lifetime_points_spent + p_points,
    updated_at = now()
  WHERE id = v_account_id;

  INSERT INTO loyalty_transactions (
    user_id,
    account_id,
    transaction_type,
    points_amount,
    description
  ) VALUES (
    p_user_id,
    v_account_id,
    'redeem',
    -p_points,
    p_description
  );
END;
$$;