-- ============================================
-- DOMIU MAGDALENA → RAPPI
-- SQL COMPLETO: Ejecutar 1 vez en SQL Editor
-- ============================================

-- ========================
-- 1. TABLAS RAPPY-LIKE
-- ========================

-- CALIFICACIONES
CREATE TABLE IF NOT EXISTS calificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('repartidor', 'negocio', 'producto')),
  destino_id UUID,
  cliente_telefono TEXT,
  puntuacion INTEGER NOT NULL CHECK (puntuacion >= 1 AND puntuacion <= 5),
  comentario TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CHAT
CREATE TABLE IF NOT EXISTS mensajes_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  remitente_tipo TEXT NOT NULL CHECK (remitente_tipo IN ('cliente', 'repartidor', 'negocio', 'admin')),
  remitente_nombre TEXT,
  mensaje TEXT NOT NULL,
  leido BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mensajes_chat_pedido ON mensajes_chat(pedido_id, created_at);

-- MÉTODOS DE PAGO
CREATE TABLE IF NOT EXISTS metodos_pago (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_telefono TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('efectivo', 'transferencia', 'nequi', 'daviplata')),
  alias TEXT,
  numero_referencia TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROMOCIONES
CREATE TABLE IF NOT EXISTS promociones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  descripcion TEXT,
  tipo_descuento TEXT NOT NULL CHECK (tipo_descuento IN ('porcentaje', 'fijo')),
  valor INTEGER NOT NULL,
  minimo_compra INTEGER DEFAULT 0,
  usos_limite INTEGER DEFAULT 0,
  usos_actuales INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  vence_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FAVORITOS
CREATE TABLE IF NOT EXISTS favoritos_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_telefono TEXT NOT NULL,
  negocio_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cliente_telefono, negocio_id)
);

