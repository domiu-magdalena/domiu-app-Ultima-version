-- ============================================================
-- DOMIU MAGDALENA - SQL COMPLETO DEFINITIVO
-- Ejecutar TODO en 1 sola vez en Supabase SQL Editor
-- Crea todas las tablas, corrige FKs, RLS, datos de ejemplo
-- ============================================================

-- ============================================================
-- 1. TABLAS DEL SISTEMA ORIGINAL (Admin, Repartidor, Turnos)
-- ============================================================

-- Perfiles de usuario (FK directo a auth.users, NO profiles)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nombre TEXT,
  telefono TEXT,
  rol TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Repartidores
CREATE TABLE IF NOT EXISTS repartidores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  telefono TEXT,
  estado TEXT DEFAULT 'No disponible',
  vehiculo TEXT,
  placa TEXT,
  documento TEXT,
  foto_url TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Locales (para sistema original de domicilios)
CREATE TABLE IF NOT EXISTS locales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  direccion TEXT,
  telefono TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turnos (sistema de turnos del admin)
CREATE TABLE IF NOT EXISTS turnos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  activo BOOLEAN DEFAULT true,
  total_turno INTEGER DEFAULT 0,
  entregados INTEGER DEFAULT 0,
  cancelados INTEGER DEFAULT 0,
  recaudado_total NUMERIC(10,2) DEFAULT 0,
  empresa_recibe_total NUMERIC(10,2) DEFAULT 0,
  liquidado_total INTEGER DEFAULT 0,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pedidos (sistema original de domicilios)
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  turno_id UUID REFERENCES turnos(id),
  codigo TEXT NOT NULL,
  cliente TEXT NOT NULL,
  telefono TEXT,
  direccion TEXT NOT NULL,
  barrio TEXT,
  notas TEXT,
  local_id UUID REFERENCES locales(id),
  repartidor_id UUID REFERENCES repartidores(id),
  km DECIMAL(5,2),
  precio INTEGER NOT NULL DEFAULT 0,
  pago_repartidor INTEGER DEFAULT 0,
  empresa_recibe INTEGER DEFAULT 0,
  metodo_pago TEXT DEFAULT 'Efectivo',
  estado TEXT DEFAULT 'Pendiente',
  liquidado BOOLEAN DEFAULT false,
  cancelado BOOLEAN DEFAULT false,
  cancelado_razon TEXT,
  cancelado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuracion de la app
CREATE TABLE IF NOT EXISTS app_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tarifa_base INTEGER DEFAULT 2500,
  costo_por_km INTEGER DEFAULT 1200,
  porcentaje_repartidor INTEGER DEFAULT 55,
  whatsapp_number TEXT DEFAULT '',
  company_name TEXT DEFAULT 'DomiU Magdalena',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historial de direcciones
CREATE TABLE IF NOT EXISTS address_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente TEXT NOT NULL,
  direccion TEXT NOT NULL,
  barrio TEXT,
  km DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historial de estados (auditoria)
CREATE TABLE IF NOT EXISTS pedido_estado_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  estado_anterior TEXT,
  estado_nuevo TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. TABLAS DEL MARKETPLACE (Negocios, Productos, Pedidos)
-- ============================================================

