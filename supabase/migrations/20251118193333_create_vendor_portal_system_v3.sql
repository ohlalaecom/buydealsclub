/*
  # Vendor Portal System

  1. New Tables
    - `vendor_profiles` - Extended profile for vendor users
    - `vendor_applications` - Track vendor registration applications
  
  2. Changes
    - Add vendor_id to deals table to track ownership
    - Add role column to user_profiles for user type (admin/vendor/customer)
  
  3. Security
    - Enable RLS on all tables
    - Vendors can only manage their own deals
    - Vendors can only view their own analytics
  
  4. Features
    - Vendor application system
    - Deal ownership tracking
    - Vendor-specific analytics
*/

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
