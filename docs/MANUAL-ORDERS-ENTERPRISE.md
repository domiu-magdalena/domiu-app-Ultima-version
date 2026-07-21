# Pedidos manuales Enterprise

## Alcance

Este módulo registra pedidos recibidos fuera de la aplicación del cliente desde:

- Panel administrativo: `/admin/pedidos/crear`.
- Panel del negocio: `/negocio/pedidos/crear`.

Los pedidos creados por WhatsApp, llamada, atención presencial o redes sociales entran a la misma tabla `orders`, usan `order_items`, participan en el flujo normal de estados y conservan trazabilidad completa de su origen.

## Flujo funcional

1. Seleccionar el negocio autorizado.
2. Seleccionar un cliente registrado o registrar un invitado mediante snapshot.
3. Seleccionar domicilio o recogida en el local.
4. Agregar productos del catálogo autorizado o artículos personalizados permitidos.
5. Calcular la tarifa automática o registrar una sobrescritura manual con motivo.
6. Registrar forma y estado de pago.
7. Revisar el resumen y confirmar explícitamente.
8. Revalidar actor, negocio, catálogo, precios, inventario y valores en backend.
9. Crear el pedido y sus artículos dentro de una transacción PostgreSQL.
10. Registrar seguimiento, auditoría y eliminar el borrador convertido.

## Arquitectura

### Interfaz compartida

`src/components/manual-orders/ManualOrderWorkspace.tsx`

La misma interfaz atiende administración y negocios. El parámetro `panel` controla las capacidades visibles, mientras que las autorizaciones definitivas se ejecutan en servidor.

### Dominio y validación

`src/lib/orders/manual-order-domain.ts`

Contiene:

- Esquemas Zod del pedido.
- Reglas para invitados y clientes registrados.
- Restricciones de domicilio y recogida.
- Reglas para tarifa manual y canal `other`.
- Validación de artículos personalizados.
- Cálculo entero de valores en COP.
- Traducción segura de errores de dominio.

### Acciones de servidor

`src/app/actions/manual-orders.ts`

Responsabilidades:

- Resolver el actor autenticado.
- Comprobar rol y permiso `manage_orders`.
- Aislar negocios por propietario para el panel de comercio.
- Consultar catálogo y clientes autorizados.
- Guardar, recuperar y eliminar borradores.
- Recalcular precios, tarifa y total.
- Invocar la creación SQL transaccional.
- Registrar auditoría sin exponer trazas internas.

`src/app/actions/order-panel.ts`

Responsabilidades:

- Construir listados compatibles con snapshots e invitados.
- Mostrar artículos personalizados aunque no tengan `product_id`.
- Aplicar transiciones de estado permitidas en servidor.
- Evitar cambios directos de estado desde el navegador.

### Persistencia

Migraciones principales:

- `20260721120000_manual_orders_enterprise.sql`.
- `20260721120500_manual_order_idempotency_fingerprint.sql`.
- `20260721121000_restore_manual_order_inventory.sql`.

La función `create_manual_order_atomic(jsonb, jsonb)`:

- Solo concede ejecución a `service_role`.
- Serializa solicitudes con la misma clave de idempotencia.
- Rechaza una misma clave usada con contenido diferente.
- Bloquea productos mediante `FOR UPDATE`.
- Valida que todos los productos pertenezcan al negocio.
- Usa el precio vigente de la base de datos.
- Verifica stock antes de insertar.
- Descuenta inventario en la misma transacción.
- Inserta snapshots de producto y valores históricos.
- Revierte toda la operación ante cualquier error.

## Clientes invitados

Un invitado no crea un usuario en Supabase Auth ni un perfil artificial. El pedido conserva en `guest_customer_snapshot`:

- Nombre.
- Teléfono.
- Correo opcional.
- Notas autorizadas.

El número telefónico por sí solo no concede acceso al pedido. La vinculación posterior con un cliente registrado debe ser una operación administrativa independiente y auditada.

## Snapshots históricos

El pedido congela información que podría cambiar después:

- Cliente.
- Dirección.
- Negocio.
- Nombre, SKU y precio de cada producto.
- Variantes y modificadores.
- Canal de venta.
- Fuente y motivo de la tarifa de domicilio.

Los listados del panel priorizan el snapshot y usan las relaciones actuales solo como respaldo.

## Inventario

La confirmación bloquea cada producto, comprueba disponibilidad y descuenta existencias atómicamente. Cuando un pedido manual cambia por primera vez a `cancelled`, un trigger restaura el inventario y registra `manual_inventory_restored_at` en los metadatos para impedir restauraciones duplicadas.

Los borradores no descuentan ni reservan inventario.

## Idempotencia

Cada confirmación usa un UUID de idempotencia y una huella SHA-256 de la carga validada.

- Misma clave y misma carga: devuelve el pedido existente.
- Misma clave y carga distinta: rechaza la operación.
- Doble clic o reintento concurrente: se serializa mediante advisory lock.

## Pagos

Crear un pedido no lo marca como pagado automáticamente. Los estados admitidos en este primer flujo son:

- `pending`.
- `completed`, únicamente cuando `paid_amount` coincide con el total.

Un pago parcial permanece `pending` y se identifica mediante `paid_amount`, `outstanding_amount` y metadatos operativos.

## Seguridad

- Autenticación validada mediante `supabase.auth.getUser()`.
- Operaciones privilegiadas server-side.
- El navegador nunca recibe `SUPABASE_SECRET_KEY` ni `service_role`.
- El comercio queda limitado a negocios cuyo `owner_id` coincide con el actor.
- Administración requiere un rol administrativo con `manage_orders`.
- Los productos se consultan nuevamente en backend.
- Los totales enviados por frontend se ignoran.
- Los borradores tienen RLS por `actor_id = auth.uid()`.
- Las transiciones se validan con estado actual y actualización condicional.
- Los errores devueltos al usuario no incluyen trazas internas.

## Pruebas

`src/lib/orders/manual-order-domain.test.ts` cubre:

- Invitado sin identidad de autenticación.
- Motivo administrativo obligatorio.
- Motivo obligatorio al sobrescribir tarifa.
- Recogida sin tarifa de domicilio.
- Descripción del canal `other`.
- Cálculos enteros en COP.
- Normalización de teléfono.

El workflow `.github/workflows/domi-ci.yml` ejecuta estas pruebas, escaneo de secretos, lint, auditoría npm, suite Domi, build de Next.js y construcción Docker.

## Despliegue

1. Rotar la credencial histórica comprometida antes de fusionar.
2. Configurar `SUPABASE_SECRET_KEY` únicamente en servidor y Vercel.
3. Aplicar las migraciones en preview.
4. Ejecutar reconstrucción limpia de Supabase.
5. Probar un invitado, un cliente registrado, domicilio, recogida y cancelación.
6. Confirmar que el inventario se descuenta y restaura exactamente una vez.
7. Revisar auditoría y listados en ambos paneles.
8. Promover a producción solo después de que CI y la verificación de preview sean satisfactorios.

## Estado de implementación

La existencia del código no equivale por sí sola a validación productiva. El PR debe permanecer en borrador mientras falten resultados verificables de CI, migraciones y preview.