-- NOTIFICACIONES
CREATE TABLE IF NOT EXISTS notificaciones_push (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID,
  titulo TEXT NOT NULL,
  cuerpo TEXT,
  tipo TEXT DEFAULT 'info',
  referencia_id TEXT,
  leida BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HISTORIAL PAGOS
CREATE TABLE IF NOT EXISTS historial_pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES pedidos(id),
  metodo TEXT NOT NULL,
  monto INTEGER NOT NULL,
  estado TEXT DEFAULT 'completado',
  referencia TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- 2. COLUMNAS FALTANTES
-- ========================

ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS metodo_pago TEXT DEFAULT 'Efectivo';
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS calificado BOOLEAN DEFAULT false;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS notificado_cliente BOOLEAN DEFAULT false;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS notificado_negocio BOOLEAN DEFAULT false;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS notificado_repartidor BOOLEAN DEFAULT false;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS tiempo_estimado INTEGER DEFAULT 30;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE repartidores ADD COLUMN IF NOT EXISTS documento TEXT;
ALTER TABLE repartidores ADD COLUMN IF NOT EXISTS vehiculo_tipo TEXT;
ALTER TABLE repartidores ADD COLUMN IF NOT EXISTS total_viajes INTEGER DEFAULT 0;
ALTER TABLE repartidores ADD COLUMN IF NOT EXISTS calificacion_promedio NUMERIC DEFAULT 0;
ALTER TABLE repartidores ADD COLUMN IF NOT EXISTS ultima_ubicacion_at TIMESTAMPTZ;

ALTER TABLE negocios ADD COLUMN IF NOT EXISTS calificacion NUMERIC DEFAULT 0;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS total_pedidos INTEGER DEFAULT 0;

-- ========================
-- 3. RLS POLICIES
-- ========================

ALTER TABLE calificaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Calificaciones all" ON calificaciones;
CREATE POLICY "Calificaciones all" ON calificaciones USING (true) WITH CHECK (true);

ALTER TABLE mensajes_chat ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chat all" ON mensajes_chat;
CREATE POLICY "Chat all" ON mensajes_chat USING (true) WITH CHECK (true);

ALTER TABLE metodos_pago ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Metodos all" ON metodos_pago;
CREATE POLICY "Metodos all" ON metodos_pago USING (true) WITH CHECK (true);

ALTER TABLE promociones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Promociones all" ON promociones;
CREATE POLICY "Promociones all" ON promociones USING (true) WITH CHECK (true);

ALTER TABLE favoritos_cliente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Favoritos all" ON favoritos_cliente;
CREATE POLICY "Favoritos all" ON favoritos_cliente USING (true) WITH CHECK (true);

ALTER TABLE notificaciones_push ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Notificaciones all" ON notificaciones_push;
CREATE POLICY "Notificaciones all" ON notificaciones_push USING (true) WITH CHECK (true);

ALTER TABLE historial_pagos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Pagos all" ON historial_pagos;
CREATE POLICY "Pagos all" ON historial_pagos USING (true) WITH CHECK (true);

-- ========================
-- 4. FUNCIONES RATING
-- ========================

CREATE OR REPLACE FUNCTION calcular_rating_negocio(p_negocio_id UUID)
RETURNS NUMERIC AS $$
  SELECT ROUND(COALESCE(AVG(puntuacion), 0), 1)
  FROM calificaciones WHERE destino_id = p_negocio_id AND tipo = 'negocio';
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION calcular_rating_repartidor(p_repartidor_id UUID)
RETURNS NUMERIC AS $$
  SELECT ROUND(COALESCE(AVG(puntuacion), 0), 1)
  FROM calificaciones WHERE destino_id = p_repartidor_id AND tipo = 'repartidor';
$$ LANGUAGE sql;

-- ========================
-- 5. AUTO-ASIGNAR REPARTIDOR
-- ========================

CREATE OR REPLACE FUNCTION asignar_repartidor_cercano(p_pedido_id UUID, p_latitud DECIMAL, p_longitud DECIMAL)
RETURNS UUID AS $$
DECLARE
  v_repartidor_id UUID;
BEGIN
  SELECT id INTO v_repartidor_id FROM repartidores
  WHERE activo = true AND estado = 'Disponible'
  ORDER BY (
    COALESCE(latitud, 11.235) - p_latitud
  ) ^ 2 + (
    COALESCE(longitud, -74.205) - p_longitud
  ) ^ 2 ASC
  LIMIT 1;
  
  IF v_repartidor_id IS NOT NULL THEN
    UPDATE pedidos SET repartidor_id = v_repartidor_id, estado = 'Aceptado' WHERE id = p_pedido_id;
    UPDATE repartidores SET estado = 'Ocupado' WHERE id = v_repartidor_id;
  END IF;
  
  RETURN v_repartidor_id;
END;
$$ LANGUAGE plpgsql;

-- ========================
-- 6. NOTIFICACIONES TRIGGER
-- ========================

CREATE OR REPLACE FUNCTION crear_notificacion_cambio_estado()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    INSERT INTO pedido_estado_history (pedido_id, estado_anterior, estado_nuevo)
    VALUES (NEW.id, OLD.estado, NEW.estado);
    
    INSERT INTO notificaciones_push (usuario_id, titulo, cuerpo, tipo, referencia_id)
    VALUES (
      NEW.user_id,
      'Pedido ' || NEW.codigo || ' - ' || NEW.estado,
      'Tu pedido de ' || NEW.cliente || ' ahora está: ' || NEW.estado,
      'estado_pedido',
      NEW.id::TEXT
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notificar_cambio_estado ON pedidos;
CREATE TRIGGER notificar_cambio_estado
  AFTER UPDATE OF estado ON pedidos
  FOR EACH ROW EXECUTE FUNCTION crear_notificacion_cambio_estado();

-- ========================
-- 7. REALTIME (habilitar para chat y ubicaciones)
-- ========================

-- Nota: Esto se hace en la UI de Supabase > Database > Replication
-- Marcar las tablas: mensajes_chat, ubicaciones_repartidores, notificaciones_push

-- ========================
-- 8. SINCRO DATOS EXISTENTES
-- ========================

UPDATE pedidos SET total = precio WHERE total IS NULL AND precio > 0;
UPDATE pedidos SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE repartidores SET total_viajes = (SELECT COUNT(*) FROM pedidos WHERE repartidor_id = repartidores.id AND estado = 'Entregado');
UPDATE repartidores SET vehiculo_tipo = vehiculo WHERE vehiculo_tipo IS NULL AND vehiculo IS NOT NULL;
UPDATE negocios SET total_pedidos = (SELECT COUNT(*) FROM pedidos_cliente WHERE negocio_id = negocios.id);

-- ========================
-- 9. VERIFICACIÓN
-- ========================

SELECT '✅ calificaciones' as tabla, COUNT(*) FROM calificaciones
UNION ALL SELECT '✅ mensajes_chat', COUNT(*) FROM mensajes_chat
UNION ALL SELECT '✅ metodos_pago', COUNT(*) FROM metodos_pago
UNION ALL SELECT '✅ promociones', COUNT(*) FROM promociones
UNION ALL SELECT '✅ favoritos_cliente', COUNT(*) FROM favoritos_cliente
UNION ALL SELECT '✅ notificaciones_push', COUNT(*) FROM notificaciones_push
UNION ALL SELECT '✅ historial_pagos', COUNT(*) FROM historial_pagos;
