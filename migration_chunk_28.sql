-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'unmet_requests' AND column_name = 'price_range'
  ) THEN
    ALTER TABLE unmet_requests
      ADD COLUMN price_range text,
      ADD COLUMN location text,
      ADD COLUMN category_suggested text CHECK (category_suggested IN ('hotels', 'spa_wellness', 'experiences', 'dining', 'retail', 'general'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS vendor_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id text NOT NULL,
  total_deals int DEFAULT 0,
  total_sales int DEFAULT 0,
  total_revenue decimal(10,2) DEFAULT 0,
  avg_deal_price decimal(8,2) DEFAULT 0,
  conversion_rate decimal(5,2) DEFAULT 0,
  total_views int DEFAULT 0,
  total_clicks int DEFAULT 0,
  top_performing_deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  calculation_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(vendor_id, calculation_date)
);

CREATE TABLE IF NOT EXISTS vendor_search_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id text NOT NULL,
  search_query text NOT NULL,
  query_count int DEFAULT 1,
  category text NOT NULL,
  avg_price_expectation decimal(8,2),
  last_searched timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_demand (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('hotels', 'spa_wellness', 'experiences', 'dining', 'retail', 'general')),
  demand_count int DEFAULT 0,
  avg_price_min decimal(8,2),
  avg_price_max decimal(8,2),
  location text,
  keywords text[],
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(category, location)
);

CREATE INDEX IF NOT EXISTS idx_vendor_metrics_vendor ON vendor_metrics(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_metrics_date ON vendor_metrics(calculation_date DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_search_insights_vendor ON vendor_search_insights(vendor_id);
CREATE INDEX IF NOT EXISTS idx_market_demand_category ON market_demand(category);

ALTER TABLE vendor_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_search_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_demand ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view own metrics"
  ON vendor_metrics FOR SELECT
  TO authenticated
  USING (vendor_id = auth.uid()::text OR auth.jwt()->>'role' = 'admin');

CREATE POLICY "Vendors can view own search insights"
  ON vendor_search_insights FOR SELECT
  TO authenticated
  USING (vendor_id = auth.uid()::text OR auth.jwt()->>'role' = 'admin');

CREATE POLICY "Authenticated users can view market demand"
  ON market_demand FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can manage vendor metrics"
  ON vendor_metrics FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' = 'admin');

CREATE POLICY "System can manage search insights"
  ON vendor_search_insights FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' = 'admin');

CREATE POLICY "System can manage market demand"
  ON market_demand FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' = 'admin');

CREATE OR REPLACE FUNCTION calculate_vendor_metrics(vendor_user_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  vendor_total_sales int;
  vendor_total_revenue decimal;
  vendor_total_views int;
  vendor_total_clicks int;
  vendor_conversion decimal;
BEGIN
  SELECT
    COALESCE(SUM(d.sold_quantity), 0),
    COALESCE(SUM(d.sold_quantity * d.deal_price), 0),
    COALESCE(SUM(dm.view_count), 0),
    COALESCE(SUM(dm.click_count), 0)
  INTO
    vendor_total_sales,
    vendor_total_revenue,
    vendor_total_views,
    vendor_total_clicks
  FROM deals d
  LEFT JOIN deal_metrics dm ON d.id = dm.deal_id
  WHERE d.created_at > NOW() - INTERVAL '30 days';

  IF vendor_total_views > 0 THEN
    vendor_conversion := (vendor_total_sales::decimal / vendor_total_views * 100);
  ELSE
    vendor_conversion := 0;
  END IF;

  INSERT INTO vendor_metrics (
    vendor_id,
    total_sales,
    total_revenue,
    conversion_rate,
    total_views,
    total_clicks,
    calculation_date
  )
  VALUES (
    vendor_user_id,
    vendor_total_sales,
    vendor_total_revenue,
    vendor_conversion,
    vendor_total_views,
    vendor_total_clicks,
    CURRENT_DATE
  )
  ON CONFLICT (vendor_id, calculation_date)
  DO UPDATE SET
    total_sales = EXCLUDED.total_sales,
    total_revenue = EXCLUDED.total_revenue,
    conversion_rate = EXCLUDED.conversion_rate,
    total_views = EXCLUDED.total_views,
    total_clicks = EXCLUDED.total_clicks,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION update_market_demand()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO market_demand (category, demand_count, location)
  SELECT
    COALESCE(category_suggested, 'general') as category,
    COUNT(*) as demand_count,
    COALESCE(location, 'Cyprus') as location
  FROM unmet_requests
  WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY COALESCE(category_suggested, 'general'), COALESCE(location, 'Cyprus')
  ON CONFLICT (category, location)
  DO UPDATE SET
    demand_count = EXCLUDED.demand_count,
    last_updated = NOW();
END;
$$;


