-- ============================================
-- DOMIU MAGDALENA - RECONSTRUIR + SEED MASIVO
-- 1. Reconstruye tablas con esquema correcto
-- 2. 30 repartidores, 16 locales, 105 pedidos
-- 3. Ganancias empresa >= $1.526.000
-- ============================================
-- EJECUTAR EN SQL EDITOR DE SUPABASE (1 sola vez)
-- ============================================

-- ========================
-- PASO 1: RECONSTRUIR TABLAS
-- ========================

-- Eliminar tablas dependientes primero
DROP TABLE IF EXISTS pedido_estado_history CASCADE;
DROP TABLE IF EXISTS detalle_pedido_cliente CASCADE;
DROP TABLE IF EXISTS ubicaciones_repartidores CASCADE;
DROP TABLE IF EXISTS pedidos_cliente CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS turnos CASCADE;
DROP TABLE IF EXISTS locales CASCADE;
DROP TABLE IF EXISTS repartidores CASCADE;
DROP TABLE IF EXISTS address_history CASCADE;
DROP TABLE IF EXISTS app_config CASCADE;

-- Recrear locales (CON user_id)
CREATE TABLE IF NOT EXISTS locales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  nombre TEXT NOT NULL,
  direccion TEXT,
  telefono TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recrear repartidores
CREATE TABLE IF NOT EXISTS repartidores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
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

-- Recrear turnos
CREATE TABLE IF NOT EXISTS turnos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
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

-- Recrear pedidos (CON todas las columnas que usa la app)
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
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
  envio INTEGER DEFAULT 0,
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

-- Recrear historial
CREATE TABLE IF NOT EXISTS pedido_estado_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  estado_anterior TEXT,
  estado_nuevo TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recrear address_history
CREATE TABLE IF NOT EXISTS address_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  cliente TEXT NOT NULL,
  direccion TEXT NOT NULL,
  barrio TEXT,
  km DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recrear app_config
CREATE TABLE IF NOT EXISTS app_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  tarifa_base INTEGER DEFAULT 2500,
  costo_por_km INTEGER DEFAULT 1200,
  porcentaje_repartidor INTEGER DEFAULT 55,
  whatsapp_number TEXT DEFAULT '',
  company_name TEXT DEFAULT 'DomiU Magdalena',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- PASO 2: INSERTAR DATOS
-- ========================
DO $$
DECLARE
  admin_id UUID;
  turno_id UUID;
  locales_ids UUID[] := '{}';
  reps_ids UUID[] := '{}';
  rep_id UUID;
  local_id UUID;
  i INTEGER;
  rep_idx INTEGER;
  local_idx INTEGER;
  precio INTEGER;
  pago_rep INTEGER;
  empresa_recibe_val INTEGER;
  km_val DECIMAL(5,2);
  total_empresa NUMERIC := 0;
  total_recaudo NUMERIC := 0;
