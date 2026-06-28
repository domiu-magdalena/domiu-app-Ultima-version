# DomiU - Mapa Funcional Completo

> **Versión:** 1.0 — Documento de referencia integral de la plataforma DomiU.
> **Stack:** Next.js 16.2.9 + React 19.2.4 + Supabase (PostgreSQL 15+ con PostGIS) + Tailwind CSS 4 + TypeScript 5

---

## 1. Descripción General

DomiU es una plataforma de domicilios y pedidos que conecta 4 perfiles:

| Perfil | Rol en DB | Descripción |
|--------|-----------|-------------|
| **Admin** | `super_admin`, `admin_general`, `admin_financiero`, `admin_operativo`, `admin_comercial`, `admin_soporte` | Administra la plataforma completa |
| **Cliente** | `customer` | Compra productos y solicita domicilios |
| **Negocio/Local** | `merchant`, `business` | Vende productos y gestiona pedidos |
| **Repartidor/Domiciliario** | `courier` | Realiza entregas |

**Arquitectura:**
- Frontend: React Server Components + Client Components (App Router)
- Backend: API Routes (`/api/profile`) + Server Actions
- DB: Supabase con RLS, 45+ tablas, 23+ funciones SQL, 44+ triggers
- Tiempo real: Supabase Realtime (subscriptions vía `channel()`)
- Estado global: React Context (Auth, Cart, Chat, Courier, Orders, Tracking)
- Despliegue: Vercel

---

## 2. Roles del Sistema

### Admin

**Qué puede hacer:**
- Dashboard general con KPIs del sistema
- Gestión completa de usuarios (CRUD, roles, estados)
- Gestión de negocios (crear, editar, ver, aprobar/suspender)
- Gestión de repartidores (ver, verificar, suspender, documentos)
- Gestión de pedidos (ver todos, cambiar estados, crear domicilios manuales)
- Solicitudes (aprobar/rechazar repartidores y negocios)
- Soporte (ver y responder tickets)
- Mapa en vivo (placeholder)
- Finanzas (comisiones, transacciones, pagos a negocios)
- Cobertura (ciudades, zonas, tarifas de envío)
- Promociones (cupones, referidos, puntos, recompensas)
- Reportes y analytics
- Moderación de reseñas y reportes
- Auditoría y seguridad
- Configuración general
- Wallets (ver billeteras de usuarios)

**Rutas disponibles:**

| Ruta | Descripción |
|------|-------------|
| `/admin` | Dashboard con KPIs (órdenes hoy, activas, completadas, canceladas, negocios activos, repartidores online, clientes totales, ingresos hoy/mes), horas pico, top 5 negocios, top 5 repartidores, top 5 clientes, actividad reciente |
| `/admin/usuarios` | CRUD usuarios: tabla con búsqueda, filtro por rol, cambiar rol, cambiar estado (activo/inactivo/suspendido) |
| `/admin/negocios` | Lista de negocios con búsqueda y filtros (todos/pendientes/verificados/suspendidos) |
| `/admin/negocios/crear` | Formulario para crear nuevo negocio manualmente |
| `/admin/negocios/[id]` | Detalle del negocio, info general |
| `/admin/negocios/[id]/editar` | Editar datos del negocio |
| `/admin/negocios/[id]/productos` | Ver productos del negocio |
| `/admin/negocios/[id]/pedidos` | Ver pedidos del negocio |
| `/admin/negocios/[id]/usuarios` | Usuarios asociados al negocio |
| `/admin/repartidores` | Lista de repartidores con búsqueda, filtros, verificar/suspender |
| `/admin/repartidores/[id]` | Detalle del repartidor |
| `/admin/pedidos` | Todos los pedidos del sistema con búsqueda y filtro por estado |
| `/admin/pedidos/crear` | Crear domicilio manual (delivery_only) |
| `/admin/solicitudes` | Solicitudes pendientes de repartidores y negocios (aprobar/rechazar) |
| `/admin/soporte` | Tickets de soporte (ver, responder, cambiar estado) |
| `/admin/mapa` | Mapa en vivo (placeholder gris) |
| `/admin/finanzas` | Configuración de comisiones (global/categoría/negocio), transacciones, pagos masivos, export CSV |
| `/admin/cobertura` | Gestión de ciudades, zonas, tarifas de envío |
| `/admin/promociones` | Cupones (CRUD), referidos (stats), puntos fidelización (stats), recompensas (CRUD) |
| `/admin/reportes` | Dashboard de reportes con gráficos y analytics |
| `/admin/resenas` | Moderación de reseñas y reportes de reseñas |
| `/admin/auditoria` | Auditoría: log de acciones de administradores con filtros |
| `/admin/seguridad` | Seguridad: sesiones activas, historial de acceso |
| `/admin/configuracion` | Configuración general del sistema |
| `/admin/wallets` | Vista de billeteras de usuarios |

**Funcionalidades clave:**
- `adminService.getDashboardStats()` — KPIs agregados
- `adminService.getUsers()` / `updateUserRole()` / `updateUserStatus()` — Gestión usuarios
- `adminService.getBusinesses()` / `updateBusinessStatus()` / `verifyBusiness()` — Gestión negocios
- `adminService.getCouriers()` / `verifyCourier()` / `updateCourierStatus()` — Gestión repartidores
- `adminService.getOrders()` / `updateOrderStatusAdmin()` — Gestión pedidos
- `adminService.getFinanceSummary()` / `commissionService.*` — Finanzas
- Creación de domicilios manuales (`order_type='manual_delivery'`)
- Aprobación/rechazo de `courier_applications` y `business_applications`
- Respuesta a `support_tickets`
- Sistema de roles admin: `super_admin`, `admin_general`, `admin_comercial`, `admin_operativo`, `admin_financiero`, `admin_soporte`
- Auditoría via `auditService.log()` y `admin_audit_log` table

