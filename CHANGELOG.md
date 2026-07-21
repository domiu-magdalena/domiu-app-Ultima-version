# Changelog

## 2026-07-21 — Pedidos manuales Enterprise

### Añadido

- Creación manual de pedidos desde administración y negocio.
- Clientes invitados sin cuenta de autenticación.
- Selección de productos, variantes, cantidades y artículos personalizados autorizados.
- Cotización backend en COP con tarifa de domicilio y servicio.
- Recogida en local, canales externos, pagos, notas y asignación administrativa.
- Borradores versionados sin impacto operativo.
- Confirmación PostgreSQL transaccional e idempotente.
- Snapshots históricos de cliente, dirección, negocio y productos.
- Movimientos de inventario y restauración automática por cancelación.
- APIs protegidas por sesión, rol, tenant, origen y rate limiting.
- Pruebas y workflow CI específico.
- Documentación de arquitectura, operación y rollback.

### Eliminado

- Formulario administrativo legado que creaba cuentas artificiales para invitados.

### Seguridad

- Productos y sucursales aislados por negocio.
- Totales, precios e inventario recalculados en backend.
- Función privilegiada disponible únicamente para `service_role`.
- Motivo obligatorio para excepciones, ajustes y tarifas manuales.
