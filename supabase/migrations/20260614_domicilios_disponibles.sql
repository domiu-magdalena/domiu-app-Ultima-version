-- InDriver-style: domicilios disponibles para que repartidores los acepten
CREATE TABLE IF NOT EXISTS domicilios_disponibles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_cliente_id UUID REFERENCES pedidos_cliente(id) ON DELETE CASCADE,
  negocio_id UUID REFERENCES negocios(id) ON DELETE CASCADE,
  direccion_origen TEXT NOT NULL,
  direccion_destino TEXT NOT NULL,
  valor_domicilio NUMERIC NOT NULL DEFAULT 0,
  distancia_km NUMERIC DEFAULT 0,
  origen_lat NUMERIC,
  origen_lng NUMERIC,
  destino_lat NUMERIC,
  destino_lng NUMERIC,
  estado TEXT NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible','aceptado','completado','cancelado')),
  repartidor_id UUID REFERENCES repartidores(id),
  cliente_nombre TEXT,
  cliente_telefono TEXT,
  negocio_nombre TEXT,
  pedido_codigo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  aceptado_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_domi_disponibles_estado ON domicilios_disponibles(estado, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_domi_disponibles_repartidor ON domicilios_disponibles(repartidor_id) WHERE repartidor_id IS NOT NULL;
