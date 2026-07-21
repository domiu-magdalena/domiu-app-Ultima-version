# Inventario de pedidos manuales

La cotización consulta stock, pero no lo reserva. La confirmación ejecuta:

1. `SELECT ... FOR UPDATE` sobre producto o variante.
2. Validación de negocio, estado y cantidad.
3. `UPDATE ... WHERE quantity_available >= quantity`.
4. Inserción de movimiento `decrement`.
5. Creación de pedido y artículos en la misma transacción.

Ante error, PostgreSQL revierte todos los cambios. Al cancelar, el trigger inserta un movimiento `restore` y repone stock. La unicidad por artículo y tipo evita doble restauración.

Artículos personalizados no afectan inventario ni catálogo.
