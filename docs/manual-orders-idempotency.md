# Idempotencia

El cliente genera una clave `manual:<uuid>` antes del primer intento y la conserva hasta recibir éxito o modificar deliberadamente la solicitud.

PostgreSQL mantiene:

- índice único parcial por `created_by_user_id` e `idempotency_key`;
- `manual_request_hash` calculado sobre el payload normalizado;
- respuesta del pedido existente cuando clave y contenido coinciden;
- conflicto cuando la clave fue reutilizada con contenido diferente.

Los timeouts pueden reintentarse con la misma clave. No generar una nueva clave por doble clic, respuesta lenta o pérdida de conexión.