CREATE TABLE IF NOT EXISTS negocios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('Restaurantes','Tiendas','Licoreras','Droguerias','Promociones')),
  descripcion TEXT DEFAULT '',
  logo TEXT DEFAULT '',
  banner TEXT DEFAULT '',
  direccion TEXT DEFAULT '',
  telefono TEXT DEFAULT '',
  horario TEXT DEFAULT 'Lun-Dom 8:00-22:00',
  rating NUMERIC(2,1) DEFAULT 4.5 CHECK (rating >= 0 AND rating <= 5),
  tiempo_estimado TEXT DEFAULT '30-45 min',
  domicilio_cost NUMERIC(10,2) DEFAULT 3000,
  abierto BOOLEAN DEFAULT true,
  destacado BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  precio NUMERIC(10,2) NOT NULL CHECK (precio > 0),
  imagen TEXT DEFAULT '',
  imagen_url TEXT DEFAULT '',
  categoria_producto TEXT DEFAULT 'General',
  disponible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pedidos_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 8)),
  cliente_nombre TEXT NOT NULL,
  cliente_telefono TEXT NOT NULL,
  cliente_direccion TEXT NOT NULL,
  cliente_barrio TEXT DEFAULT '',
  nota TEXT DEFAULT '',
  negocio_id UUID NOT NULL REFERENCES negocios(id),
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  domicilio NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'recibido',
  estado_negocio TEXT DEFAULT 'recibido'
    CHECK (estado_negocio IN ('recibido','en_preparacion','listo_para_recoger')),
  estado_admin TEXT DEFAULT 'recibido'
    CHECK (estado_admin IN ('recibido','en_preparacion','listo_para_recoger','asignado','en_camino','entregado','cancelado')),
  repartidor_id UUID REFERENCES repartidores(id) ON DELETE SET NULL,
  costo_envio NUMERIC(10,2) DEFAULT 0,
  comision_empresa NUMERIC(10,2) DEFAULT 0,
  pago_repartidor NUMERIC(10,2) DEFAULT 0,
  ganancia_empresa NUMERIC(10,2) DEFAULT 0,
  recogido_en TIMESTAMPTZ,
  entregado_en TIMESTAMPTZ,
  actualizado_en TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CHECK de estado: incluye TODOS los estados del flujo completo
ALTER TABLE pedidos_cliente DROP CONSTRAINT IF EXISTS pedidos_cliente_estado_check;
ALTER TABLE pedidos_cliente ADD CONSTRAINT pedidos_cliente_estado_check
  CHECK (estado IN ('recibido','preparacion','en_preparacion','listo_para_recoger','asignado','recogido','camino','en_camino','entregado','cancelado'));

