CREATE TABLE IF NOT EXISTS push_subscriptions (
  repartidor_id UUID PRIMARY KEY REFERENCES repartidores(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  auth_key TEXT NOT NULL DEFAULT '',
  p256dh_key TEXT NOT NULL DEFAULT '',
  subscription_json TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public insert" ON push_subscriptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "public update" ON push_subscriptions FOR UPDATE
  USING (true);

CREATE POLICY "public read" ON push_subscriptions FOR SELECT
  USING (true);

CREATE POLICY "public delete" ON push_subscriptions FOR DELETE
  USING (true);
