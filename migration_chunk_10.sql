-- =====================================================

-- Create email_preferences table
CREATE TABLE IF NOT EXISTS email_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  email text NOT NULL,
  marketing_emails boolean DEFAULT false NOT NULL,
  transactional_emails boolean DEFAULT true NOT NULL,
  deal_notifications boolean DEFAULT true NOT NULL,
  loyalty_notifications boolean DEFAULT true NOT NULL,
  order_updates boolean DEFAULT true NOT NULL,
  newsletter_subscribed boolean DEFAULT false NOT NULL,
  brevo_contact_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own email preferences"
  ON email_preferences FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own email preferences"
  ON email_preferences FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  email text NOT NULL,
  email_type text NOT NULL CHECK (email_type IN (
    'order_confirmation',
    'order_shipped',
    'order_delivered',
    'welcome',
    'password_reset',
    'loyalty_earned',
    'loyalty_redeemed',
    'loyalty_tier_upgrade',
    'deal_alert',
    'newsletter',
    'abandoned_cart'
  )),
  subject text NOT NULL,
  template_id text,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'delivered', 'opened', 'clicked', 'bounced')),
  brevo_message_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  error_message text,
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own email logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Create newsletter_subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users,
  subscribed boolean DEFAULT true NOT NULL,
  brevo_contact_id text,
  source text DEFAULT 'website',
  subscribed_at timestamptz DEFAULT now(),
  unsubscribed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe to newsletter"
  ON newsletter_subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read own newsletter subscription"
  ON newsletter_subscribers FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id OR email IN (
    SELECT email FROM auth.users WHERE id = (select auth.uid())
  ));

CREATE POLICY "Users can update own newsletter subscription"
  ON newsletter_subscribers FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id OR email IN (
    SELECT email FROM auth.users WHERE id = (select auth.uid())
  ))
  WITH CHECK ((select auth.uid()) = user_id OR email IN (
    SELECT email FROM auth.users WHERE id = (select auth.uid())
  ));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_preferences_user_id ON email_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_subscribed ON newsletter_subscribers(subscribed);

-- Function to create email preferences for new users
CREATE OR REPLACE FUNCTION create_email_preferences_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.email_preferences (
    user_id,
    email,
    marketing_emails,
    transactional_emails,
    deal_notifications,
    loyalty_notifications,
    order_updates,
    newsletter_subscribed
  )
  VALUES (
    NEW.id,
    NEW.email,
    false,
    true,
    true,
    true,
    true,
    false
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger for email preferences
DROP TRIGGER IF EXISTS on_auth_user_created_email_prefs ON auth.users;
CREATE TRIGGER on_auth_user_created_email_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_email_preferences_for_new_user();

-- Create email preferences for existing users
INSERT INTO email_preferences (user_id, email, marketing_emails, transactional_emails, deal_notifications, loyalty_notifications, order_updates, newsletter_subscribed)
SELECT
  id,
  email,
  false,
  true,
  true,
  true,
  true,
  false
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;


