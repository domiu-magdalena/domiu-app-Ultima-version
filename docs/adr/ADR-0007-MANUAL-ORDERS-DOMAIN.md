# ADR-0007 — Dominio compartido para pedidos manuales

## Estado

Aceptado — 2026-07-21.

## Contexto

DomiU necesita registrar pedidos externos desde administración y comercio. El flujo anterior creaba usuarios de autenticación artificiales y pedidos sin productos, lo que rompía privacidad, inventario, finanzas y trazabilidad.

## Decisión

1. Reutilizar `orders`, `order_items`, estados, triggers financieros, seguimiento y notificaciones existentes.
2. Permitir `customer_id` nulo para invitados y conservar snapshots inmutables.
3. No crear usuarios de Supabase Auth para clientes invitados.
4. Usar un único dominio backend para admin y comercio.
5. Ejecutar la confirmación mediante una función PostgreSQL `SECURITY DEFINER` disponible solo para `service_role`.
6. Volver a consultar precios e inventario y bloquear filas con `FOR UPDATE`.
7. Registrar decrementos y restauraciones idempotentes.
8. Exigir una clave de idempotencia y hash del contenido.
9. Tratar borradores como datos separados sin efecto operativo o financiero.
10. Mantener artículos personalizados fuera del catálogo.
11. Mantener el pedido definitivo y sus snapshots dentro del flujo normal.

## Consecuencias

- Admin y comercio no duplican reglas.
- Un cliente invitado no obtiene credenciales ni acceso por compartir teléfono.
- La confirmación puede fallar cuando cambió precio, estado o stock; la interfaz debe recalcular.
- Las columnas y tablas añadidas permanecen tras un rollback de aplicación para no perder trazabilidad.
- Las operaciones privilegiadas requieren backend con clave secreta y nunca se exponen al navegador.
