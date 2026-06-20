-- Migration: 20250620_customer_favorites_payment_methods
-- Description: Customer favorites and saved payment methods for Módulo 6: Cliente Premium

-- ============================================================
-- CUSTOMER FAVORITES
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT chk_favorites_target CHECK (
    (business_id IS NOT NULL AND product_id IS NULL) OR
    (business_id IS NULL AND product_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_favorites_business
  ON customer_favorites(user_id, business_id)
  WHERE business_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_favorites_product
  ON customer_favorites(user_id, product_id)
  WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customer_favorites_user
  ON customer_favorites(user_id);

-- ============================================================
-- CUSTOMER PAYMENT METHODS
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('credit_card', 'debit_card', 'nequi', 'daviplata', 'pse', 'cash')),
  brand VARCHAR(50),
  last_four VARCHAR(4),
  holder_name VARCHAR(200),
  expires_at VARCHAR(7),
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_payment_methods_user
  ON customer_payment_methods(user_id);

-- Only one default per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_payment_methods_default
  ON customer_payment_methods(user_id)
  WHERE is_default = true;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE customer_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payment_methods ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Users manage own favorites" ON customer_favorites;
DROP POLICY IF EXISTS "Users read own favorites" ON customer_favorites;
DROP POLICY IF EXISTS "Users insert own favorites" ON customer_favorites;
DROP POLICY IF EXISTS "Users delete own favorites" ON customer_favorites;

DROP POLICY IF EXISTS "Users manage own payment methods" ON customer_payment_methods;
DROP POLICY IF EXISTS "Users read own payment methods" ON customer_payment_methods;
DROP POLICY IF EXISTS "Users insert own payment methods" ON customer_payment_methods;
DROP POLICY IF EXISTS "Users update own payment methods" ON customer_payment_methods;
DROP POLICY IF EXISTS "Users delete own payment methods" ON customer_payment_methods;

-- Customer favorites policies
CREATE POLICY "Users read own favorites" ON customer_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own favorites" ON customer_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own favorites" ON customer_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- Payment methods policies
CREATE POLICY "Users read own payment methods" ON customer_payment_methods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own payment methods" ON customer_payment_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own payment methods" ON customer_payment_methods
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own payment methods" ON customer_payment_methods
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- LOYALTY BALANCE RPC
-- ============================================================
CREATE OR REPLACE FUNCTION get_loyalty_balance(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT COALESCE(SUM(points), 0) INTO v_balance
  FROM loyalty_points
  WHERE user_id = p_user_id;
  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
