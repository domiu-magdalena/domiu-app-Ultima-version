# Privacidad de clientes invitados

- No se crea usuario en Supabase Auth.
- `customer_id` permanece nulo.
- Nombre y teléfono se usan únicamente como snapshot operativo del pedido.
- Coincidir por teléfono no vincula automáticamente un pedido con una cuenta.
- El comercio solo puede buscar clientes registrados que ya tuvieron pedidos en su negocio.
- Las notas internas no se exponen al cliente ni al repartidor.
- La información de pago se limita a método, estado, referencia externa y observaciones; no se almacenan credenciales ni datos completos de tarjeta.