---

### Cliente

**Qué puede hacer:**
- Ver marketplace de negocios cercanos
- Buscar productos y categorías
- Agregar productos al carrito y comprar
- Gestionar perfil, direcciones, métodos de pago
- Ver historial de pedidos con detalle y tracking
- Usar cupones de descuento
- Programa de fidelización (puntos)
- Wallet (billetera virtual)
- Referidos
- Favoritos (negocios y productos)
- Solicitar ser repartidor (llenar formulario)
- Solicitar registrar negocio (llenar formulario)
- Ver estado de solicitudes
- Soporte (crear tickets, ver conversaciones)
- Configuración (notificaciones, seguridad, cuenta)

**Rutas disponibles:**

| Ruta | Descripción |
|------|-------------|
| `/cliente` | Home: HeroSearch con geolocalización + selector de ciudad, scroll de categorías, promociones, más pedidos, cerca de ti, farmacias, supermercados, destacados |
| `/cliente/business/[slug]` | Detalle de negocio: menú, productos con precios, reseñas, agregar al carrito |
| `/cliente/categories` | Todas las categorías del marketplace |
| `/cliente/search` | Búsqueda global (negocios + productos) |
| `/cliente/cart` | Carrito de compras con items, cantidades, subtotal |
| `/cliente/checkout` | Checkout: dirección entrega, items, cupón, resumen, confirmar pedido |
| `/cliente/pedidos` | Historial de pedidos |
| `/cliente/pedidos/[id]` | Detalle de pedido: items, tracking, mapa (placeholder), timeline |
| `/cliente/perfil` | Editar perfil (nombre, email, teléfono, avatar) |
| `/cliente/direcciones` | CRUD de direcciones de entrega |
| `/cliente/metodos-pago` | CRUD de métodos de pago guardados |
| `/cliente/favoritos` | Negocios y productos favoritos |
| `/cliente/cupones` | Cupones disponibles y usados |
| `/cliente/fidelizacion` | Programa de lealtad: puntos, nivel, canje de recompensas |
| `/cliente/referidos` | Código de referido, stats, invitar amigos |
| `/cliente/wallet` | Billetera virtual: saldo, transacciones |
| `/cliente/notificaciones` | Historial de notificaciones |
| `/cliente/configuracion` | Configuración de notificaciones y preferencias |
| `/cliente/soporte` | Crear y ver tickets de soporte |
| `/cliente/solicitudes` | Estado de solicitudes a repartidor/negocio |
| `/cliente/solicitudes/repartidor` | Formulario para solicitar ser repartidor |
| `/cliente/solicitudes/negocio` | Formulario para solicitar registrar negocio |

**Funcionalidades clave:**
- `marketplaceService.*` — Categorías, negocios, productos, búsqueda
- `cartContext` — Carrito con persistencia localStorage
- `orderService.createOrder()` / `getCustomerOrders()` — Pedidos
- `clientService.*` — Perfil, direcciones, métodos de pago, favoritos, cupones, fidelización, referidos, wallet, notificaciones, settings
- `couponService.validate()` — Validación de cupones en checkout
- Soporte via tabla `support_tickets`
- Solicitudes via `courier_applications` / `business_applications`

---

### Negocio/Local

**Qué puede hacer:**
- Dashboard con KPIs del negocio
- Gestionar productos (CRUD con imágenes, categorías, inventario, variantes)
- Gestionar categorías de productos
- Ver pedidos de productos entrantes con Kanban de estados
- Aceptar/rechazar pedidos y cambiar estado (preparando, listo)
- Ver domicilios salidos del local
- Gestionar clientes habituales
- Reportes y analytics (export CSV)
- Reseñas (ver y responder)
- Mapa en vivo (placeholder)
- Configuración (horarios, zonas de cobertura, métodos de pago, imágenes)

**Rutas disponibles:**

| Ruta | Descripción |
|------|-------------|
| `/negocio` | Dashboard: ingresos (hoy/semana/mes), pedidos activos, entregados/cancelados, ticket promedio, tiempo preparación, top productos, clientes nuevos/frecuentes, rating, comisiones, ganancia neta |
| `/negocio/pedidos` | Pedidos del negocio con cambio de estado (confirmar, preparando, listo) |
| `/negocio/productos` | CRUD de productos (nombre, descripción, precio, categoría, imagen, inventario, tiempo preparación) |
| `/negocio/clientes` | Lista de clientes con ordenes, total gastado, última compra, rating promedio |
| `/negocio/reportes` | Reportes: ventas diarias, top productos, horas pico. Export CSV |
| `/negocio/resenas` | Reseñas de clientes, responder reseñas |
| `/negocio/mapa` | Mapa en vivo (placeholder) |
| `/negocio/configuracion` | Configuración del negocio: perfil, horarios, cobertura, métodos de pago, imágenes |

**Funcionalidades clave:**
- `businessService.getDashboardStats()` — KPIs del negocio
- `businessService.getProducts()` / `createProduct()` / `updateProduct()` / `deleteProduct()` / `duplicateProduct()` — CRUD productos
- `businessService.getBusinessOrders()` — Pedidos del negocio
- `businessService.getCustomers()` — Clientes
- `businessService.getReport()` — Reportes
- `reviewService.getBusinessReviews()` / `respondToReview()` — Reseñas
- `reviewService.getBusinessStats()` — Stats de reseñas

