# Checklist de revisión de código

- Actor y tenant no provienen del body.
- Todos los schemas son estrictos.
- Precios se consultan en backend.
- Producto y variante pertenecen al negocio.
- `FOR UPDATE` protege inventario.
- Idempotencia incluye hash.
- Invitado no crea auth user.
- Pickup no crea domicilio ni repartidor.
- Notas internas no llegan a repartidor.
- RPC no tiene permiso web.
- Migraciones son reconstruibles.
