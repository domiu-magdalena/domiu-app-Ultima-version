# Estados

El módulo reutiliza `order_status` y no crea una máquina paralela.

Estados iniciales permitidos:

- `pending`
- `confirmed`
- `assigned` únicamente cuando administración selecciona un repartidor elegible.

Después de la creación, el pedido continúa por las transiciones operativas existentes: preparación, listo, asignación, aceptación, recogida, camino, entrega o cancelación. Las transiciones no se reciben libremente desde el formulario de creación.
