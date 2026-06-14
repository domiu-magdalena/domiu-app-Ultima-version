-- Fix mensajes_chat table schema to match the chat components
-- Adds missing columns and indexes

DO $$
BEGIN
  -- Add pedido_cliente_id column (FK to pedidos_cliente)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mensajes_chat' AND column_name = 'pedido_cliente_id'
  ) THEN
    ALTER TABLE mensajes_chat ADD COLUMN pedido_cliente_id UUID REFERENCES pedidos_cliente(id) ON DELETE CASCADE;
  END IF;

  -- Add remitente_nombre column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mensajes_chat' AND column_name = 'remitente_nombre'
  ) THEN
    ALTER TABLE mensajes_chat ADD COLUMN remitente_nombre TEXT;
  END IF;

  -- Add remitente_telefono column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mensajes_chat' AND column_name = 'remitente_telefono'
  ) THEN
    ALTER TABLE mensajes_chat ADD COLUMN remitente_telefono TEXT;
  END IF;

  -- Add index for pedido_cliente_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_mensajes_chat_pedido_cliente'
  ) THEN
    CREATE INDEX idx_mensajes_chat_pedido_cliente ON mensajes_chat(pedido_cliente_id, created_at);
  END IF;

  -- NOTE: supabase_realtime publication is FOR ALL TABLES, no need to add explicitly
END $$;
