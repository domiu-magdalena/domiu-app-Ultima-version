# Privilegios SQL

`confirm_manual_order` revoca ejecución de `public`, `anon` y `authenticated`; concede únicamente `service_role`.

Las tablas nuevas revocan escrituras directas de roles web. Los servicios backend usan la clave secreta y validan sesión antes de cualquier operación.

Los triggers internos revocan ejecución pública y fijan `search_path` cuando son `SECURITY DEFINER`.
