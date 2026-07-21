# Auditoría

La creación final registra:

- usuario, correo y rol;
- negocio y sucursal;
- número de pedido;
- cliente registrado o invitado;
- canal, tipo de entrega y cantidad de artículos;
- subtotal, domicilio y total;
- modificación de tarifa;
- estado inicial y repartidor;
- motivo administrativo;
- clave de idempotencia;
- resultado y fuente de la función.

Las solicitudes de búsqueda, cotización, borrador y confirmación consumen contadores de rate limiting en `audit_log` sin guardar el payload completo.
