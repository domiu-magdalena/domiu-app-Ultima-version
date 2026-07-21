# Migraciones

Orden:

1. `20260721110000_manual_orders_schema.sql`
2. `20260721111000_manual_orders_pricing_inventory.sql`
3. `20260721112000_confirm_manual_order_rpc.sql`

La primera amplía tablas y crea borradores/movimientos. La segunda adapta triggers de operación, tarifa, finanzas y restauración. La tercera crea la confirmación transaccional.

Las migraciones son aditivas e idempotentes donde la historia existente lo permite. Deben validarse en una reconstrucción limpia antes de producción. No contienen secretos ni datos demo.