CREATE TABLE IF NOT EXISTS detalle_pedido_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos_cliente(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(id),
  producto_nombre TEXT NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS ubicaciones_repartidores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repartidor_id UUID NOT NULL REFERENCES repartidores(id) ON DELETE CASCADE,
  nombre_repartidor TEXT,
  latitud DOUBLE PRECISION NOT NULL,
  longitud DOUBLE PRECISION NOT NULL,
  estado TEXT DEFAULT 'disponible',
  ultima_actualizacion TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. RLS POLICIES (TODAS LAS TABLAS)
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE repartidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE locales ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE address_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_estado_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE negocios ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_pedido_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE ubicaciones_repartidores ENABLE ROW LEVEL SECURITY;

-- PROFILES
DROP POLICY IF EXISTS "Profiles select own" ON profiles;
CREATE POLICY "Profiles select own" ON profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Own profile update" ON profiles;
CREATE POLICY "Own profile update" ON profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Profiles insert" ON profiles;
CREATE POLICY "Profiles insert" ON profiles FOR INSERT WITH CHECK (true);

-- REPARTIDORES
DROP POLICY IF EXISTS "Repartidores select any" ON repartidores;
CREATE POLICY "Repartidores select any" ON repartidores FOR SELECT USING (true);
DROP POLICY IF EXISTS "Repartidor update own" ON repartidores;
CREATE POLICY "Repartidor update own" ON repartidores FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Repartidor delete own" ON repartidores;
CREATE POLICY "Repartidor delete own" ON repartidores FOR DELETE USING (auth.uid() = user_id);

-- LOCALES
DROP POLICY IF EXISTS "Locales select any" ON locales;
CREATE POLICY "Locales select any" ON locales FOR SELECT USING (true);
DROP POLICY IF EXISTS "Own locales all" ON locales;
CREATE POLICY "Own locales all" ON locales FOR ALL USING (auth.uid() = user_id);

-- PEDIDOS (sistema original)
DROP POLICY IF EXISTS "Pedidos admin all" ON pedidos;
CREATE POLICY "Pedidos admin all" ON pedidos FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Pedidos rider select" ON pedidos;
CREATE POLICY "Pedidos rider select" ON pedidos FOR SELECT USING (
  repartidor_id IN (SELECT id FROM repartidores WHERE user_id = auth.uid())
);
DROP POLICY IF EXISTS "Pedidos rider update" ON pedidos;
CREATE POLICY "Pedidos rider update" ON pedidos FOR UPDATE USING (
  repartidor_id IN (SELECT id FROM repartidores WHERE user_id = auth.uid())
);
DROP POLICY IF EXISTS "Pedidos rider delete" ON pedidos;
CREATE POLICY "Pedidos rider delete" ON pedidos FOR DELETE USING (
  repartidor_id IN (SELECT id FROM repartidores WHERE user_id = auth.uid())
);

-- TURNOS
DROP POLICY IF EXISTS "Turnos select any" ON turnos;
CREATE POLICY "Turnos select any" ON turnos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Own turnos all" ON turnos;
CREATE POLICY "Own turnos all" ON turnos FOR ALL USING (auth.uid() = user_id);

-- APP_CONFIG
DROP POLICY IF EXISTS "Own config all" ON app_config;
CREATE POLICY "Own config all" ON app_config FOR ALL USING (auth.uid() = user_id);

-- ADDRESS_HISTORY
DROP POLICY IF EXISTS "Own address all" ON address_history;
CREATE POLICY "Own address all" ON address_history FOR ALL USING (auth.uid() = user_id);

-- PEDIDO_ESTADO_HISTORY
DROP POLICY IF EXISTS "Estado history select" ON pedido_estado_history;
CREATE POLICY "Estado history select" ON pedido_estado_history FOR SELECT USING (true);

-- NEGOCIOS (marketplace)
DROP POLICY IF EXISTS "negocios_select_public" ON negocios;
CREATE POLICY "negocios_select_public" ON negocios FOR SELECT USING (true);
DROP POLICY IF EXISTS "negocios_insert_public" ON negocios;
CREATE POLICY "negocios_insert_public" ON negocios FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "negocios_update_public" ON negocios;
CREATE POLICY "negocios_update_public" ON negocios FOR UPDATE USING (true);

-- PRODUCTOS (marketplace)
DROP POLICY IF EXISTS "productos_select_public" ON productos;
CREATE POLICY "productos_select_public" ON productos FOR SELECT USING (true);
DROP POLICY IF EXISTS "productos_insert_public" ON productos;
CREATE POLICY "productos_insert_public" ON productos FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "productos_update_public" ON productos;
CREATE POLICY "productos_update_public" ON productos FOR UPDATE USING (true);
DROP POLICY IF EXISTS "productos_delete_public" ON productos;
CREATE POLICY "productos_delete_public" ON productos FOR DELETE USING (true);

-- PEDIDOS_CLIENTE (marketplace)
DROP POLICY IF EXISTS "pedidos_cliente_insert" ON pedidos_cliente;
CREATE POLICY "pedidos_cliente_insert" ON pedidos_cliente FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "pedidos_cliente_select" ON pedidos_cliente;
CREATE POLICY "pedidos_cliente_select" ON pedidos_cliente FOR SELECT USING (true);
DROP POLICY IF EXISTS "pedidos_cliente_update" ON pedidos_cliente;
CREATE POLICY "pedidos_cliente_update" ON pedidos_cliente FOR UPDATE USING (true);

-- DETALLE_PEDIDO_CLIENTE
DROP POLICY IF EXISTS "detalle_pedido_insert" ON detalle_pedido_cliente;
CREATE POLICY "detalle_pedido_insert" ON detalle_pedido_cliente FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "detalle_pedido_select" ON detalle_pedido_cliente;
CREATE POLICY "detalle_pedido_select" ON detalle_pedido_cliente FOR SELECT USING (true);

-- UBICACIONES_REPARTIDORES
DROP POLICY IF EXISTS "repartidor_insert_ubicacion" ON ubicaciones_repartidores;
CREATE POLICY "repartidor_insert_ubicacion" ON ubicaciones_repartidores FOR INSERT
  WITH CHECK (repartidor_id::text IN (SELECT id::text FROM repartidores WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "repartidor_update_ubicacion" ON ubicaciones_repartidores;
CREATE POLICY "repartidor_update_ubicacion" ON ubicaciones_repartidores FOR UPDATE
  USING (repartidor_id::text IN (SELECT id::text FROM repartidores WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "repartidor_select_ubicacion" ON ubicaciones_repartidores;
CREATE POLICY "repartidor_select_ubicacion" ON ubicaciones_repartidores FOR SELECT
  USING (repartidor_id::text IN (SELECT id::text FROM repartidores WHERE user_id = auth.uid()));

-- RLS especifica para rider en pedidos_cliente
DROP POLICY IF EXISTS "repartidor_select_pedidos" ON pedidos_cliente;
CREATE POLICY "repartidor_select_pedidos" ON pedidos_cliente FOR SELECT
  USING (repartidor_id::text IN (SELECT id::text FROM repartidores WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "repartidor_update_pedidos" ON pedidos_cliente;
CREATE POLICY "repartidor_update_pedidos" ON pedidos_cliente FOR UPDATE
  USING (repartidor_id::text IN (SELECT id::text FROM repartidores WHERE user_id = auth.uid()));

-- ============================================================
-- 4. TRIGGER: Crear perfil automaticamente al registrar usuario
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, nombre, rol)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'admin')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nombre = EXCLUDED.nombre,
    rol = EXCLUDED.rol;

  -- Si es repartidor, crear en tabla repartidores
  IF COALESCE(NEW.raw_user_meta_data->>'rol', 'admin') = 'repartidor' THEN
    INSERT INTO repartidores (user_id, nombre, telefono, documento, vehiculo, placa, estado)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
      COALESCE(NEW.raw_user_meta_data->>'telefono', ''),
      COALESCE(NEW.raw_user_meta_data->>'documento', ''),
      COALESCE(NEW.raw_user_meta_data->>'vehiculo', ''),
      COALESCE(NEW.raw_user_meta_data->>'placa', ''),
      'No disponible'
    );
  END IF;

  -- Config por defecto para admin
  IF COALESCE(NEW.raw_user_meta_data->>'rol', 'admin') = 'admin' THEN
    INSERT INTO app_config (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 5. TRIGGER: Historial de estados para pedidos (sistema original)
-- ============================================================

CREATE OR REPLACE FUNCTION track_pedido_estado()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    INSERT INTO pedido_estado_history (pedido_id, estado_anterior, estado_nuevo)
    VALUES (NEW.id, OLD.estado, NEW.estado);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pedido_estado_trigger ON pedidos;
CREATE TRIGGER pedido_estado_trigger
  AFTER UPDATE OF estado ON pedidos
  FOR EACH ROW EXECUTE FUNCTION track_pedido_estado();

-- ============================================================
-- 6. CREAR PERFILES FALTANTES PARA USUARIOS EXISTENTES
-- ============================================================

INSERT INTO profiles (id, email, nombre, rol)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'nombre', split_part(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'rol', 'admin')
FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 7. DATOS DE EJEMPLO DEL MARKETPLACE
-- ============================================================

INSERT INTO negocios (nombre, categoria, descripcion, logo, direccion, telefono, rating, tiempo_estimado, domicilio_cost, abierto, destacado) VALUES
('Pizzeria Napoli', 'Restaurantes', 'Las mejores pizzas artesanales de Magdalena, ingredientes frescos y masa madre.', '', 'Calle Real #123, Magdalena', '3001112233', 4.8, '25-35 min', 3500, true, true),
('Super Tienda Don Pepe', 'Tiendas', 'Todo lo que necesitas para tu hogar: abarrotes, limpieza, bebidas y mas.', '', 'Av. Central #456, Magdalena', '3001113344', 4.3, '20-30 min', 3000, true, true),
('Licores El Buen Gusto', 'Licoreras', 'Amplia seleccion de cervezas, vinos, licores y cocteles preparados.', '', 'Carrera 7 #789, Magdalena', '3001114455', 4.6, '30-40 min', 4000, true, false),
('Drogueria Salud Total', 'Droguerias', 'Medicamentos, productos de cuidado personal y primera necesidad.', '', 'Calle 12 #321, Magdalena', '3001115566', 4.7, '15-25 min', 2500, true, false),
('Sushi Master', 'Restaurantes', 'Sushi fresco, rolls especiales y comida japonesa tradicional.', '', 'Av. del Rio #654, Magdalena', '3001116677', 4.9, '35-50 min', 4500, true, true);

-- Productos Pizzeria Napoli
WITH neg AS (SELECT id FROM negocios WHERE nombre = 'Pizzeria Napoli' LIMIT 1)
INSERT INTO productos (negocio_id, nombre, descripcion, precio, imagen, categoria_producto) VALUES
((SELECT id FROM neg), 'Pizza Margherita', 'Mozzarella fresca, albahaca, salsa de tomate', 22000, '', 'Pizzas'),
((SELECT id FROM neg), 'Pizza Pepperoni', 'Pepperoni, mozzarella, salsa de tomate', 25000, '', 'Pizzas'),
((SELECT id FROM neg), 'Pizza Hawaiana', 'Pina, jamon, mozzarella, salsa de tomate', 24000, '', 'Pizzas'),
((SELECT id FROM neg), 'Pizza Vegetariana', 'Pimientos, cebolla, champiñones, aceitunas', 23000, '', 'Pizzas'),
((SELECT id FROM neg), 'Coca-Cola 1.5L', 'Gaseosa Coca-Cola personal', 5000, '', 'Bebidas');

-- Productos Super Tienda Don Pepe
WITH neg AS (SELECT id FROM negocios WHERE nombre = 'Super Tienda Don Pepe' LIMIT 1)
INSERT INTO productos (negocio_id, nombre, descripcion, precio, imagen, categoria_producto) VALUES
((SELECT id FROM neg), 'Arroz Diana 1kg', 'Arroz blanco de alta calidad', 3500, '', 'Abarrotes'),
((SELECT id FROM neg), 'Aceite Vegetal 1L', 'Aceite vegetal para cocinar', 8500, '', 'Abarrotes'),
((SELECT id FROM neg), 'Leche Entera 1L', 'Leche entera pasteurizada', 4200, '', 'Lacteos'),
((SELECT id FROM neg), 'Pan Bimbo Grande', 'Pan de molde integral', 6800, '', 'Panaderia'),
((SELECT id FROM neg), 'Jabon para Ropa', 'Detergente en polvo 500g', 4500, '', 'Limpieza');

-- Productos Licores El Buen Gusto
WITH neg AS (SELECT id FROM negocios WHERE nombre = 'Licores El Buen Gusto' LIMIT 1)
INSERT INTO productos (negocio_id, nombre, descripcion, precio, imagen, categoria_producto) VALUES
((SELECT id FROM neg), 'Cerveza Aguila x6', 'Pack de 6 cervezas Aguila', 18000, '', 'Cervezas'),
((SELECT id FROM neg), 'Vino Tinto Casillero', 'Vino tinto Casillero del Diablo 750ml', 45000, '', 'Vinos'),
((SELECT id FROM neg), 'Ron Medellin Anejo', 'Ron Medellin Anejo 750ml', 55000, '', 'Licores'),
((SELECT id FROM neg), 'Coctel Margarita', 'Coctel Margarita preparado 500ml', 22000, '', 'Cocteles');

-- Productos Drogueria Salud Total
WITH neg AS (SELECT id FROM negocios WHERE nombre = 'Drogueria Salud Total' LIMIT 1)
INSERT INTO productos (negocio_id, nombre, descripcion, precio, imagen, categoria_producto) VALUES
((SELECT id FROM neg), 'Acetaminofen 500mg x10', 'Analgesico y antipiretico', 2500, '', 'Medicamentos'),
((SELECT id FROM neg), 'Ibuprofeno 400mg x10', 'Antiinflamatorio no esteroideo', 3500, '', 'Medicamentos'),
((SELECT id FROM neg), 'Curitas x20', 'Apósito adhesivo para heridas', 2000, '', 'Cuidado Personal'),
((SELECT id FROM neg), 'Alcohol Antiseptico 500ml', 'Alcohol etilico al 70%', 4500, '', 'Cuidado Personal');

-- Productos Sushi Master
WITH neg AS (SELECT id FROM negocios WHERE nombre = 'Sushi Master' LIMIT 1)
INSERT INTO productos (negocio_id, nombre, descripcion, precio, imagen, categoria_producto) VALUES
((SELECT id FROM neg), 'Roll Salmón Philadelphia', 'Sushi roll con salmon, queso crema y aguacate', 28000, '', 'Rolls'),
((SELECT id FROM neg), 'California Roll', 'Cangrejo, aguacate, pepino y masago', 24000, '', 'Rolls'),
((SELECT id FROM neg), 'Nigiri Mix x8', '8 piezas variadas de nigiri', 32000, '', 'Nigiri');

-- ============================================================
-- LISTO - Pasos manuales restantes:
-- ============================================================
-- 1. Supabase Dashboard → Database → Replication
--    Agrega "pedidos_cliente" y "ubicaciones_repartidores" a supabase_realtime
--
-- 2. Google Cloud Console → APIs & Services → Credentials
--    Edita la API Key de Maps, agrega:
--    https://domiu-app-ultima-version.vercel.app/*
--    https://*.vercel.app/*
