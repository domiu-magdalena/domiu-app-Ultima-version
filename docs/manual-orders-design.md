# Diseño técnico

La interfaz utiliza un wizard compartido y APIs REST internas. El dominio server-side no depende de la UI. PostgreSQL contiene la operación atómica que requiere bloqueo y consistencia.

La separación es:

- UI: captura y recuperación.
- API: autenticación, CSRF, esquema y rate limit.
- Servicio: autorización, búsqueda y cotización.
- RPC: confirmación transaccional.
- Triggers: operación existente, finanzas, notificaciones, liquidación y restauración.
