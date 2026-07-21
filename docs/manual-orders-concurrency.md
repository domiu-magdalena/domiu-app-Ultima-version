# Concurrencia

- Cotizaciones pueden ejecutarse en paralelo y no modifican stock.
- Confirmaciones bloquean las filas de producto o variante.
- El UPDATE condicionado evita stock negativo aunque cambie entre lectura y escritura.
- La clave idempotente evita duplicados por solicitudes concurrentes del mismo actor.
- Los borradores usan versión optimista para evitar sobrescritura silenciosa.
