-- 1. Agregar columna local_id si no existe
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS local_id UUID REFERENCES locales(id) ON DELETE SET NULL;

-- 2. Crear registros en negocios para locales existentes sin negocio vinculado
-- Verifica columna a columna para evitar errores si no existen
DO $$
DECLARE
  has_categoria BOOLEAN;
  has_usuario_id BOOLEAN;
  v_sql TEXT;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='negocios' AND column_name='categoria') INTO has_categoria;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='negocios' AND column_name='usuario_id') INTO has_usuario_id;

  v_sql := 'INSERT INTO negocios (nombre, direccion, telefono, local_id, descripcion, horario, domicilio_cost, abierto, destacado, activo';
  IF has_categoria THEN v_sql := v_sql || ', categoria'; END IF;
  IF has_usuario_id THEN v_sql := v_sql || ', usuario_id'; END IF;
  v_sql := v_sql || ') ';

  v_sql := v_sql || 'SELECT l.nombre, l.direccion, l.telefono, l.id, '''', ''Lunes a Domingo'', 3000, true, false, true';
  IF has_categoria THEN v_sql := v_sql || ', ''General'''; END IF;
  IF has_usuario_id THEN v_sql := v_sql || ', l.user_id'; END IF;
  v_sql := v_sql || ' FROM locales l WHERE l.activo IS NOT FALSE AND NOT EXISTS (SELECT 1 FROM negocios n WHERE n.nombre = l.nombre)';

  EXECUTE v_sql;
END $$;