---

### Repartidor/Domiciliario

**Qué puede hacer:**
- Dashboard con ganancias (hoy/semana/mes/año/todo) y nivel (Novato→Élite)
- Ver pedidos disponibles (no asignados) en su zona
- Aceptar pedidos
- Gestionar pedido activo (recogido → en tránsito → entregado)
- Chat con cliente y con negocio
- Navegación a destino (origen y destino en mapa)
- Perfil Pro: datos personales, licencia, vehículo, documentos
- Ver ganancias detalladas con gráficos, export CSV
- Solicitar retiros de ganancias
- Reportar incidentes
- Toggle disponibilidad (online/offline)
- Configuración (notificaciones, preferencias)
- AI Readiness: predicción de demanda, zonas calientes

**Rutas disponibles:**

| Ruta | Descripción |
|------|-------------|
| `/repartidor` | Dashboard: pedidos disponibles, pedido activo, toggle disponibilidad, ganancias rápido, nivel |
| `/repartidor/pedidos` | Lista de pedidos asignados y disponibles |
| `/repartidor/ganancias` | Ganancias con filtros por período, gráficos, stats, export CSV, botón solicitar retiro |
| `/repartidor/perfil` | Perfil Pro: datos personales, licencia, vehículo (tipo, placa, modelo), documentos |
| `/repartidor/mapa` | Mapa en vivo (placeholder) con ubicación |
| `/repartidor/chat` | Chat con clientes durante entregas activas |
| `/repartidor/notificaciones` | Notificaciones del repartidor |
| `/repartidor/configuracion` | Configuración de notificaciones y preferencias |

**Funcionalidades clave:**
- `courierProService.getEarningsBreakdown()` — Ganancias por período
- `courierProService.getEarningsHistory()` — Historial de ganancias
- `courierProService.getActiveOrderDetail()` — Detalle del pedido activo
- `courierProService.updateCourierStatus()` — Toggle disponible/offline
- `courierProService.updateVehicle()` / `updateDocuments()` — Perfil Pro
- `courierProService.getAIReadiness()` — Predicciones IA (mock)
- `orderService.getAvailableOrders()` — Pedidos disponibles
- `orderService.assignCourier()` / `updateStatus()` — Aceptar y actualizar pedido
- `chatService.*` — Chat con cliente
- `trackingService.startSharingLocation()` — Compartir ubicación GPS
- Sistema de niveles: Novato (0), Bronce (10), Plata (50), Oro (150), Platino (350), Diamante (600), Élite (1000) entregas

---

## 3. Tipos de Pedidos

### Domicilio Manual (`order_type = 'manual_delivery'`)

| Propiedad | Valor |
|-----------|-------|
| Creado por | Admin (desde `/admin/pedidos/crear`) |
| Incluye productos | NO |
| Es servicio de entrega | Sí |
| Código | `DOMI-YYYYMMDD-HHMMSS-XXXX` |
| metadata | `source='admin_manual'`, `has_products=false`, `delivery_only=true` |
| Valor productos para local | N/A (el local NO recibe valor) |
| División | 80% repartidor, 20% DomiU |
| Campos adicionales | `pickup_address`, `pickup_lat`, `pickup_lng`, `customer_phone`, `delivery_distance_km`, `courier_earnings`, `platform_earnings` |

**Flujo:**
1. Admin va a `/admin/pedidos/crear`
2. Llena formulario: datos del cliente (nombre, teléfono, dirección de entrega), origen (dirección de recogida), distancia, valor total
3. Sistema calcula: `courier_earnings = total * 0.8`, `platform_earnings = total * 0.2`
4. Se crea order con `order_type='manual_delivery'`
5. Repartidores ven el pedido disponible y lo aceptan
6. Estados: pendiente → asignado → aceptado → recogido → en_transito → entregado → cancelado

### Pedido de Producto (`order_type = 'product_order'`)

| Propiedad | Valor |
|-----------|-------|
| Creado por | Cliente (desde checkout) |
| Incluye productos | Sí, con cantidades y precios |
| Es servicio de entrega | Sí (incluye delivery_fee) |
| Código | `ORD-YYYYMMDD-NNNNN` |
| metadata | `source='customer_checkout'`, `has_products=true`, `delivery_only=false` |
| Valor productos para local | Sí (recibe subtotal - comisión) |
| Repartidor recibe | `delivery_fee` |
| División | Local recibe valor productos, Repartidor recibe domicilio, DomiU recibe comisión del local |

**Flujo:**
1. Cliente agrega productos al carrito
2. Va a checkout, aplica cupón (opcional), selecciona dirección
3. Confirma pedido → `orderService.createOrder()`
4. Estados: pendiente → confirmado (negocio acepta) → preparando → listo → asignado (repartidor) → en_transito → entregado → cancelado
5. Trigger `auto_create_commission()` calcula comisión al entregar

---

## 4. División de Dinero

| Tipo de Pedido | Local/ Negocio | Repartidor | DomiU (Plataforma) |
|----------------|----------------|------------|-------------------|
| **Domicilio Manual** | N/A (no participa) | 80% del total | 20% del total |
| **Pedido Producto** | Recibe subtotal - comisión | Recibe delivery_fee | Recibe comisión (configurable: global/categoría/negocio) |

**Comisiones (Pedido Producto):**
- Configuración jerárquica en `commission_config`:
  1. Por negocio (si existe)
  2. Por categoría (si existe)
  3. Global (default)
