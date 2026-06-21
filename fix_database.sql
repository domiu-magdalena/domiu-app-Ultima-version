-- ============================================
-- DOMIU MAGDALENA - CORRECCION COMPLETA DB
-- Ejecutar en Supabase SQL Editor:
-- https://supabase.com/dashboard/project/auyzmvyfscvfzrhhjejq/sql/new
-- ============================================

-- 1. COLUMNA CODIGO A REPARTIDORES
ALTER TABLE repartidores ADD COLUMN IF NOT EXISTS codigo TEXT DEFAULT '';

-- 2. COLUMNA IMAGEN_URL A PRODUCTOS
ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen_url TEXT DEFAULT '';

-- 3. COLUMNA ACTIVO A REPARTIDORES
ALTER TABLE repartidores ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- 4. COLUMNA TURNO_ID A PEDIDOS
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS turno_id UUID REFERENCES turnos(id);

-- 5. COLUMNAS DE RESUMEN A TURNOS
ALTER TABLE turnos ADD COLUMN IF NOT EXISTS total_turno INTEGER DEFAULT 0;
ALTER TABLE turnos ADD COLUMN IF NOT EXISTS entregados INTEGER DEFAULT 0;
ALTER TABLE turnos ADD COLUMN IF NOT EXISTS cancelados INTEGER DEFAULT 0;
ALTER TABLE turnos ADD COLUMN IF NOT EXISTS recaudado_total INTEGER DEFAULT 0;
ALTER TABLE turnos ADD COLUMN IF NOT EXISTS empresa_recibe_total INTEGER DEFAULT 0;
ALTER TABLE turnos ADD COLUMN IF NOT EXISTS liquidado_total INTEGER DEFAULT 0;

-- 6. RLS REPARTIDORES
ALTER TABLE repartidores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "repartidores_select_all" ON repartidores;
CREATE POLICY "repartidores_select_all" ON repartidores FOR SELECT USING (true);
DROP POLICY IF EXISTS "repartidores_insert_own" ON repartidores;
CREATE POLICY "repartidores_insert_own" ON repartidores FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "repartidores_update_own" ON repartidores;
CREATE POLICY "repartidores_update_own" ON repartidores FOR UPDATE USING (auth.uid() = user_id);

-- 7. RLS PEDIDOS
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pedidos_select_all" ON pedidos;
CREATE POLICY "pedidos_select_all" ON pedidos FOR SELECT USING (true);
DROP POLICY IF EXISTS "pedidos_insert_all" ON pedidos;
CREATE POLICY "pedidos_insert_all" ON pedidos FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "pedidos_update_all" ON pedidos;
CREATE POLICY "pedidos_update_all" ON pedidos FOR UPDATE USING (true);
DROP POLICY IF EXISTS "pedidos_delete_all" ON pedidos;
CREATE POLICY "pedidos_delete_all" ON pedidos FOR DELETE USING (true);

-- 8. RLS TURNOS
ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "turnos_select_all" ON turnos;
CREATE POLICY "turnos_select_all" ON turnos FOR SELECT USING (true);
DROP POLICY IF EXISTS "turnos_insert_all" ON turnos;
CREATE POLICY "turnos_insert_all" ON turnos FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "turnos_update_all" ON turnos;
CREATE POLICY "turnos_update_all" ON turnos FOR UPDATE USING (true);

-- 9. RLS UBICACIONES
ALTER TABLE ubicaciones_repartidores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ubicaciones_select_all" ON ubicaciones_repartidores;
CREATE POLICY "ubicaciones_select_all" ON ubicaciones_repartidores FOR SELECT USING (true);
DROP POLICY IF EXISTS "ubicaciones_insert_all" ON ubicaciones_repartidores;
CREATE POLICY "ubicaciones_insert_all" ON ubicaciones_repartidores FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "ubicaciones_update_all" ON ubicaciones_repartidores;
CREATE POLICY "ubicaciones_update_all" ON ubicaciones_repartidores FOR UPDATE USING (true);

-- 10. RLS PRODUCTOS
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "productos_select_all" ON productos;
CREATE POLICY "productos_select_all" ON productos FOR SELECT USING (true);
DROP POLICY IF EXISTS "productos_insert_all" ON productos;
CREATE POLICY "productos_insert_all" ON productos FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "productos_update_all" ON productos;
CREATE POLICY "productos_update_all" ON productos FOR UPDATE USING (true);
DROP POLICY IF EXISTS "productos_delete_all" ON productos;
CREATE POLICY "productos_delete_all" ON productos FOR DELETE USING (true);

-- ============================================
-- FIN - Todas las correcciones aplicadas
-- ============================================
