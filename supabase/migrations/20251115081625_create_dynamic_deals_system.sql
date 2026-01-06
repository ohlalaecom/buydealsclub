/*
  # Create Dynamic Deals System

  1. New Tables
    - `deal_types` - Types of deals (flash, auction, wheel_spin, streak, regular)
    - `deal_reservations` - Temporary locks on deals (10-minute holds)
    - `reverse_auctions` - Live price drop auctions
    - `wheel_spins` - Wheel of Surprise tracking
    - `deal_streaks` - User consecutive shopping streaks
    - `user_preferences` - Personalization data
    - `deal_notifications` - Push notification queue
    - `product_reviews` - Video and text reviews
    - `reality_check_photos` - Customer photos with votes
    - `local_experiences` - Exclusive local deals (hotels, spas, etc)
    - `discussion_groups` - Community groups
    - `group_members` - Discussion group membership
    - `referral_codes` - Referral tracking
    - `group_purchases` - Team buying for price drops
    - `seller_analytics` - Seller performance metrics

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for each table
    - Use (select auth.uid()) for optimized performance

  3. Indexes
    - Add indexes on foreign keys and frequently queried columns
*/

-- Deal Types Enum
CREATE TYPE deal_type_enum AS ENUM ('regular', 'flash', 'reverse_auction', 'wheel_spin', 'streak_unlock', 'local_experience');
CREATE TYPE reservation_status_enum AS ENUM ('active', 'completed', 'expired', 'cancelled');
CREATE TYPE review_type_enum AS ENUM ('text', 'video', 'photo');
CREATE TYPE notification_status_enum AS ENUM ('pending', 'sent', 'failed');

-- Deal Reservations (10-minute lock system)
CREATE TABLE IF NOT EXISTS deal_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reserved_quantity integer NOT NULL DEFAULT 1,
  status reservation_status_enum NOT NULL DEFAULT 'active',
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_deal_reservations_deal_id ON deal_reservations(deal_id);
CREATE INDEX idx_deal_reservations_user_id ON deal_reservations(user_id);
CREATE INDEX idx_deal_reservations_expires_at ON deal_reservations(expires_at);

ALTER TABLE deal_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reservations"
  ON deal_reservations FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own reservations"
  ON deal_reservations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own reservations"
  ON deal_reservations FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Reverse Auctions (live price drops)
CREATE TABLE IF NOT EXISTS reverse_auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL UNIQUE,
  starting_price numeric(10,2) NOT NULL,
  current_price numeric(10,2) NOT NULL,
  minimum_price numeric(10,2) NOT NULL,
  price_drop_amount numeric(10,2) NOT NULL DEFAULT 1.00,
  price_drop_interval integer NOT NULL DEFAULT 300,
  total_quantity integer NOT NULL,
  sold_quantity integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  started_at timestamptz DEFAULT now(),
  ends_at timestamptz NOT NULL,
  last_price_drop timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_reverse_auctions_deal_id ON reverse_auctions(deal_id);
CREATE INDEX idx_reverse_auctions_is_active ON reverse_auctions(is_active);

ALTER TABLE reverse_auctions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active auctions"
  ON reverse_auctions FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Wheel of Surprise
CREATE TABLE IF NOT EXISTS wheel_spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  spin_date date NOT NULL DEFAULT CURRENT_DATE,
  prize_won text,
  discount_percentage integer,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, spin_date)
);

CREATE INDEX idx_wheel_spins_user_id ON wheel_spins(user_id);
CREATE INDEX idx_wheel_spins_spin_date ON wheel_spins(spin_date);

ALTER TABLE wheel_spins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own spins"
  ON wheel_spins FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own spins"
  ON wheel_spins FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- Deal Streaks
CREATE TABLE IF NOT EXISTS deal_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_purchase_date date,
  streak_rewards_unlocked integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_deal_streaks_user_id ON deal_streaks(user_id);

ALTER TABLE deal_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streaks"
  ON deal_streaks FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own streaks"
  ON deal_streaks FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "System can insert streaks"
  ON deal_streaks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- User Preferences for Personalization
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  interests text[] DEFAULT '{}',
  preferred_categories uuid[] DEFAULT '{}',
  location_city text,
  location_country text DEFAULT 'Cyprus',
  budget_min numeric(10,2),
  budget_max numeric(10,2),
  shopping_times text[] DEFAULT '{}',
  language text DEFAULT 'en',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can manage own preferences"
  ON user_preferences FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Deal Notifications Queue
CREATE TABLE IF NOT EXISTS deal_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL,
  message text NOT NULL,
  status notification_status_enum DEFAULT 'pending',
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_deal_notifications_user_id ON deal_notifications(user_id);
CREATE INDEX idx_deal_notifications_scheduled_for ON deal_notifications(scheduled_for);
CREATE INDEX idx_deal_notifications_status ON deal_notifications(status);

ALTER TABLE deal_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON deal_notifications FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Product Reviews (text, video, photos)
CREATE TABLE IF NOT EXISTS product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  review_type review_type_enum NOT NULL DEFAULT 'text',
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  content text,
  video_url text,
  helpful_count integer DEFAULT 0,
  verified_purchase boolean DEFAULT false,
  is_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_product_reviews_deal_id ON product_reviews(deal_id);
CREATE INDEX idx_product_reviews_user_id ON product_reviews(user_id);
CREATE INDEX idx_product_reviews_verified_purchase ON product_reviews(verified_purchase);

ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved reviews"
  ON product_reviews FOR SELECT
  TO authenticated
  USING (is_approved = true);

CREATE POLICY "Users can create own reviews"
  ON product_reviews FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own reviews"
  ON product_reviews FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Reality Check Photos (customer photos with votes)
