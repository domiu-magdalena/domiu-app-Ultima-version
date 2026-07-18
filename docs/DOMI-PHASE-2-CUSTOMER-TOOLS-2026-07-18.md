# Domi — Fase 2: herramientas seguras de cliente

Fecha: 18 de julio de 2026

## Objetivo

Permitir que Domi consulte información real para un cliente autenticado sin darle acceso abierto a la base de datos ni habilitar acciones de escritura.

## Herramientas habilitadas

| Herramienta | Capacidad requerida | Fuente | Escritura |
|---|---|---|---|
| `customer.search_catalog` | `business.search` y `products.search` | Negocios y productos activos | No |
| `customer.cart_summary` | `cart.read` | Carrito local validado contra catálogo del servidor | No |
| `customer.list_orders` | `orders.read` | Pedidos del usuario autenticado | No |
| `customer.track_order` | `orders.read` | Pedido y eventos del usuario autenticado | No |

## Flujo seguro

1. El navegador envía el mensaje, la pantalla actual y una copia mínima del carrito.
2. El servidor autentica la sesión y obtiene el perfil real.
3. El contexto se sanea según el rol.
4. El planificador determina si corresponde una herramienta permitida.
5. El ejecutor vuelve a validar el rol y la capacidad.
6. Cada consulta usa filtros explícitos y límites.
7. Los pedidos se filtran obligatoriamente por `customer_id = userId`.
8. El resultado se reduce a campos autorizados.
9. La ejecución se registra en `audit_log` sin guardar el contenido completo de la consulta en el evento.

## Carrito

El carrito sigue almacenado en el dispositivo. Domi recibe únicamente:

- `businessId`.
- Identificador del producto.
- Cantidad.

No confía en nombres ni precios enviados por el navegador. Los productos se consultan nuevamente y el subtotal se calcula con el precio actual del servidor. Los identificadores inválidos se descartan y las cantidades se limitan.

## Catálogo

La búsqueda devuelve solamente:

- Negocios activos y verificados.
- Catálogos con estado `live`.
- Productos disponibles y no eliminados.
- Información pública: nombre, categoría, precio, estado de apertura y ruta interna.

No se exponen correos, teléfonos, propietarios, costos internos ni metadatos privados.

## Pedidos

Las herramientas de pedidos:

- Solo consultan pedidos del usuario autenticado.
- No aceptan un `customer_id` enviado por el cliente.
- No muestran direcciones, coordenadas, teléfonos ni datos financieros internos.
- No muestran información personal del repartidor.
- Exponen estado, negocio, total, fecha, estimación y eventos de estado.

## Protección de consultas

- Las búsquedas se normalizan y eliminan caracteres de control de filtros.
- Los resultados tienen límites estrictos.
- No existe SQL generado por el modelo.
- El asistente no recibe una consola de consultas.
- Las herramientas se seleccionan mediante un planificador determinista.
- Las acciones de escritura siguen deshabilitadas.

## Auditoría

Cada ejecución registra:

- Usuario y rol.
- Sesión.
- Tenant.
- Herramienta.
- Intención.
- Resultado.
- Cantidad de registros devueltos.
- Duración.
- Pantalla y módulo.

No se escribe el contenido completo del mensaje dentro del evento de auditoría.

## Interfaz

Las respuestas pueden incluir:

- Acciones sugeridas que vuelven a consultar Domi.
- Enlaces internos validados con prefijo `/cliente`.
- Acceso al carrito, negocio o detalle del pedido.

## Pruebas incluidas

- Búsqueda de catálogo.
- Consulta de carrito.
- Diferenciación entre historial y seguimiento.
- Rechazo de herramientas de cliente para otros roles.
- Rechazo cuando falta una capacidad.
- Saneamiento de identificadores y cantidades del carrito.
- Eliminación del carrito del contexto de perfiles no clientes.

## Fuera del alcance de esta fase

- Agregar o retirar productos por conversación.
- Crear pedidos.
- Cancelar pedidos.
- Cambiar dirección o método de pago.
- Contactar automáticamente al negocio o repartidor.
- Herramientas de comercio, repartidor o administrador.

Estas acciones requerirán contratos separados, confirmación explícita, idempotencia específica y controles adicionales en fases posteriores.
