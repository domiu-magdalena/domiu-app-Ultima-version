# Compatibilidad

Pedidos existentes conservan defaults `created_manually=false`, `creation_source=customer_app` y `delivery_type=delivery`. Los listados usan datos relacionales y snapshots como fallback.

Las rutas y servicios existentes de estado, pagos, seguimiento, reparto, liquidación y reportes siguen consumiendo `orders`.
