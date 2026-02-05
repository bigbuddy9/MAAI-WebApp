-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- 1. Subscriptions table — stores Stripe subscription data
CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'none',
  price_id TEXT,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

-- 2. Whitelist table — friends/family who get free access
CREATE TABLE IF NOT EXISTS subscription_whitelist (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whitelist_user_id ON subscription_whitelist(user_id);
CREATE INDEX IF NOT EXISTS idx_whitelist_email ON subscription_whitelist(email);

-- 3. RLS policies — allow users to read their own subscription
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_whitelist ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can read their own whitelist entry
CREATE POLICY "Users can read own whitelist"
  ON subscription_whitelist FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (webhook) can do everything — no RLS restriction
-- (The anon key used in webhooks will need these insert/update policies)
CREATE POLICY "Service can manage subscriptions"
  ON subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service can manage whitelist"
  ON subscription_whitelist FOR ALL
  USING (true)
  WITH CHECK (true);