- Trigger `auto_create_commission()` ejecuta `calculate_commission()` al entregar
- Comisión se registra en `commission_transactions`

---

## 5. Flujo de Solicitudes

### Solicitud de Repartidor

1. Cliente navega a `/cliente/solicitudes/repartidor`
2. Llena formulario completo con:
   - Datos personales: nombre completo, documento, fecha nacimiento, teléfono, WhatsApp, ciudad, dirección
   - Vehículo: tipo, marca, modelo, color, placa
   - Documentos: foto documento, licencia, SOAT, tecnomecánica, foto vehículo, foto perfil
   - Datos de pago: método, número de cuenta
   - Contacto emergencia: nombre, teléfono
   - Aceptación de términos y privacidad
3. Se inserta en `courier_applications` con `status='pending'`
4. Trigger `notify_admin_courier_application` notifica a admins
5. Admin ve solicitud en `/admin/solicitudes`
6. Admin puede:
   - **Aprobar:** → cambia `role` del profile a `'courier'`, crea registro en `drivers`, `status='active'`
   - **Rechazar:** → `status='rejected'`, guarda `admin_notes`
7. Usuario recibe notificación del resultado

### Solicitud de Negocio

1. Cliente navega a `/cliente/solicitudes/negocio`
2. Llena formulario con:
   - Datos del negocio: nombre, tipo, categoría, descripción, teléfono, WhatsApp, email
   - Ubicación: ciudad, dirección, coordenadas
   - Horarios, métodos de pago
   - Imágenes: logo, banner
   - Documento: RUT
   - Datos del propietario: nombre, documento
   - Configuración: tiempo preparación, delivery/pickup, zonas de cobertura
   - Aceptación de términos, privacidad y comisión
3. Se inserta en `business_applications` con `status='pending'`
4. Trigger `notify_admin_business_application` notifica a admins
5. Admin ve solicitud en `/admin/solicitudes`
6. Admin puede:
   - **Aprobar:** → cambia `role` del profile a `'merchant'`, crea negocio en `businesses`, dirección, horarios
   - **Rechazar:** → `status='rejected'`, guarda `admin_notes`
7. Usuario recibe notificación del resultado

---

## 6. Sistema de Soporte

**Tabla:** `support_tickets`

| Columna | Descripción |
|---------|-------------|
| `id` | UUID primary key |
| `user_id` | Creador del ticket (FK profiles) |
| `role` | Rol del usuario al crear (customer/merchant/courier) |
| `order_id` | Orden relacionada (opcional) |
| `business_id` | Negocio relacionado (opcional) |
| `courier_id` | Repartidor relacionado (opcional) |
| `ticket_type` | Tipo de problema |
| `priority` | `low`, `normal`, `high`, `urgent` |
| `subject` | Asunto |
| `description` | Descripción del problema |
| `status` | `open` → `in_review` → `resolved` / `rejected` → `closed` |
| `attachments` | JSONB array de URLs |
| `admin_response` | Respuesta del admin |
| `internal_notes` | Notas internas del admin |
| `resolved_at` | Fecha de resolución |

**Flujo:**
1. Usuario crea ticket desde `/cliente/soporte` (u otras rutas por rol)
2. Ticket queda `open`
3. Admin ve en `/admin/soporte`, puede cambiar estado y responder
4. Usuario ve estado actualizado desde `/soporte`
5. Se puede cerrar el ticket cuando está resuelto

---

## 7. Documentos e Imágenes

### Buckets de Storage

| Bucket | Visibilidad | Uso |
|--------|-------------|-----|
| `courier-documents` | Privado | Documentos del repartidor (licencia, SOAT, fotos) — solo admin ve |
| `business-logos` | Público | Logos de negocios |
| `business-banners` | Público | Banners de negocios |
| `product-images` | Público | Imágenes de productos |
| `user-avatars` | Público | Avatares de usuarios |
| `promotions` | Público | Imágenes promocionales |

**Funcionalidad:**
- `storageService.upload()` — Subir archivo a bucket con nombre único
- `storageService.replace()` — Reemplazar archivo (delete + upload)
- `storageService.delete()` — Eliminar archivo
- `storageService.list()` — Listar archivos en bucket
- Las imágenes públicas se sirven directamente desde Supabase Storage
- Los documentos privados (`courier-documents`) requieren autenticación admin para acceso

---

## 8. Registro y Autenticación

**Flujo de registro:**
1. Usuario llena formulario en `/register` (nombre, email, password)
2. `AuthContext.register()` → `supabase.auth.signUp()` crea usuario en auth.users
3. POST a `/api/profile` con service_role crea perfil en `profiles`
4. Triggers automáticos: `create_wallet_for_user()` (customer/courier), `create_notification_preferences()`, `auto_create_referral_code()`
5. Usuario recibe email de confirmación (configurable en Supabase Dashboard)
6. Tras confirmar email, puede iniciar sesión

**Roles por defecto:**
- Todos se registran como `customer`
- Para ser repartidor: solicitar desde `/cliente/solicitudes/repartidor`
- Para ser negocio: solicitar desde `/cliente/solicitudes/negocio`
- Admin solo puede ser creado desde Supabase Dashboard o script (`create:super-admin`)

**Redirección post-login:**
| Rol | Redirige a |
|-----|-----------|
| `customer` | `/cliente` |
| `merchant` / `business` | `/negocio` |
| `courier` | `/repartidor` |
| `admin` (cualquier subrol) | `/admin` |

