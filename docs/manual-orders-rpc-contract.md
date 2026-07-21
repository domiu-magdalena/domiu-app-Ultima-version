# Contrato RPC

```text
confirm_manual_order(
  p_actor_id uuid,
  p_payload jsonb,
  p_idempotency_key text
) returns jsonb
```

Solo backend service role. Devuelve `orderId`, `orderNumber`, `status`, valores finales, tipo de cliente e indicador idempotente. Errores operativos abortan la transacción.
