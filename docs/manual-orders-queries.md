# Consultas

Las búsquedas usan valores enviados como parámetros por Supabase. Antes de construir filtros `or`, se eliminan metacaracteres `%`, `_`, coma y paréntesis. Los UUID se validan con Zod.

La cotización carga productos y variantes en lotes. La confirmación no concatena SQL; recibe `jsonb` y usa conversiones controladas dentro de PL/pgSQL.