**Subroles de Admin:**
| Subrol | Permisos |
|--------|----------|
| `super_admin` | Acceso total (`*`) |
| `admin_general` | CRUD usuarios, negocios, couriers, órdenes, wallets, reportes, settings, auditoría, seguridad |
| `admin_comercial` | Lectura/escritura negocios, lectura couriers, lectura órdenes, reportes |
| `admin_operativo` | Lectura/escritura couriers y órdenes, lectura negocios |
| `admin_financiero` | Lectura/escritura wallets, lectura órdenes y reportes, lectura negocios |
| `admin_soporte` | Lectura usuarios, negocios, couriers, órdenes, auditoría |

---

## 9. Tablas Principales

| Tabla | Descripción | Columnas clave |
|-------|-------------|----------------|
| `profiles` | Perfiles de usuario extendidos de auth.users | `id`, `role`, `email`, `first_name`, `last_name`, `phone`, `status`, `avatar_url`, `admin_role`, `verified_at` |
| `businesses` | Negocios/restaurantes registrados | `id`, `owner_id`, `name`, `slug`, `cuisine_type`, `rating`, `is_verified`, `is_active`, `city_id`, `zone_id` |
| `products` | Productos/items del menú | `id`, `business_id`, `category_id`, `name`, `price`, `discount_price`, `status`, `quantity_available`, `preparation_time_minutes` |
| `categories` | Categorías de productos por negocio | `id`, `business_id`, `name`, `slug`, `display_order`, `is_active` |
| `orders` | Pedidos del sistema | `id`, `order_number`, `order_code`, `customer_id`, `business_id`, `courier_id`, `status`, `order_type`, `subtotal`, `delivery_fee`, `total_amount`, `metadata` |
| `order_items` | Items dentro de cada pedido | `id`, `order_id`, `product_id`, `quantity`, `unit_price`, `item_total` |
| `order_tracking` | Historial de cambios de estado | `id`, `order_id`, `status`, `notes`, `created_at` |
| `drivers` | Perfiles extendidos de repartidores | `id` (FK profiles), `license_number`, `vehicle_type`, `vehicle_plate`, `status`, `is_verified`, `is_available`, `total_deliveries`, `rating` |
| `driver_locations` | Ubicación GPS de repartidores en tiempo real | `id`, `driver_id`, `order_id`, `latitude`, `longitude`, `heading`, `speed` |
| `driver_earnings` | Ganancias de repartidor por pedido | `id`, `driver_id`, `order_id`, `base_amount`, `bonus_amount`, `total_earned`, `status` |
| `courier_applications` | Solicitudes para ser repartidor | `id`, `user_id`, `status`, `full_name`, `document_id`, `vehicle_type`, documentos varios |
| `business_applications` | Solicitudes para registrar negocio | `id`, `user_id`, `status`, `business_name`, `business_type`, `category`, `rut_url`, `owner_name` |
| `support_tickets` | Tickets de soporte | `id`, `user_id`, `role`, `status` (open→in_review→resolved/rejected→closed), `ticket_type`, `priority`, `admin_response` |
| `wallets` | Billeteras virtuales por usuario | `id`, `user_id`, `balance`, `currency`, `total_credited`, `total_debited` |
| `wallet_transactions` | Transacciones de billetera | `id`, `wallet_id`, `transaction_type` (credit/debit/refund/bonus/adjustment), `amount`, `balance_before`, `balance_after`, `status` |
| `notifications` | Notificaciones del sistema | `id`, `recipient_id`, `notification_type`, `title`, `message`, `is_read`, `order_id` |
| `addresses` | Direcciones de usuarios | `id`, `user_id`, `type` (home/work/other), `street_address`, `city`, `latitude`, `longitude`, `is_primary` |
| `ratings` | Calificaciones y reseñas | `id`, `order_id`, `rater_id`, `rated_entity_id`, `rating_type` (merchant/courier/order), `rating`, `review`, `response` |
| `cities` | Ciudades con coordenadas | `id`, `name`, `slug`, `department`, `is_active`, `latitude`, `longitude` |
| `zones` | Zonas por ciudad | `id`, `city_id`, `name`, `is_active`, `delivery_estimate` |
| `delivery_rates` | Tarifas de envío | `id`, `city_id`, `zone_id`, `base_rate`, `rate_per_km`, `min_order_amount`, `free_delivery_min` |
| `commission_config` | Configuración de comisiones | `id`, `type` (global/category/business), `rate`, `is_active` |
| `commission_transactions` | Comisiones generadas por pedido | `id`, `order_id`, `business_id`, `commission_rate`, `commission_amount`, `status` |
| `coupons` | Cupones de descuento | `id`, `code`, `type` (percentage/fixed/free_shipping), `value`, `usage_limit`, `per_user_limit`, `is_active` |
| `referrals` | Códigos de referido | `id`, `referrer_id`, `code`, `referred_id`, `status` (pending/converted/expired) |
| `loyalty_points` | Puntos de fidelidad | `id`, `user_id`, `points`, `reason`, `reference_type` |
| `rewards` | Catálogo de recompensas canjeables | `id`, `title`, `points_required`, `type`, `value`, `stock` |
| `withdrawal_requests` | Solicitudes de retiro de repartidores | `id`, `courier_id`, `amount`, `payment_method`, `status` (pending/approved/rejected/completed) |
| `chats` | Conversaciones 1:1 | `id`, `participant_1_id`, `participant_2_id`, `order_id`, `last_message_at` |
| `messages` | Mensajes individuales | `id`, `chat_id`, `sender_id`, `receiver_id`, `content`, `message_type`, `is_read` |
| `admin_audit_log` | Log de auditoría de admins | `id`, `admin_id`, `action`, `entity_type`, `entity_id`, `details`, `result`, `browser`, `device`, `os` |
| `review_reports` | Reportes de reseñas | `id`, `review_id`, `reporter_id`, `reason`, `status` |

