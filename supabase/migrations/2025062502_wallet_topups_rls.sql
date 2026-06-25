-- RLS policies for wallet_topups
-- The table already exists with RLS enabled but no policies

CREATE POLICY "Users can insert own wallet topups" ON wallet_topups
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM wallets WHERE id = wallet_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can view own wallet topups" ON wallet_topups
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM wallets WHERE id = wallet_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all wallet topups" ON wallet_topups
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
