import dns from 'dns';
import pkg from 'pg';
const { Client } = pkg;

// Resolve IPv6 address for direct connection
const host = 'db.auyzmvyfscvfzrhhjejq.supabase.co';
const pw = '11930421042026';

console.log(`Resolviendo ${host}...`);
const addrs = await dns.promises.resolve6(host);
console.log(`IPv6: ${addrs[0]}`);

const client = new Client({
  host: addrs[0],
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: pw,
  ssl: { rejectUnauthorized: false },
});

const sql = `
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
  estado_negocio TEXT DEFAULT 'recibido',
  estado_admin TEXT DEFAULT 'recibido',
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
ALTER TABLE pedidos_cliente ADD COLUMN IF NOT EXISTS metodo_pago TEXT DEFAULT 'efectivo';
ALTER TABLE pedidos_cliente ADD COLUMN IF NOT EXISTS metodo_pago_ref TEXT;
ALTER TABLE pedidos_cliente ADD COLUMN IF NOT EXISTS calificado_repartidor BOOLEAN DEFAULT false;
ALTER TABLE pedidos_cliente ADD COLUMN IF NOT EXISTS calificado_negocio BOOLEAN DEFAULT false;
CREATE TABLE IF NOT EXISTS detalle_pedido_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos_cliente(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(id),
  producto_nombre TEXT NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL
);
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'General';
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS local_id UUID REFERENCES locales(id) ON DELETE SET NULL;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS logo TEXT DEFAULT '';
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS banner TEXT DEFAULT '';
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS rating NUMERIC(2,1) DEFAULT 4.5;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS tiempo_estimado TEXT DEFAULT '30-45 min';
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS destacado BOOLEAN DEFAULT false;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE negocios ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_pedido_cliente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "negocios_select_public" ON negocios; CREATE POLICY "negocios_select_public" ON negocios FOR SELECT USING (true);
DROP POLICY IF EXISTS "negocios_insert_public" ON negocios; CREATE POLICY "negocios_insert_public" ON negocios FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "negocios_update_public" ON negocios; CREATE POLICY "negocios_update_public" ON negocios FOR UPDATE USING (true);
DROP POLICY IF EXISTS "negocios_delete_public" ON negocios; CREATE POLICY "negocios_delete_public" ON negocios FOR DELETE USING (true);
DROP POLICY IF EXISTS "productos_select_public" ON productos; CREATE POLICY "productos_select_public" ON productos FOR SELECT USING (true);
DROP POLICY IF EXISTS "productos_insert_public" ON productos; CREATE POLICY "productos_insert_public" ON productos FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "productos_update_public" ON productos; CREATE POLICY "productos_update_public" ON productos FOR UPDATE USING (true);
DROP POLICY IF EXISTS "productos_delete_public" ON productos; CREATE POLICY "productos_delete_public" ON productos FOR DELETE USING (true);
DROP POLICY IF EXISTS "pedidos_cliente_insert" ON pedidos_cliente; CREATE POLICY "pedidos_cliente_insert" ON pedidos_cliente FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "pedidos_cliente_select" ON pedidos_cliente; CREATE POLICY "pedidos_cliente_select" ON pedidos_cliente FOR SELECT USING (true);
DROP POLICY IF EXISTS "pedidos_cliente_update" ON pedidos_cliente; CREATE POLICY "pedidos_cliente_update" ON pedidos_cliente FOR UPDATE USING (true);
DROP POLICY IF EXISTS "detalle_pedido_insert" ON detalle_pedido_cliente; CREATE POLICY "detalle_pedido_insert" ON detalle_pedido_cliente FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "detalle_pedido_select" ON detalle_pedido_cliente; CREATE POLICY "detalle_pedido_select" ON detalle_pedido_cliente FOR SELECT USING (true);
ALTER TABLE locales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "locales_select_public" ON locales; CREATE POLICY "locales_select_public" ON locales FOR SELECT USING (true);
DROP POLICY IF EXISTS "locales_insert_public" ON locales; CREATE POLICY "locales_insert_public" ON locales FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "locales_update_public" ON locales; CREATE POLICY "locales_update_public" ON locales FOR UPDATE USING (true);
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
DROP POLICY IF EXISTS "calificaciones_insert" ON calificaciones; CREATE POLICY "calificaciones_insert" ON calificaciones FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "calificaciones_select" ON calificaciones; CREATE POLICY "calificaciones_select" ON calificaciones FOR SELECT USING (true);
INSERT INTO negocios (nombre, categoria, descripcion, direccion, telefono, rating, tiempo_estimado, domicilio_cost, abierto, destacado, activo)
SELECT * FROM (VALUES
  ('Pizzeria Napoli', 'Restaurantes', 'Las mejores pizzas artesanales de Magdalena.', 'Calle Real #123', '3001112233', 4.8, '25-35 min', 3500, true, true, true),
  ('Super Tienda Don Pepe', 'Tiendas', 'Todo lo que necesitas para tu hogar.', 'Av. Central #456', '3001113344', 4.3, '20-30 min', 3000, true, true, true),
  ('Licores El Buen Gusto', 'Licoreras', 'Amplia seleccion de cervezas y licores.', 'Carrera 7 #789', '3001114455', 4.6, '30-40 min', 4000, true, false, true),
  ('Drogueria Salud Total', 'Droguerias', 'Medicamentos y cuidado personal.', 'Calle 12 #321', '3001115566', 4.7, '15-25 min', 2500, true, false, true),
  ('Sushi Master', 'Restaurantes', 'Sushi fresco y comida japonesa.', 'Av. del Rio #654', '3001116677', 4.9, '35-50 min', 4500, true, true, true)
) AS v WHERE NOT EXISTS (SELECT 1 FROM negocios LIMIT 1);
INSERT INTO productos (negocio_id, nombre, descripcion, precio, categoria_producto, disponible)
SELECT n.id, p.nombre, p.descripcion, p.precio, p.cat, true
FROM (SELECT id FROM negocios WHERE nombre = 'Pizzeria Napoli') n
CROSS JOIN (VALUES ('Pizza Margherita','Mozzarella fresca',22000,'Pizzas'),('Pizza Pepperoni','Pepperoni',25000,'Pizzas'),('Pizza Hawaiana','Piña',24000,'Pizzas'),('Pizza Vegetariana','Veggie',23000,'Pizzas'),('Coca-Cola 1.5L','Gaseosa',5000,'Bebidas')) AS p
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE negocio_id = n.id LIMIT 1);
INSERT INTO productos (negocio_id, nombre, descripcion, precio, categoria_producto, disponible)
SELECT n.id, p.nombre, p.descripcion, p.precio, p.cat, true
FROM (SELECT id FROM negocios WHERE nombre = 'Super Tienda Don Pepe') n
CROSS JOIN (VALUES ('Arroz Diana 1kg','Arroz',3500,'Abarrotes'),('Aceite 1L','Aceite',8500,'Abarrotes'),('Leche Entera 1L','Leche',4200,'Lacteos'),('Pan Bimbo','Pan',6800,'Panaderia'),('Jabon','Detergente 500g',4500,'Limpieza')) AS p
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE negocio_id = n.id LIMIT 1);
INSERT INTO productos (negocio_id, nombre, descripcion, precio, categoria_producto, disponible)
SELECT n.id, p.nombre, p.descripcion, p.precio, p.cat, true
FROM (SELECT id FROM negocios WHERE nombre = 'Licores El Buen Gusto') n
CROSS JOIN (VALUES ('Cerveza Aguila x6','Pack 6',18000,'Cervezas'),('Vino Casillero','Tinto 750ml',45000,'Vinos'),('Ron Medellin','Anejo 750ml',55000,'Licores'),('Coctel Margarita','500ml',22000,'Cocteles')) AS p
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE negocio_id = n.id LIMIT 1);
INSERT INTO productos (negocio_id, nombre, descripcion, precio, categoria_producto, disponible)
SELECT n.id, p.nombre, p.descripcion, p.precio, p.cat, true
FROM (SELECT id FROM negocios WHERE nombre = 'Drogueria Salud Total') n
CROSS JOIN (VALUES ('Acetaminofen 500mg','Analgesico x10',2500,'Medicamentos'),('Ibuprofeno 400mg','Antiinflamatorio x10',3500,'Medicamentos'),('Curitas x20','Apósito',2000,'Cuidado Personal'),('Alcohol 500ml','Antiseptico',4500,'Cuidado Personal')) AS p
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE negocio_id = n.id LIMIT 1);
INSERT INTO productos (negocio_id, nombre, descripcion, precio, categoria_producto, disponible)
SELECT n.id, p.nombre, p.descripcion, p.precio, p.cat, true
FROM (SELECT id FROM negocios WHERE nombre = 'Sushi Master') n
CROSS JOIN (VALUES ('Roll Salmón Philadelphia','Salmon, queso crema',28000,'Rolls'),('California Roll','Cangrejo, aguacate',24000,'Rolls'),('Nigiri Mix x8','8 piezas',32000,'Nigiri')) AS p
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE negocio_id = n.id LIMIT 1);
UPDATE negocios SET local_id = l.id FROM locales l WHERE negocios.nombre = l.nombre AND negocios.local_id IS NULL;
INSERT INTO negocios (nombre, direccion, telefono, local_id, descripcion, horario, domicilio_cost, abierto, destacado, activo, categoria)
SELECT l.nombre, l.direccion, l.telefono, l.id, '', 'Lunes a Domingo', 3000, true, false, true, 'General'
FROM locales l WHERE l.activo IS NOT FALSE AND NOT EXISTS (SELECT 1 FROM negocios n WHERE n.nombre = l.nombre);
`;

async function main() {
  console.log("Conectando via IPv6 directo...");
  await client.connect();
  console.log("Conectado! Ejecutando SQL...");
  await client.query(sql);
  console.log("SQL ejecutado exitosamente!");
  await client.end();
  console.log("Listo.");
}

main().catch(async (err) => {
  console.error("ERROR:", err.message);
  try { await client.end(); } catch(e) {}
  process.exit(1);
});
