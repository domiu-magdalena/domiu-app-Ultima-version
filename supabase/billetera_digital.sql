-- ============================================
-- DOMIU MAGDALENA - BILLETERA DIGITAL (DomiPay)
-- ============================================

CREATE TABLE IF NOT EXISTS billeteras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_telefono TEXT NOT NULL UNIQUE,
  cliente_nombre TEXT DEFAULT '',
  saldo NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (saldo >= 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS movimientos_billetera (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billetera_id UUID NOT NULL REFERENCES billeteras(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('deposito', 'pago', 'cashback', 'retiro')),
  monto NUMERIC(10,2) NOT NULL,
  saldo_anterior NUMERIC(10,2) NOT NULL DEFAULT 0,
  saldo_nuevo NUMERIC(10,2) NOT NULL DEFAULT 0,
  referencia TEXT DEFAULT '',
  pedido_codigo TEXT,
  comprobante_url TEXT DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmado', 'rechazado')),
  creado_por TEXT DEFAULT 'cliente',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE billeteras ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_billetera ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billeteras_select_own" ON billeteras;
CREATE POLICY "billeteras_select_own" ON billeteras FOR SELECT USING (true);

DROP POLICY IF EXISTS "billeteras_insert_own" ON billeteras;
CREATE POLICY "billeteras_insert_own" ON billeteras FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "billeteras_update_own" ON billeteras;
CREATE POLICY "billeteras_update_own" ON billeteras FOR UPDATE USING (true);

DROP POLICY IF EXISTS "movimientos_select_own" ON movimientos_billetera;
CREATE POLICY "movimientos_select_own" ON movimientos_billetera FOR SELECT USING (true);

DROP POLICY IF EXISTS "movimientos_insert_own" ON movimientos_billetera;
CREATE POLICY "movimientos_insert_own" ON movimientos_billetera FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "movimientos_update_own" ON movimientos_billetera;
CREATE POLICY "movimientos_update_own" ON movimientos_billetera FOR UPDATE USING (true);
