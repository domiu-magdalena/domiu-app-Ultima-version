-- Fix mensajes_chat table schema to match the chat components
ALTER TABLE mensajes_chat ADD COLUMN IF NOT EXISTS pedido_cliente_id UUID REFERENCES pedidos_cliente(id) ON DELETE CASCADE;
ALTER TABLE mensajes_chat ADD COLUMN IF NOT EXISTS remitente_nombre TEXT;
ALTER TABLE mensajes_chat ADD COLUMN IF NOT EXISTS remitente_telefono TEXT;
CREATE INDEX IF NOT EXISTS idx_mensajes_chat_pedido_cliente ON mensajes_chat(pedido_cliente_id, created_at);
-- NOT needed: supabase_realtime publication is FOR ALL TABLES
