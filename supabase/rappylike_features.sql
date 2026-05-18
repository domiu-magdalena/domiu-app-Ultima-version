-- ============================================
-- DOMIU MAGDALENA - FEATURES RAPPY-LIKE
-- Chat, Valoraciones, Métodos de Pago, GPS Cliente
-- ============================================

-- 1. CALIFICACIONES
CREATE TABLE IF NOT EXISTS calificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES pedidos_cliente(id) ON DELETE CASCADE,
  pedido_interno_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('repartidor', 'negocio', 'producto')),
  repartidor_id UUID REFERENCES repartidores(id) ON DELETE SET NULL,
  negocio_id UUID REFERENCES negocios(id) ON DELETE SET NULL,
  producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
  cliente_telefono TEXT NOT NULL,
  puntuacion INTEGER NOT NULL CHECK (puntuacion >= 1 AND puntuacion <= 5),
  comentario TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE calificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Calificaciones insert any" ON calificaciones FOR INSERT WITH CHECK (true);
CREATE POLICY "Calificaciones select any" ON calificaciones FOR SELECT USING (true);

-- 2. CHAT EN TIEMPO REAL
CREATE TABLE IF NOT EXISTS mensajes_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_cliente_id UUID REFERENCES pedidos_cliente(id) ON DELETE CASCADE,
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  remitente_tipo TEXT NOT NULL CHECK (remitente_tipo IN ('cliente', 'repartidor', 'negocio', 'admin')),
  remitente_nombre TEXT NOT NULL,
  remitente_telefono TEXT,
  mensaje TEXT NOT NULL,
  leido BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mensajes_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat insert any" ON mensajes_chat FOR INSERT WITH CHECK (true);
CREATE POLICY "Chat select any" ON mensajes_chat FOR SELECT USING (true);
CREATE POLICY "Chat update own" ON mensajes_chat FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_mensajes_chat_pedido ON mensajes_chat(pedido_cliente_id, created_at);

-- 3. MÉTODOS DE PAGO
CREATE TABLE IF NOT EXISTS metodos_pago (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_telefono TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('efectivo', 'transferencia', 'tarjeta', 'nequi', 'daviplata')),
  titular TEXT,
  numero_referencia TEXT,
  banco TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE metodos_pago ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Metodos pago select own" ON metodos_pago FOR SELECT USING (true);
CREATE POLICY "Metodos pago insert own" ON metodos_pago FOR INSERT WITH CHECK (true);
CREATE POLICY "Metodos pago update own" ON metodos_pago FOR UPDATE USING (true);
CREATE POLICY "Metodos pago delete own" ON metodos_pago FOR DELETE USING (true);

-- 4. AGREGAR COLUMNAS DE PAGO A pedidos_cliente
ALTER TABLE pedidos_cliente ADD COLUMN IF NOT EXISTS metodo_pago TEXT DEFAULT 'efectivo';
ALTER TABLE pedidos_cliente ADD COLUMN IF NOT EXISTS metodo_pago_ref TEXT;
ALTER TABLE pedidos_cliente ADD COLUMN IF NOT EXISTS calificado_repartidor BOOLEAN DEFAULT false;
ALTER TABLE pedidos_cliente ADD COLUMN IF NOT EXISTS calificado_negocio BOOLEAN DEFAULT false;

-- 5. AGREGAR COLUMNAS DE PAGO A pedidos (sistema interno)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS metodo_pago TEXT DEFAULT 'Efectivo';

-- 6. TABLA DE PROMOCIONES
CREATE TABLE IF NOT EXISTS promociones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id UUID REFERENCES negocios(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  tipo_descuento TEXT NOT NULL CHECK (tipo_descuento IN ('porcentaje', 'fijo')),
  valor_descuento INTEGER NOT NULL,
  valor_minimo_pedido INTEGER DEFAULT 0,
  codigo TEXT,
  activo BOOLEAN DEFAULT true,
  fecha_inicio TIMESTAMPTZ,
  fecha_fin TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE promociones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Promociones select any" ON promociones FOR SELECT USING (true);
CREATE POLICY "Promociones admin all" ON promociones FOR ALL USING (true);

-- 7. TABLA DE FAVORITOS (clientes)
CREATE TABLE IF NOT EXISTS favoritos_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_telefono TEXT NOT NULL,
  negocio_id UUID REFERENCES negocios(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cliente_telefono, negocio_id)
);

ALTER TABLE favoritos_cliente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Favoritos select own" ON favoritos_cliente FOR SELECT USING (true);
CREATE POLICY "Favoritos insert own" ON favoritos_cliente FOR INSERT WITH CHECK (true);
CREATE POLICY "Favoritos delete own" ON favoritos_cliente FOR DELETE USING (true);

-- 8. FUNCIÓN: Calcular rating promedio de un negocio
CREATE OR REPLACE FUNCTION calcular_rating_negocio(p_negocio_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  avg_rating NUMERIC;
BEGIN
  SELECT ROUND(COALESCE(AVG(puntuacion), 0), 1) INTO avg_rating
  FROM calificaciones
  WHERE negocio_id = p_negocio_id AND tipo = 'negocio';
  RETURN avg_rating;
END;
$$ LANGUAGE plpgsql;

-- 9. FUNCIÓN: Calcular rating promedio de un repartidor
CREATE OR REPLACE FUNCTION calcular_rating_repartidor(p_repartidor_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  avg_rating NUMERIC;
BEGIN
  SELECT ROUND(COALESCE(AVG(puntuacion), 0), 1) INTO avg_rating
  FROM calificaciones
  WHERE repartidor_id = p_repartidor_id AND tipo = 'repartidor';
  RETURN avg_rating;
END;
$$ LANGUAGE plpgsql;
