# Modelo de datos — pedidos manuales

## `orders`

Campos principales añadidos:

| Campo | Uso |
|---|---|
| `created_manually` | Diferencia el origen externo. |
| `creation_source` | `customer_app` o `manual`. |
| `created_by_user_id` | Actor autenticado. |
| `created_by_role` | Rol congelado al crear. |
| `created_from_panel` | `admin` o `merchant`. |
| `branch_id` | Sucursal seleccionada. |
| `guest_customer` | Identidad operativa del invitado. |
| `customer_snapshot` | Datos congelados del cliente. |
| `delivery_address_snapshot` | Dirección congelada. |
| `business_snapshot` | Negocio y sucursal congelados. |
| `sales_channel` | WhatsApp, llamada, presencial o red. |
| `delivery_type` | Domicilio o pickup. |
| `delivery_fee_source` | Automática, manual, fallback o pickup. |
| `delivery_fee_overridden` | Indicador de modificación. |
| `idempotency_key` | Prevención de duplicados. |
| `manual_request_hash` | Detecta reutilización con contenido distinto. |
| Notas separadas | Cocina, repartidor, internas y pago. |

## `order_items`

`product_id` puede ser nulo únicamente cuando `is_custom_product=true`. Cada fila conserva nombre, SKU, producto, variante y modificadores como snapshots.

## `manual_order_drafts`

Payload incompleto, actor, rol, negocio, sucursal, versión, estado y expiración. No tiene FK hacia productos individuales porque aún no representa una venta.

## `manual_order_inventory_movements`

Relaciona pedido, artículo, producto o variante, tipo de movimiento y cantidad. La unicidad por artículo y tipo impide restauraciones repetidas.

## Integridad

- Índice único parcial de idempotencia por creador.
- Constraints de canal, panel, entrega, moneda, valores y cliente invitado.
- FKs hacia perfiles, negocios, sucursales, pedidos, productos y variantes.
- Índices para listados por actor, negocio, fecha y estado.
