# Referencia rápida de errores

| Código | Acción |
|---|---|
| `tenant_mismatch` | Verificar que el negocio pertenezca al comercio. |
| `product_tenant_mismatch` | Recargar catálogo del negocio seleccionado. |
| `insufficient_inventory` | Recalcular después de ajustar cantidad. |
| `delivery_override_forbidden` | Usar tarifa automática o habilitar permiso. |
| `draft_version_conflict` | Recargar borrador. |
| `idempotency_key_required` | Generar una clave estable para el intento. |
| `manual_order_confirmation_failed` | Revisar mensaje operativo y recalcular. |
| `rate_limit` | Esperar un minuto antes de reintentar. |
| `origin_mismatch` | Revisar dominio, proxy y configuración de aplicación. |

Los mensajes del proveedor SQL se recortan antes de responder. Nunca devolver `DETAIL`, `CONTEXT` o stack traces al navegador.
