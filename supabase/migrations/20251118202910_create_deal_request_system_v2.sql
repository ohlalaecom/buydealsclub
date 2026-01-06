/*
  # Customer Deal Request System

  1. New Tables
    - `customer_deal_requests` - Customer-submitted deal requests
    - `deal_request_votes` - Voting system for popular requests
    - `deal_request_offers` - Vendor offers for requests
  
  2. Security
    - Enable RLS on all tables
    - Users can create and view their own requests
    - Public can view and vote on requests
    - Vendors can submit offers
  
  3. Features
    - Customer request submission
    - Voting/demand tracking
    - Vendor offer system
    - Request fulfillment tracking
*/

CREATE TABLE IF NOT EXISTS customer_deal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  category_id uuid REFERENCES categories(id),
  budget_min decimal,
  budget_max decimal,
  preferred_location text,
  urgency text DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),
  quantity_needed int DEFAULT 1,
  flexible_dates boolean DEFAULT true,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'fulfilled', 'expired')),
  vote_count int DEFAULT 0,
  view_count int DEFAULT 0,
  offer_count int DEFAULT 0,
  fulfilled_by_deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deal_request_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES customer_deal_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(request_id, user_id)
);

CREATE TABLE IF NOT EXISTS deal_request_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES customer_deal_requests(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  offer_price decimal NOT NULL,
  offer_description text NOT NULL,
  available_quantity int NOT NULL,
  valid_until timestamptz NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_requests_user_id ON customer_deal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_requests_category ON customer_deal_requests(category_id);
CREATE INDEX IF NOT EXISTS idx_deal_requests_status ON customer_deal_requests(status);
CREATE INDEX IF NOT EXISTS idx_deal_requests_votes ON customer_deal_requests(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_deal_request_votes_request ON deal_request_votes(request_id);
CREATE INDEX IF NOT EXISTS idx_deal_request_votes_user ON deal_request_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_request_offers_request ON deal_request_offers(request_id);
CREATE INDEX IF NOT EXISTS idx_deal_request_offers_vendor ON deal_request_offers(vendor_id);

ALTER TABLE customer_deal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_request_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_request_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active requests"
  ON customer_deal_requests FOR SELECT
  TO public
  USING (status != 'expired' OR status = 'fulfilled');

CREATE POLICY "Authenticated users can create requests"
  ON customer_deal_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own requests"
  ON customer_deal_requests FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Admins can manage all requests"
  ON customer_deal_requests FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'admin');

CREATE POLICY "Anyone can view votes"
  ON deal_request_votes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can vote"
  ON deal_request_votes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can remove own votes"
  ON deal_request_votes FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Public can view offers"
  ON deal_request_offers FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Vendors can create offers"
  ON deal_request_offers FOR INSERT
  TO authenticated
  WITH CHECK (
    vendor_id = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM vendor_profiles 
      WHERE user_id = (SELECT auth.uid()) AND is_verified = true
    )
  );

CREATE POLICY "Vendors can update own offers"
  ON deal_request_offers FOR UPDATE
  TO authenticated
  USING (vendor_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION update_request_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE customer_deal_requests
    SET vote_count = vote_count + 1
    WHERE id = NEW.request_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE customer_deal_requests
    SET vote_count = vote_count - 1
    WHERE id = OLD.request_id;
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_request_vote_count ON deal_request_votes;
CREATE TRIGGER trigger_update_request_vote_count
  AFTER INSERT OR DELETE ON deal_request_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_request_vote_count();

CREATE OR REPLACE FUNCTION update_request_offer_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE customer_deal_requests
  SET 
    offer_count = (
      SELECT COUNT(*) FROM deal_request_offers 
      WHERE request_id = NEW.request_id
    ),
    status = CASE 
      WHEN status = 'pending' THEN 'in_progress'
      ELSE status
    END
  WHERE id = NEW.request_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_request_offer_count ON deal_request_offers;
CREATE TRIGGER trigger_update_request_offer_count
  AFTER INSERT ON deal_request_offers
  FOR EACH ROW
  EXECUTE FUNCTION update_request_offer_count();

CREATE OR REPLACE FUNCTION expire_old_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE customer_deal_requests
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$;
