-- Super-App Cliente: nuevas columnas y tablas
ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT -1;
ALTER TABLE pedidos_cliente ADD COLUMN IF NOT EXISTS propina NUMERIC(10,2) DEFAULT 0;
ALTER TABLE pedidos_cliente ADD COLUMN IF NOT EXISTS tarifa_servicio NUMERIC(10,2) DEFAULT 1000;
ALTER TABLE pedidos_cliente ADD COLUMN IF NOT EXISTS distancia_km NUMERIC(5,1) DEFAULT 0;
ALTER TABLE pedidos_cliente ADD COLUMN IF NOT EXISTS estado_cliente TEXT DEFAULT 'recibido';
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS cobertura_km NUMERIC(4,1) DEFAULT 10;
CREATE TABLE IF NOT EXISTS direcciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL DEFAULT 'Casa',
  direccion TEXT NOT NULL,
  barrio TEXT DEFAULT '',
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  principal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE direcciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "direcciones_select" ON direcciones;
CREATE POLICY "direcciones_select" ON direcciones FOR SELECT USING (true);
DROP POLICY IF EXISTS "direcciones_insert" ON direcciones;
CREATE POLICY "direcciones_insert" ON direcciones FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "direcciones_update" ON direcciones;
CREATE POLICY "direcciones_update" ON direcciones FOR UPDATE USING (true);
DROP POLICY IF EXISTS "direcciones_delete" ON direcciones;
CREATE POLICY "direcciones_delete" ON direcciones FOR DELETE USING (true);
