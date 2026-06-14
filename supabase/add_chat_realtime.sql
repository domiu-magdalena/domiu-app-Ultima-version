-- Add mensajes_chat table to the supabase_realtime publication
-- Run this once in the Supabase SQL editor

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'mensajes_chat'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mensajes_chat;
    RAISE NOTICE 'mensajes_chat added to supabase_realtime';
  ELSE
    RAISE NOTICE 'mensajes_chat already in supabase_realtime';
  END IF;
END $$;