CREATE TABLE IF NOT EXISTS reality_check_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  photo_url text NOT NULL,
  caption text,
  worth_it_votes integer DEFAULT 0,
  not_worth_it_votes integer DEFAULT 0,
  is_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_reality_check_photos_deal_id ON reality_check_photos(deal_id);
CREATE INDEX idx_reality_check_photos_user_id ON reality_check_photos(user_id);

ALTER TABLE reality_check_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved photos"
  ON reality_check_photos FOR SELECT
  TO authenticated
  USING (is_approved = true);

CREATE POLICY "Users can upload own photos"
  ON reality_check_photos FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- Photo Votes
CREATE TABLE IF NOT EXISTS reality_check_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid REFERENCES reality_check_photos(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_worth_it boolean NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(photo_id, user_id)
);

CREATE INDEX idx_reality_check_votes_photo_id ON reality_check_votes(photo_id);
CREATE INDEX idx_reality_check_votes_user_id ON reality_check_votes(user_id);

ALTER TABLE reality_check_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all votes"
  ON reality_check_votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create own votes"
  ON reality_check_votes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- Local Experiences (hotels, spas, tours, etc)
CREATE TABLE IF NOT EXISTS local_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL UNIQUE,
  experience_type text NOT NULL,
  location_city text NOT NULL,
  location_address text,
  partner_name text NOT NULL,
  duration text,
  capacity integer,
  valid_from date,
  valid_until date,
  is_seasonal boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_local_experiences_deal_id ON local_experiences(deal_id);
CREATE INDEX idx_local_experiences_location_city ON local_experiences(location_city);
CREATE INDEX idx_local_experiences_experience_type ON local_experiences(experience_type);

ALTER TABLE local_experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active experiences"
  ON local_experiences FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = local_experiences.deal_id
      AND deals.is_active = true
    )
  );

-- Discussion Groups
CREATE TABLE IF NOT EXISTS discussion_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text,
  member_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE discussion_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active groups"
  ON discussion_groups FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Group Members
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES discussion_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view group members"
  ON group_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can join groups"
  ON group_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can leave groups"
  ON group_members FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Referral Codes
CREATE TABLE IF NOT EXISTS referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL UNIQUE,
  uses_count integer DEFAULT 0,
  max_uses integer,
  reward_points integer DEFAULT 100,
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active codes"
  ON referral_codes FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can create own codes"
  ON referral_codes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- Referral Uses
CREATE TABLE IF NOT EXISTS referral_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id uuid REFERENCES referral_codes(id) ON DELETE CASCADE NOT NULL,
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referrer_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  points_awarded integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(referral_code_id, referred_user_id)
);

CREATE INDEX idx_referral_uses_referral_code_id ON referral_uses(referral_code_id);
CREATE INDEX idx_referral_uses_referred_user_id ON referral_uses(referred_user_id);
CREATE INDEX idx_referral_uses_referrer_user_id ON referral_uses(referrer_user_id);

ALTER TABLE referral_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals"
  ON referral_uses FOR SELECT
  TO authenticated
  USING (
    referrer_user_id = (select auth.uid()) OR
    referred_user_id = (select auth.uid())
  );

-- Group Purchases (team buying for price drops)
CREATE TABLE IF NOT EXISTS group_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  organizer_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_participants integer NOT NULL,
  current_participants integer DEFAULT 1,
  price_per_person numeric(10,2) NOT NULL,
  discount_percentage integer DEFAULT 0,
  status text DEFAULT 'active',
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_group_purchases_deal_id ON group_purchases(deal_id);
CREATE INDEX idx_group_purchases_organizer_user_id ON group_purchases(organizer_user_id);
CREATE INDEX idx_group_purchases_status ON group_purchases(status);

ALTER TABLE group_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active group purchases"
  ON group_purchases FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "Users can create group purchases"
  ON group_purchases FOR INSERT
  TO authenticated
  WITH CHECK (organizer_user_id = (select auth.uid()));

-- Group Purchase Participants
CREATE TABLE IF NOT EXISTS group_purchase_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_purchase_id uuid REFERENCES group_purchases(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_purchase_id, user_id)
);

CREATE INDEX idx_group_purchase_participants_group_purchase_id ON group_purchase_participants(group_purchase_id);
CREATE INDEX idx_group_purchase_participants_user_id ON group_purchase_participants(user_id);

ALTER TABLE group_purchase_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view participants"
  ON group_purchase_participants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can join group purchases"
  ON group_purchase_participants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- Seller Analytics
CREATE TABLE IF NOT EXISTS seller_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_deals integer DEFAULT 0,
  total_revenue numeric(12,2) DEFAULT 0,
  total_units_sold integer DEFAULT 0,
  average_rating numeric(3,2) DEFAULT 0,
  active_deals integer DEFAULT 0,
  period_start date NOT NULL,
  period_end date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(seller_user_id, period_start, period_end)
);

CREATE INDEX idx_seller_analytics_seller_user_id ON seller_analytics(seller_user_id);
CREATE INDEX idx_seller_analytics_period ON seller_analytics(period_start, period_end);

ALTER TABLE seller_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view own analytics"
  ON seller_analytics FOR SELECT
  TO authenticated
  USING (seller_user_id = (select auth.uid()));

-- Add deal_type column to existing deals table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'deal_type'
  ) THEN
    ALTER TABLE deals ADD COLUMN deal_type text DEFAULT 'regular';
  END IF;
END $$;

-- Add MSRP and market price for transparency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'msrp_price'
  ) THEN
    ALTER TABLE deals ADD COLUMN msrp_price numeric(10,2);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'market_price'
  ) THEN
    ALTER TABLE deals ADD COLUMN market_price numeric(10,2);
  END IF;
END $$;

-- Add role column to user_profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN role text DEFAULT 'user';
  END IF;
END $$;