---

## 10. Rutas Completas

### Públicas

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/` | `page.tsx` | Landing page pública: hero, categorías, destacados, stats, testimonios, CTA |
| `/login` | `login/page.tsx` | Inicio de sesión email+password |
| `/register` | `register/page.tsx` | Registro de nuevo usuario |
| `/forgot-password` | `forgot-password/page.tsx` | Recuperar contraseña |
| `/auth/reset-password` | `auth/reset-password/page.tsx` | Cambiar contraseña (desde email) |
| `/privacidad` | `privacidad/page.tsx` | Política de privacidad |
| `/terminos` | `terminos/page.tsx` | Términos y condiciones |
| `/soporte` | `soporte/page.tsx` | Soporte (usuario autenticado) |

### Cliente

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/cliente` | `cliente/page.tsx` | Home del cliente con marketplace |
| `/cliente/business/[slug]` | `cliente/business/[slug]/page.tsx` | Detalle de negocio |
| `/cliente/cart` | `cliente/cart/page.tsx` | Carrito de compras |
| `/cliente/categories` | `cliente/categories/page.tsx` | Categorías |
| `/cliente/checkout` | `cliente/checkout/page.tsx` | Checkout |
| `/cliente/favoritos` | `cliente/favoritos/page.tsx` | Favoritos |
| `/cliente/pedidos` | `cliente/pedidos/page.tsx` | Historial de pedidos |
| `/cliente/pedidos/[id]` | `cliente/pedidos/[id]/page.tsx` | Detalle de pedido |
| `/cliente/perfil` | `cliente/perfil/page.tsx` | Perfil de usuario |
| `/cliente/search` | `cliente/search/page.tsx` | Búsqueda |
| `/cliente/direcciones` | `cliente/direcciones/page.tsx` | Direcciones |
| `/cliente/metodos-pago` | `cliente/metodos-pago/page.tsx` | Métodos de pago |
| `/cliente/cupones` | `cliente/cupones/page.tsx` | Cupones |
| `/cliente/fidelizacion` | `cliente/fidelizacion/page.tsx` | Fidelización |
| `/cliente/referidos` | `cliente/referidos/page.tsx` | Referidos |
| `/cliente/wallet` | `cliente/wallet/page.tsx` | Billetera |
| `/cliente/notificaciones` | `cliente/notificaciones/page.tsx` | Notificaciones |
| `/cliente/configuracion` | `cliente/configuracion/page.tsx` | Configuración |
| `/cliente/soporte` | `cliente/soporte/page.tsx` | Soporte |
| `/cliente/solicitudes` | `cliente/solicitudes/page.tsx` | Estado de solicitudes |
| `/cliente/solicitudes/repartidor` | `cliente/solicitudes/repartidor/page.tsx` | Solicitar ser repartidor |
| `/cliente/solicitudes/negocio` | `cliente/solicitudes/negocio/page.tsx` | Solicitar registrar negocio |

### Negocio

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/negocio` | `negocio/page.tsx` | Dashboard del negocio |
| `/negocio/pedidos` | `negocio/pedidos/page.tsx` | Gestión de pedidos |
| `/negocio/productos` | `negocio/productos/page.tsx` | CRUD de productos |
| `/negocio/clientes` | `negocio/clientes/page.tsx` | Lista de clientes |
| `/negocio/reportes` | `negocio/reportes/page.tsx` | Reportes y analytics |
| `/negocio/resenas` | `negocio/resenas/page.tsx` | Reseñas y respuestas |
| `/negocio/mapa` | `negocio/mapa/page.tsx` | Mapa en vivo |
| `/negocio/configuracion` | `negocio/configuracion/page.tsx` | Configuración del negocio |

### Repartidor

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/repartidor` | `repartidor/page.tsx` | Dashboard del repartidor |
| `/repartidor/pedidos` | `repartidor/pedidos/page.tsx` | Pedidos disponibles y activos |
| `/repartidor/ganancias` | `repartidor/ganancias/page.tsx` | Ganancias y retiros |
| `/repartidor/perfil` | `repartidor/perfil/page.tsx` | Perfil Pro (datos, licencia, vehículo) |
| `/repartidor/mapa` | `repartidor/mapa/page.tsx` | Mapa en vivo |
| `/repartidor/chat` | `repartidor/chat/page.tsx` | Chat con clientes |
| `/repartidor/notificaciones` | `repartidor/notificaciones/page.tsx` | Notificaciones |
| `/repartidor/configuracion` | `repartidor/configuracion/page.tsx` | Configuración |

