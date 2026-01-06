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