BEGIN
  -- Obtener admin
  SELECT id INTO admin_id FROM profiles WHERE rol = 'admin' LIMIT 1;
  IF admin_id IS NULL THEN
    SELECT id INTO admin_id FROM profiles ORDER BY created_at LIMIT 1;
  END IF;
  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'No hay profiles. Crea un usuario admin primero en /login';
  END IF;
  RAISE NOTICE 'Usando admin ID: %', admin_id;

  -- ====================
  -- LOCALES (16)
  -- ====================
  FOR i IN 1..16 LOOP
    INSERT INTO locales (user_id, nombre, direccion, telefono, activo) VALUES (
      admin_id,
      (ARRAY['El Buen Sabor','Pizzeria Roma','Comida Rapida Express','Restaurante Don Pepe',
             'El Rincon Criollo','Burger House','Sushi Master','La Casa del Pollo',
             'Arepa Gourmet','Marisqueria Del Mar','Heladeria Fria','Cafe Paris',
             'La Hamburgueseria','Tacos El Pastor','Parrilla Argentina','Wok Oriental'])[i],
      (ARRAY['Calle 22 #5-34 Centro','Cra 5 #12-89','Av Universidad #20-15','Calle 30 #10-45',
             'Cra 3 #8-67','Calle 18 #4-23','Av 19 #15-90','Cra 7 #25-12',
             'Calle 15 #6-78','Cra 4 #14-56','Calle 25 #9-34','Av Central #18-45',
             'Cra 8 #22-67','Calle 20 #3-89','Cra 6 #11-23','Calle 28 #7-56'])[i],
      '300' || LPAD((i + 100)::TEXT, 7, '0'),
      true
    ) RETURNING id INTO local_id;
    locales_ids := array_append(locales_ids, local_id);
  END LOOP;
  RAISE NOTICE 'Creados % locales', array_length(locales_ids, 1);

  -- ====================
  -- REPARTIDORES (30)
  -- ====================
  FOR i IN 1..30 LOOP
    INSERT INTO repartidores (user_id, nombre, telefono, estado, vehiculo, placa, documento, activo) VALUES (
      admin_id,
      (ARRAY['Carlos Jimenez','Andres Ruiz','Brayan Cortez','Camilo Torres','Daniel Moreno',
             'Esteban Gutierrez','Felipe Rojas','Gabriel Medina','Hector Paez','Ivan Castillo',
             'Javier Orozco','Kevin Vargas','Luis Navarro','Miguel Angel Paz','Nicolas Duarte',
             'Oscar Valencia','Pablo Cardenas','Ricardo Mora','Santiago Pino','Tomas Aguirre',
             'Valentino Suarez','William Campos','Xavier Rueda','Yeferson Largo','Zacarias Pinto',
             'Alejandro Marin','Bryan Carvajal','Cristian Moya','Diego Pardo','Eduardo Ferrer'])[i],
      '300' || LPAD((i + 1000)::TEXT, 7, '0'),
      CASE WHEN i % 5 = 0 THEN 'No disponible' WHEN i % 3 = 0 THEN 'Ocupado' ELSE 'Disponible' END,
      CASE WHEN i % 3 = 0 THEN 'Bicicleta' WHEN i = 6 THEN 'Carro' ELSE 'Moto' END,
      CASE WHEN i % 3 <> 0 AND i <> 6 THEN 'ABC-' || LPAD(i::TEXT, 3, '0') ELSE NULL END,
      'CC-' || (10000000 + i)::TEXT,
      true
    ) RETURNING id INTO rep_id;
    reps_ids := array_append(reps_ids, rep_id);
  END LOOP;
  RAISE NOTICE 'Creados % repartidores', array_length(reps_ids, 1);

  -- ====================
  -- TURNO ACTIVO
  -- ====================
  INSERT INTO turnos (user_id, activo, notas, opened_at)
  VALUES (admin_id, true, 'Turno prueba masiva', NOW() - INTERVAL '8 hours')
  RETURNING id INTO turno_id;
  RAISE NOTICE 'Turno creado';

  -- ====================
  -- 105 PEDIDOS
  -- ====================
  FOR i IN 1..105 LOOP
    -- Estado
    IF i <= 5 THEN           -- Pendientes
      rep_id := NULL;
    ELSIF i <= 13 THEN        -- Aceptados
      rep_id := reps_ids[((i-1) % 30) + 1];
    ELSIF i <= 21 THEN        -- Recogidos
      rep_id := reps_ids[((i-1) % 30) + 1];
    ELSIF i <= 29 THEN        -- En camino
      rep_id := reps_ids[((i-1) % 30) + 1];
    ELSIF i <= 94 THEN        -- Entregados (65)
      rep_id := reps_ids[((i-1) % 30) + 1];
    ELSIF i <= 100 THEN       -- Cancelados
      rep_id := NULL;
    ELSE                      -- Problema (5)
      rep_id := reps_ids[((i-1) % 30) + 1];
    END IF;

    local_idx := ((i - 1) % 16) + 1;
    local_id := locales_ids[local_idx];

    -- Precios variados para alcanzar meta
    precio := (ARRAY[25000,30000,18000,35000,22000,40000,28000,45000,32000,50000,
                     15000,38000,55000,20000,42000,48000,30000,25000,58000,35000,
                     27000,42000,33000,38000,45000,28000,52000,60000,35000,22000,
                     18000,25000,40000,30000,48000,15000,55000,32000,42000,28000,
                     35000,25000,50000,38000,45000,30000,22000,60000,35000,28000,
                     42000,33000,25000,48000,38000,45000,30000,52000,35000,25000,
                     40000,28000,55000,35000,30000,45000,25000,38000,42000,50000,
                     28000,35000,25000,60000,30000,42000,38000,45000,25000,35000,
                     50000,28000,42000,30000,38000,45000,35000,25000,30000,55000,
                     42000,38000,25000,50000,35000,45000,30000,38000,42000,25000,
                     35000,30000,45000,38000,50000])[i];

    -- Comisiones
    IF precio > 8000 THEN
      pago_rep := ROUND(precio * 0.6);
      empresa_recibe_val := precio - pago_rep;
    ELSE
      pago_rep := ROUND(precio * 0.75);
      empresa_recibe_val := precio - pago_rep;
    END IF;

    km_val := (RANDOM() * 8 + 2)::DECIMAL(5,2);

    INSERT INTO pedidos (
      user_id, turno_id, codigo, cliente, telefono, direccion, barrio, notas,
      local_id, repartidor_id, km, envio, precio, pago_repartidor, empresa_recibe,
      metodo_pago, estado, liquidado, created_at
    ) VALUES (
      admin_id, turno_id,
      'DOM-' || LPAD(i::TEXT, 4, '0'),
      (ARRAY['Carlos Mendoza','Ana Rodriguez','Luis Garcia','Maria Torres','Pedro Sanchez',
             'Laura Martinez','Diego Ramirez','Camila Herrera','Andres Lopez','Sofia Castro',
             'Juan Morales','Valentina Diaz','Ricardo Vargas','Isabella Rojas','Felipe Cruz',
             'Daniela Ortiz','Mateo Silva','Gabriela Reyes','Nicolas Flores','Mariana Gutierrez',
             'Alejandro Pena','Paula Jimenez','Sebastian Medina','Natalia Aguilar','Emilio Vargas',
             'Carolina Salazar','David Castillo','Andrea Morales','Javier Gomez','Patricia Luna',
             'Oscar Navarro','Manuela Restrepo','Fernando Quintero','Catalina Mendez','Roberto Vega',
             'Juliana Franco','Hugo Padilla','Veronica Ceballos','Alberto Rios','Liliana Cordoba'])[(i % 40) + 1],
      '300' || LPAD((i + 2000)::TEXT, 7, '0'),
      (ARRAY['Calle 22 #5-34 Centro','Cra 5 #12-89','Av Universidad #20-15','Calle 30 #10-45',
             'Cra 3 #8-67','Calle 18 #4-23','Av 19 #15-90','Cra 7 #25-12',
             'Calle 15 #6-78','Cra 4 #14-56','Calle 25 #9-34','Av Central #18-45',
             'Cra 8 #22-67','Calle 20 #3-89','Cra 6 #11-23','Calle 28 #7-56',
             'Av Principal #12-34','Cra 2 #16-78','Calle 12 #5-90','Cra 10 #15-23',
             'Calle 40 #6-89','Av Sur #14-45','Cra 11 #19-67','Calle 45 #3-12',
             'Cra 12 #7-34','Calle 8 #2-56','Av Primera #30-10','Calle 50 #15-30',
             'Cra 15 #21-45','Av Siempre Viva #42','Calle 7 #3-89','Cra 20 #5-67',
             'Av Las Palmas #10','Calle 60 #4-32','Cra 25 #9-15'])[(i % 35) + 1],
      (ARRAY['Centro','Boston','San Isidro','La Merced','El Santuario','San Fernando',
             'Modelo','Prado','Los Angeles','Albergue'])[(i % 10) + 1],
      CASE WHEN i % 5 = 0 THEN 'Llamar antes de llegar' WHEN i % 7 = 0 THEN 'Dejar en la puerta' ELSE '' END,
      local_id, rep_id, km_val, ROUND(precio * 0.15), precio, pago_rep, empresa_recibe_val,
      CASE WHEN i % 4 = 0 THEN 'Transferencia' ELSE 'Efectivo' END,
      CASE WHEN i <= 5 THEN 'Pendiente'
           WHEN i <= 13 THEN 'Aceptado'
           WHEN i <= 21 THEN 'Recogido'
           WHEN i <= 29 THEN 'En camino'
           WHEN i <= 94 THEN 'Entregado'
           WHEN i <= 100 THEN 'Cancelado'
           ELSE 'Problema' END,
      CASE WHEN i <= 94 AND i > 29 THEN true ELSE false END,
      NOW() - ((105 - i) * INTERVAL '2 hours') - (i % 12 * INTERVAL '1 hour')
    );

    total_empresa := total_empresa + empresa_recibe_val;
    total_recaudo := total_recaudo + precio;
  END LOOP;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'RESUMEN FINAL';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Pedidos creados: 105';
  RAISE NOTICE 'Repartidores: 30';
  RAISE NOTICE 'Locales: 16';
  RAISE NOTICE 'Recaudo total: $%', total_recaudo;
  RAISE NOTICE 'Ganancia empresa (empresa_recibe): $%', ROUND(total_empresa);
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ ¡Listo! Ve a /admin para ver los datos.';
END $$;