### Admin

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/admin` | `admin/page.tsx` | Dashboard general |
| `/admin/usuarios` | `admin/usuarios/page.tsx` | Gestión de usuarios |
| `/admin/negocios` | `admin/negocios/page.tsx` | Lista de negocios |
| `/admin/negocios/crear` | `admin/negocios/crear/page.tsx` | Crear negocio |
| `/admin/negocios/[id]` | `admin/negocios/[id]/page.tsx` | Detalle del negocio |
| `/admin/negocios/[id]/editar` | `admin/negocios/[id]/editar/page.tsx` | Editar negocio |
| `/admin/negocios/[id]/productos` | `admin/negocios/[id]/productos/page.tsx` | Productos del negocio |
| `/admin/negocios/[id]/pedidos` | `admin/negocios/[id]/pedidos/page.tsx` | Pedidos del negocio |
| `/admin/negocios/[id]/usuarios` | `admin/negocios/[id]/usuarios/page.tsx` | Usuarios del negocio |
| `/admin/locales` | `admin/locales/page.tsx` | Lista de locales (alias de negocios) |
| `/admin/locales/nuevo` | `admin/locales/nuevo/page.tsx` | Nuevo local |
| `/admin/locales/[id]` | `admin/locales/[id]/page.tsx` | Detalle del local |
| `/admin/locales/[id]/editar` | `admin/locales/[id]/editar/page.tsx` | Editar local |
| `/admin/locales/[id]/menu` | `admin/locales/[id]/menu/page.tsx` | Menú del local |
| `/admin/locales/[id]/pedidos` | `admin/locales/[id]/pedidos/page.tsx` | Pedidos del local |
| `/admin/locales/[id]/usuarios` | `admin/locales/[id]/usuarios/page.tsx` | Usuarios del local |
| `/admin/repartidores` | `admin/repartidores/page.tsx` | Lista de repartidores |
| `/admin/repartidores/[id]` | `admin/repartidores/[id]/page.tsx` | Detalle del repartidor |
| `/admin/pedidos` | `admin/pedidos/page.tsx` | Todos los pedidos |
| `/admin/pedidos/crear` | `admin/pedidos/crear/page.tsx` | Crear domicilio manual |
| `/admin/solicitudes` | `admin/solicitudes/page.tsx` | Solicitudes pendientes |
| `/admin/soporte` | `admin/soporte/page.tsx` | Tickets de soporte |
| `/admin/mapa` | `admin/mapa/page.tsx` | Mapa en vivo |
| `/admin/finanzas` | `admin/finanzas/page.tsx` | Finanzas y comisiones |
| `/admin/cobertura` | `admin/cobertura/page.tsx` | Ciudades, zonas, tarifas |
| `/admin/promociones` | `admin/promociones/page.tsx` | Cupones, referidos, puntos |
| `/admin/reportes` | `admin/reportes/page.tsx` | Reportes y analytics |
| `/admin/resenas` | `admin/resenas/page.tsx` | Moderación de reseñas |
| `/admin/auditoria` | `admin/auditoria/page.tsx` | Log de auditoría |
| `/admin/seguridad` | `admin/seguridad/page.tsx` | Seguridad y sesiones |
| `/admin/configuracion` | `admin/configuracion/page.tsx` | Configuración general |
| `/admin/wallets` | `admin/wallets/page.tsx` | Billeteras de usuarios |

### Compartidas

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/notificaciones` | `notificaciones/page.tsx` | Historial de notificaciones (todos los roles) |
| `/api/profile` | `api/profile/route.ts` | API route (GET, POST, PATCH) |
| `/api/health` | `api/health/route.ts` | Health check |
| `/api/debug` | `api/debug/route.ts` | Debug info |

---

## 11. Botones y Acciones Principales

### Generales

| Botón/Acción | Ubicación | Qué hace |
|-------------|-----------|----------|
| Iniciar Sesión | `/login` | Autentica usuario con email+password, redirige según rol |
| Registrarse | `/register` | Crea cuenta, envía email de confirmación |
| Cerrar Sesión | Header (todos) | `signOut()`, redirige a `/login` |
| Recuperar Contraseña | `/forgot-password` | Envía email con enlace de restablecimiento |
| Notificaciones 🔔 | Header (todos) | Muestra dropdown con últimas notificaciones, marca como leídas |

### Cliente

| Botón/Acción | Ubicación | Qué hace |
|-------------|-----------|----------|
| Agregar al Carrito | Detalle negocio | Agrega producto al carrito (CartContext) |
| Ver Carrito | Header / Cart | Va a `/cliente/cart` |
| Proceder al Checkout | Carrito | Va a `/cliente/checkout` |
| Confirmar Pedido | Checkout | Crea orden via `orderService.createOrder()`, limpia carrito |
| Aplicar Cupón | Checkout | Valida cupón via `couponService.validate()`, aplica descuento |
| Cancelar Pedido | Detalle pedido | Cambia estado a `cancelled` (si está pendiente) |
| Calificar | Detalle pedido (entregado) | Modal de rating para negocio y repartidor |
| Agregar Favorito ♥ | Detalle negocio/producto | Toggle favorite via `clientService.toggleFavorite()` |
| Solicitar ser Repartidor | `/cliente/solicitudes/repartidor` | Crea `courier_applications` |
| Solicitar Registrar Negocio | `/cliente/solicitudes/negocio` | Crea `business_applications` |
| Enviar Ticket Soporte | `/cliente/soporte` | Crea `support_tickets` |
| Canjear Puntos | `/cliente/fidelizacion` | Canjea puntos por recompensa via `loyaltyService.redeem()` |

### Negocio

| Botón/Acción | Ubicación | Qué hace |
|-------------|-----------|----------|
| Aceptar Pedido | Pedidos | Cambia estado a `confirmed` |
| Marcar Preparando | Pedidos | Cambia estado a `preparing` |
| Marcar Listo | Pedidos | Cambia estado a `ready` |
| Agregar Producto | Productos | Crea nuevo producto via `businessService.createProduct()` |
| Editar Producto | Productos | Actualiza producto |
| Eliminar Producto | Productos | Soft delete (status=discontinued) |
| Responder Reseña | Reseñas | Responde a reseña de cliente |
| Exportar CSV | Reportes | Descarga reporte de ventas en CSV |
| Guardar Configuración | Configuración | Actualiza datos del negocio |

### Repartidor

