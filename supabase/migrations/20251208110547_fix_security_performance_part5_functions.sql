/*
  # Fix Security and Performance Issues - Part 5
  
  Fix function search paths for security
*/

-- ==================================
-- Fix Payment Orders Updated At Function
-- ==================================

DROP TRIGGER IF EXISTS payment_orders_updated_at ON payment_orders;
DROP FUNCTION IF EXISTS update_payment_orders_updated_at();

CREATE OR REPLACE FUNCTION update_payment_orders_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER payment_orders_updated_at
  BEFORE UPDATE ON payment_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_orders_updated_at();

-- ==================================
-- Fix Purchases Updated At Function
-- ==================================

DROP TRIGGER IF EXISTS purchases_updated_at ON purchases;
DROP FUNCTION IF EXISTS update_purchases_updated_at();

CREATE OR REPLACE FUNCTION update_purchases_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER purchases_updated_at
  BEFORE UPDATE ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_purchases_updated_at();