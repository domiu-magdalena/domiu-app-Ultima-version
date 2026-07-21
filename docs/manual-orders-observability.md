# Observabilidad

## Señales

- `manual_order.quote`, `manual_order.draft`, `manual_order.confirm` y `manual_order.search` en `audit_log`.
- `manual_order_created` con negocio, sucursal, canal, entrega, totales e idempotencia.
- `order_tracking` para estado inicial y transiciones.
- `manual_order_inventory_movements` para stock.
- Logs de Vercel para códigos HTTP y errores sanitizados.

## Métricas recomendadas

- pedidos manuales por canal y panel;
- tasa de confirmación desde cotización;
- conflictos de stock;
- reintentos idempotentes;
- tiempo p50/p95 de quote y confirm;
- borradores creados, convertidos y expirados;
- excepciones administrativas y tarifas sobrescritas.