| Botón/Acción | Ubicación | Qué hace |
|-------------|-----------|----------|
| Disponible/No Disponible | Dashboard | Toggle `courierProService.updateCourierStatus()` |
| Aceptar Pedido | Dashboard/Pedidos | `orderService.assignCourier()` + estado `assigned` |
| Marcar Recogido | Pedido activo | Cambia estado a `picked_up` |
| Marcar En Tránsito | Pedido activo | Cambia estado a `in_transit`, inicia compartir ubicación |
| Marcar Entregado | Pedido activo | Cambia estado a `delivered`, detiene ubicación |
| Iniciar Chat | Pedido activo | Abre chat con cliente |
| Enviar Mensaje Rápido | Chat | Envía respuesta predefinida |
| Solicitar Retiro | Ganancias | Crea `withdrawal_request` |
| Guardar Perfil | Perfil | Actualiza datos personales, licencia, vehículo |
| Reportar Incidente | Perfil/Pedido | Crea `courier_incident` |

### Admin

| Botón/Acción | Ubicación | Qué hace |
|-------------|-----------|----------|
| Cambiar Rol Usuario | Usuarios | `adminService.updateUserRole()` |
| Activar/Suspender Usuario | Usuarios | `adminService.updateUserStatus()` |
| Verificar Negocio | Negocios | `adminService.verifyBusiness()` |
| Activar/Suspender Negocio | Negocios | `adminService.updateBusinessStatus()` |
| Verificar Repartidor | Repartidores | `adminService.verifyCourier()` |
| Activar/Suspender Repartidor | Repartidores | `adminService.updateCourierStatus()` |
| Crear Domicilio Manual | Pedidos/Crear | Crea order_type='manual_delivery' |
| Aprobar Solicitud | Solicitudes | Aprueba courier_applications o business_applications |
| Rechazar Solicitud | Solicitudes | Rechaza con motivo |
| Responder Ticket | Soporte | Responde support_ticket, cambia estado |
| Crear Cupón | Promociones | Crea nuevo cupón |
| Configurar Comisión | Finanzas | Crea/actualiza commission_config |
| Cobrar Comisiones | Finanzas | Marca commission_transactions como collected |
| Aprobar Pago | Finanzas | Aprueba business_payout |
| Agregar Ciudad | Cobertura | Crea nueva ciudad con coordenadas |
| Agregar Zona | Cobertura | Crea nueva zona por ciudad |
| Configurar Tarifa | Cobertura | Crea/actualiza delivery_rates |
| Exportar CSV | Finanzas/Reportes | Descarga reportes en CSV |

---

## 12. Lo que Falta / Pendiente

### Estado Actual: ~70% del core funcional implementado

| Módulo | Estado | Detalle |
|--------|--------|---------|
| **Mapa en vivo** | 🟡 Placeholder | `TrackingMap` muestra mosaico gris sin integración Google Maps/Mapbox |
| **Notificaciones push nativas** | 🟡 Infraestructura lista | Tablas (device_tokens, templates) existen, pero falta integración FCM/APNs |
| **Pagos reales** | ❌ No integrado | Sin pasarela de pagos (Nequi, Wompi, Stripe). Solo wallet virtual y efectivo |
| **Storage buckets** | ❌ No creados | Los 6 buckets deben crearse manualmente en Supabase Dashboard |
| **Tests automatizados** | ❌ Vacío | Carpeta `tests/` tiene archivos placeholder, sin tests reales |
| **RLS en profiles** | 🟡 Workaround inseguro | Migración deshabilita RLS en profiles como workaround |
| **Analytics real** | 🟡 Condicional | GA4 y Meta Pixel implementados pero sin configuración real (GA_ID puede estar vacío) |
| **Mapa en cliente/negocio/repartidor** | 🟡 Placeholder | Las 3 rutas de mapa muestran placeholder gris |
| **PWA** | ❌ No implementado | Sin Service Worker, manifest, modo offline |
| **Internacionalización (i18n)** | ❌ Solo español | Sin soporte multi-idioma |
| **Modo oscuro** | ❌ No implementado | Sin tema oscuro |
| **CI/CD** | ❌ No configurado | Sin pipeline de integración/despliegue continuo |
| **Monitoreo** | ❌ No implementado | Sin Sentry, LogRocket o similar |
| **Rate limiting** | ❌ No implementado | Sin protección contra abuso en API routes |
| **Onboarding** | ❌ No implementado | Sin tutorial interactivo para nuevos usuarios |
| **Background location** | ❌ No implementado | Sin modo repartidor en segundo plano |
| **Chat WebSocket nativo** | 🟡 Usa polling | Usa Supabase Realtime, no WebSocket nativo |
| **Documentación API externa** | ❌ No iniciado | Sin docs para integraciones de terceros |
| **Feature flags** | ❌ No implementado | Sin sistema de feature flags |
| **CMS para landing page** | ❌ No implementado | Contenido estático hardcodeado |

### Mejoras futuras planificadas:

1. **v1.1** — Pasarela de pagos real, Storage buckets, Despliegue producción, Seguridad RLS, Monitoreo
2. **v1.2** — Mapas reales (Google Maps), Notificaciones push nativas, Tests, Rate limiting, Caché (React Query/SWR)
3. **v1.3–v1.5** — PWA, Modo oscuro, i18n, Onboarding, Fidelización avanzada, Gráficos reales (Recharts)
4. **v1.6–v2.0** — Cashback, Panel analytics avanzado, Dashboard repartidor con mapa, Reportes avanzados

---

*Documento generado el 26 Junio 2026. Basado en el código fuente de DomiU App 1.0.*
