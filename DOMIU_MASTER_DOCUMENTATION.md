# DomiU App 1.0 — Documentación Maestra

---

# 1. RESUMEN GENERAL

## Nombre del proyecto
**DomiU App 1.0** — Plataforma de delivery multi-rol (clientes, restaurantes/negocios, repartidores, administradores).

## Stack tecnológico
| Capa | Tecnología |
|------|-----------|
| **Framework** | Next.js 16.2.9 (React 19.2.4) |
| **Lenguaje** | TypeScript 5.x |
| **Estilos** | Tailwind CSS 4.x + Radix UI + clsx/tailwind-merge |
| **Base de datos** | Supabase (PostgreSQL 15+ con PostGIS) |
| **Autenticación** | Supabase Auth (email/password) |
| **Almacenamiento** | Supabase Storage (6 buckets) |
| **ORM/Cliente DB** | `@supabase/supabase-js` v2 + `@supabase/ssr` v0.12 |
| **Iconos** | Lucide React v1.18 |
| **Linter** | ESLint 9.x (configuración `eslint-config-next` con TypeScript) |
| **Formatter** | Prettier 3.8.x |
| **Analytics** | Google Analytics 4 (gtag) + Meta Pixel (fbq) |

## Arquitectura
- **Frontend**: React Server Components + Client Components (modelo App Router de Next.js 16)
- **Backend**: API Routes de Next.js (`/api/profile`); Server Actions (`/actions/`)
- **Base de Datos**: Supabase con service_role para bypass de RLS desde el servidor
- **Seguridad**: RLS a nivel de fila en Supabase; sesión manejada via `@supabase/ssr`; token Bearer para API routes
- **Estado Global**: React Context (Auth, Cart, Chat, Courier, Orders, Tracking)
- **Persistencia local**: localStorage (carrito, ciudad seleccionada)
- **Tiempo real**: Supabase Realtime (subscriptions vía `channel()`)
- **Despliegue**: Vercel (proyecto configurado con `vercel.json`)

## Frameworks y patrones
- **Next.js App Router**: Layouts anidados, `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- **shadcn/ui**: Componentes base generados con `shadcn` CLI (configurado en `components.json`)
- **Singleton pattern**: Clientes Supabase (browser y service) inicializados una sola vez
- **Service layer**: Todos los servicios en `/services/` con patrón async getClient()
- **Context + useCallback + useMemo**: Para rendimiento con React Compiler

## Estado general del proyecto
- **Estado**: ✅ Funcional — Compila sin errores (0 TS errors, 0 lint errors)
- **Build**: 43 rutas generadas (42 estáticas, 1 dinámica + 1 API route)
- **Cobertura de roles**: admin, merchant, customer, courier
- **Completitud**: ~70% del core funcional implementado; módulos avanzados (pagos reales, notificaciones push nativas, mapas en vivo) pendientes
- **Migraciones DB**: 19 archivos SQL, ~2,015 líneas

---

# 2. ESTRUCTURA DEL PROYECTO

```
DomiU App 1.0/
├── .env.local                          # Variables de entorno (Supabase URL, keys)
├── .gitignore
├── .prettierignore
├── .prettierrc.json
├── .vercel/                            # Configuración de despliegue Vercel
├── AGENTS.md                           # Instrucciones para agentes IA
├── CLAUDE.md                           # Instrucciones para Claude
├── components.json                     # Configuración de shadcn/ui
├── eslint.config.mjs                   # ESLint 9 flat config
├── next-env.d.ts                       # Tipos auto-generados de Next.js
├── next.config.ts                      # Configuración Next.js (images remote patterns)
├── package.json                        # Dependencias y scripts
├── package-lock.json
├── postcss.config.mjs                  # PostCSS → Tailwind
├── proxy.ts                            # Proxy de desarrollo (opcional)
├── public/
│   ├── icons/                          # Favicons e íconos de la app
│   └── images/                         # Imágenes estáticas
├── README.md
├── scripts/                            # Scripts auxiliares
├── src/                                # Código fuente
│   ├── app/                            # App Router (páginas, layouts, acciones, API)
│   ├── assets/                         # Placeholder para assets (vacío)
│   ├── components/                     # Componentes React
│   ├── config/                         # Placeholder para configuración (vacío)
│   ├── constants/                      # Placeholder para constantes (vacío)
│   ├── contexts/                       # React Context providers
│   ├── features/                       # Placeholder para módulos feature (14 dirs vacíos)
│   ├── hooks/                          # Custom hooks
│   ├── lib/                            # Librerías, utilidades, auth, db
│   ├── server/                         # Placeholder para lógica server (vacío)
│   ├── services/                       # Servicios de negocio
│   ├── stores/                         # Placeholder para stores (vacío)
│   ├── styles/                         # Placeholder para estilos extra (vacío)
│   ├── types/                          # TypeScript type definitions
│   └── utils/                          # Placeholder para utilidades (vacío)
├── supabase/
│   ├── README.md                       # Instrucciones de setup Supabase
│   ├── DATABASE_DESIGN.md              # Diseño de base de datos
│   ├── DATABASE_DIAGRAM.md             # Diagrama visual
│   ├── MIGRATION_SUMMARY.sql           # Meta-resumen de migraciones
│   ├── examples_and_queries.sql        # 39 queries de ejemplo
│   └── migrations/                     # Migraciones SQL secuenciales
├── tests/                              # Tests (vacíos)
├── tsconfig.json                       # TypeScript config (path alias @/*)
└── vercel.json                         # Config Vercel deployment
```

## Propósito de cada directorio raíz en `src/`

| Directorio | Propósito |
|-----------|-----------|
| `src/app/` | **App Router**: Contiene todas las rutas, layouts, server actions, API routes. Organizado por secciones: `(auth)`, `(admin)`, `(courier)`, `(customer)`, `(merchant)` (estos son grupos de rutas), `admin/`, `cliente/`, `negocio/`, `repartidor/`, más rutas sueltas (`/login`, `/register`, etc.) |
| `src/components/` | **Componentes React**: UI primitives (`ui/`), componentes de dominio (`delivery/`, `marketplace/`, `chat/`, `notifications/`, `tracking/`, etc.) |
| `src/services/` | **Servicios**: Lógica de negocio que interactúa con Supabase. Cada archivo es un módulo con funciones exportadas. |
| `src/contexts/` | **Context Providers**: AuthContext, CartContext, ChatContext, CourierContext, OrderContext, TrackingContext |
| `src/hooks/` | **Custom Hooks**: `useAuthProtection` |
| `src/lib/` | **Librerías**: `db/supabase.ts` (clientes DB), `auth/supabase.ts` (auth service class), `auth/permissions.ts` (sistema de permisos), `analytics.ts`, `assets.ts`, `storage.ts`, `utils.ts` |
| `src/types/` | **TypeScript types**: `auth.ts` (tipos de autenticación, roles, permisos), `database.ts` (~764 líneas, tipos para todas las tablas y enums) |
| `src/features/` | **Placeholder**: 14 directorios vacíos para futura migración a feature-based architecture |
| `public/` | **Archivos estáticos**: `icons/`, `images/` |

---

# 3. FUNCIONALIDADES IMPLEMENTADAS

## Autenticación (`src/contexts/AuthContext.tsx` + `src/lib/auth/`)
- [x] **Login** — email + password con Supabase Auth ✅
- [x] **Registro** — Creación de cuenta + perfil via API route con service_role ✅
- [x] **Recuperar contraseña** — `resetPasswordForEmail` con redirect ✅
- [x] **Cerrar sesión** — `signOut()` ✅
- [x] **Protección de rutas** — Redirección por rol (`/cliente`, `/negocio`, `/repartidor`, `/admin`) ✅
- [x] **Actualizar perfil** — PATCH via API route ✅
- [x] **Reenviar verificación de email** ✅
- [x] **Sistema de permisos** — `PermissionManager` con roles y rutas protegidas ✅

## Marketplace (`src/services/marketplace.ts` + `src/components/marketplace/`)
- [x] **Home (Landing)** — Hero, categorías, negocios destacados, recomendados, features ❌ (Pendiente: datos reales vs mock) ✅
- [x] **Página principal del cliente** — HeroSearch con geolocalización + selector de ciudad, categorías, secciones dinámicas ✅
- [x] **Categorías** — Scroll horizontal + grid, mapeo cuisine_type → icono ✅
- [x] **Búsqueda** — Search con ilike en businesses y products ✅
- [x] **Productos** — Listado por negocio, prices con descuento ✅
- [x] **Filtro por ciudad/zona** — `cityId` y `zoneId` en `getBusinesses()` + HeroSearch con city picker ✅

## Pedidos (`src/services/orders.ts` + `src/app/actions/orders.ts`)
- [x] **Crear pedido** — Via server action con service_role ✅
- [x] **Listar pedidos** — Por cliente, negocio, repartidor ✅
- [x] **Actualizar estado** — `pending → confirmed → preparing → ready → assigned → picked_up → in_transit → delivered → cancelled` ✅
- [x] **Aceptar/Rechazar pedido** — `acceptOrder()` / `rejectOrder()` ✅
- [x] **Asignar repartidor** — `assignCourier()` ✅
- [x] **Tracking de estado** — `order_tracking` table, timeline UI ✅
- [x] **Suscripción Realtime** — Actualización de pedidos en vivo ✅
- [x] **Número de orden auto-generado** — `DOM-{timestamp}-{random}` ✅

## Carrito de Compras (`src/contexts/CartContext.tsx`)
- [x] **Agregar producto** — Validación de mismo negocio ✅
- [x] **Eliminar producto** ✅
- [x] **Actualizar cantidad** ✅
- [x] **Persistencia localStorage** ✅
- [x] **Cálculo subtotal** (reactivo) ✅
- [x] **Badge en header** con itemCount ✅

## Cliente (`src/app/cliente/`)
- [x] **Home** — Hero + categorías + secciones dinámicas ✅
- [x] **Buscar negocios** — Página de búsqueda ✅
- [x] **Perfil** — Editar datos personales ✅
- [x] **Pedidos** — Historial y detalle ✅
- [x] **Carrito** — Página de carrito ✅
- [x] **Checkout** — Confirmación + cupón + dirección ✅
- [x] **Favoritos** — Lista de favoritos ✅
- [x] **Detalle de negocio** — Menú, productos, reseñas ✅
- [x] **Categorías** — Página de categorías ✅
- [x] **Notificaciones** — Bell + historial completo ✅

## Negocio / Merchant (`src/app/negocio/`)
- [x] **Dashboard** — Stats, pedidos recientes ✅
- [x] **Productos** — CRUD de productos y categorías ✅
- [x] **Pedidos** — Lista + detalle + cambio de estado ✅
- [x] **Clientes** — Lista de clientes ✅
- [x] **Reportes** — Export CSV ✅
- [x] **Reseñas** — Ver y responder ✅
- [x] **Configuración** — Perfil del negocio ✅

## Repartidor / Courier (`src/app/repartidor/`)
- [x] **Home / Dashboard** — Pedidos disponibles, activos, toggle disponibilidad ✅
- [x] **Pedidos** — Lista + aceptar + actualizar estado ✅
- [x] **Ganancias** — Filtros por período + export CSV + stats ✅
- [x] **Perfil** — Datos personales, licencia, vehículo ✅

## Administrador (`src/app/admin/`)
- [x] **Dashboard** — KPIs, horas pico, top negocios, repartidores, clientes ✅
- [x] **Usuarios** — CRUD con roles, búsqueda ✅
- [x] **Negocios** — CRUD ✅
- [x] **Repartidores** — CRUD ✅
- [x] **Pedidos** — Vista general ✅
- [x] **Finanzas** — Config comisiones, transacciones, pagos masivos, export CSV ✅
- [x] **Promociones** — Cupones (CRUD), referidos stats, puntos fidelización, recompensas ✅
- [x] **Cobertura** — Ciudades, zonas, tarifas de envío ✅
- [x] **Reportes** — Dashboard de reportes ✅
- [x] **Reseñas** — Moderación ✅
- [x] **Configuración** — General ✅
- [x] **Wallets** — Vista de wallets ✅

## Chat (`src/services/chat.ts` + `src/contexts/ChatContext.tsx`)
- [x] **Conversaciones 1:1** — Customer ↔ Courier ✅
- [x] **Grupo** — Grupo chat negocio+cliente+repartidor (tablas `group_chats`, `group_messages`, `group_chat_members`) ✅
- [x] **Mensajes en tiempo real** — Subscripción Realtime ✅
- [x] **Quick replies** — 5 respuestas predefinidas ✅
- [x] **Mark as read** — Función `mark_messages_as_read` ✅

## GPS / Tracking (`src/services/tracking.ts` + `src/contexts/TrackingContext.tsx`)
- [x] **Compartir ubicación** — GeoWatch + Supabase upsert periódico ✅
- [x] **Distancia y ETA** — Cálculo haversine ✅
- [x] **Tracking en vivo** — Subscripción a `driver_locations` ✅
- [x] **Progreso de entrega** — Timeline visual ✅
- [x] **Mapa (placeholder)** — Componente `TrackingMap` (mosaico gris, sin librería de mapas real) 🟡

## Wallet (`src/types/database.ts` + migración `07_wallets`)
- [x] **Billetera por usuario** — Auto-creada al registrar ✅
- [x] **Transacciones** — Crédito, débito, reembolso, bono, ajuste ✅
- [x] **Función atómica** — `add_wallet_transaction()` con balance locking ✅
- [x] **Vista admin** — `/admin/wallets` ✅

## Notificaciones (`src/services/notifications.ts` + migraciones 09 y 16)
- [x] **Notificaciones push** — Tabla de notificaciones + templates + preferencias + device_tokens ✅
- [x] **Triggers automáticos** — `notify_new_order`, `notify_order_status_change`, `notify_new_message`, `notify_new_registration` ✅
- [x] **Badge + dropdown** — `NotificationBell` con iconos por tipo ✅
- [x] **Historial completo** — `/notificaciones` ✅
- [x] **Marcar leídas** — Individual y masivo ✅
- [x] **Preferencias por usuario** — Email, SMS, push, in-app, horario silencioso ✅
- [x] **Suscripción Realtime** — Nuevas notificaciones en vivo ✅

## Comisiones y Monetización (`src/services/commission.ts` + migración)
- [x] **Configuración de comisiones** — Global, por categoría, por negocio ✅
- [x] **Cálculo automático** — `calculate_commission()` con jerarquía ✅
- [x] **Trigger auto al entregar** — `auto_create_commission()` en `status = 'delivered'` ✅
- [x] **Pagos a negocios** — Solicitud, aprobación, pago masivo ✅
- [x] **Vista admin finanzas** — Configuración, transacciones, pagos ✅

## Cupones, Referidos y Fidelización (`src/services/coupons.ts`, `referrals.ts`)
- [x] **Cupones** — Porcentaje, fijo, envío gratis; validación multi-regla ✅
- [x] **Aplicación en checkout** — Validación en vivo, descuento calculado, registro de uso ✅
- [x] **Código de referido** — Auto-generado en trigger, stats ✅
- [x] **Puntos de fidelidad** — Emisión, canje, expiración ✅
- [x] **Recompensas** — Catálogo + canje de puntos ✅
- [x] **Vista admin promociones** — Cupones, referidos, puntos, recompensas ✅

## Cobertura Multi-ciudad (`src/services/coverage.ts` + migración)
- [x] **Ciudades** — CRUD con lat/lng ✅
- [x] **Zonas** — CRUD por ciudad con tiempo estimado ✅
- [x] **Tarifas de envío** — Base + $/km + envío gratis ✅
- [x] **Detección por coordenadas** — Haversine distance ✅
- [x] **Selector de ciudad en cliente** — HeroSearch con geolocalización + localStorage ✅
- [x] **Filtro de marketplace** — `cityId`/`zoneId` en queries ✅
- [x] **Vista admin cobertura** — 3 tabs (ciudades, zonas, tarifas) ✅

## Reseñas y Ratings (`src/services/reviews.ts` + migración `10_ratings`)
- [x] **Calificar negocio/repartidor/producto** — ratings 1.0-5.0 ✅
- [x] **Recálculo automático** — Triggers `recalculate_business/driver/product_rating()` ✅
- [x] **Comentarios** — `rating_comments` con respuestas ✅
- [x] **Reacciones** — `helpful` / `unhelpful` ✅
- [x] **Reportar reseña** — `review_reports` table ✅
- [x] **Moderación admin** ✅

## Analytics (`src/lib/analytics.ts`)
- [x] **Google Analytics 4** — Page view + eventos personalizados (condicional a GA_ID) 🟡
- [x] **Meta Pixel** — Eventos fbq trackCustom 🟡
- [x] **Eventos tracking** — Registro, login, orden creada, cambio estado, carrito, negocio creado, delivery ✅

## Reportes y Export (`src/services/reports.ts`)
- [x] **Export CSV ventas** — Filtro por días ✅
- [x] **Export CSV comisiones** ✅
- [x] **Export CSV ganancias repartidor** ✅

## Storage (`src/lib/storage.ts`)
- [x] **Subir archivo** — Upload a bucket con nombre único ✅
- [x] **Reemplazar archivo** — Delete + upload ✅
- [x] **Eliminar archivo** ✅
- [x] **Listar archivos** ✅
- [x] **URL pública** ✅
- [ ] **Buckets en Supabase** — Pendiente de crear manualmente (6 buckets documentados) ❌

---

# 4. BASE DE DATOS

## Extensiones
- `uuid-ossp` — Generación de UUIDs
- `pgcrypto` — Funciones criptográficas
- `postgis` — Soporte geoespacial (GEOGRAPHY type)

## Enums (15)
`user_role`, `user_status`, `order_status`, `payment_status`, `payment_method`, `rating_type`, `product_status`, `address_type`, `driver_status`, `vehicle_type`, `transaction_type`, `wallet_transaction_status`, `message_type`, `notification_type`, `notification_channel`

## Tablas (45 total)

### Migraciones 01–11 (31 tablas base)
| # | Tabla | Propósito |
|---|-------|-----------|
| 1 | `roles` | Roles del sistema (admin, merchant, customer, courier) |
| 2 | `profiles` | Perfiles de usuario (vinculados a auth.users) |
| 3 | `businesses` | Negocios/restaurantes registrados |
| 4 | `business_hours` | Horarios de atención por día de semana |
| 5 | `categories` | Categorías de productos por negocio |
| 6 | `products` | Productos/items del menú |
| 7 | `product_images` | Imágenes de productos |
| 8 | `product_variants` | Variantes (tamaño, color, etc.) |
| 9 | `addresses` | Direcciones de usuarios |
| 10 | `business_addresses` | Direcciones de negocios (con PostGIS) |
| 11 | `orders` | Pedidos (estados, totales, asignaciones) |
| 12 | `order_items` | Items de cada pedido |
| 13 | `order_tracking` | Historial de cambios de estado |
| 14 | `drivers` | Perfiles de repartidores (extension de profiles) |
| 15 | `driver_locations` | Ubicación GPS de repartidores (histórico, máx 1000) |
| 16 | `driver_availability` | Disponibilidad semanal |
| 17 | `driver_earnings` | Ganancias por pedido |
| 18 | `wallets` | Billeteras virtuales por usuario |
| 19 | `wallet_transactions` | Transacciones de wallet |
| 20 | `wallet_topups` | Recargas de wallet |
| 21 | `chats` | Conversaciones 1:1 |
| 22 | `messages` | Mensajes individuales |
| 23 | `group_chats` | Chats grupales (por pedido) |
| 24 | `group_chat_members` | Miembros de chat grupal |
| 25 | `group_messages` | Mensajes grupales |
| 26 | `notifications` | Notificaciones del sistema |
| 27 | `notification_preferences` | Preferencias de notificación |
| 28 | `notification_templates` | Templates de notificaciones |
| 29 | `device_tokens` | Tokens de dispositivos (push) |
| 30 | `ratings` | Calificaciones y reseñas |
| 31 | `rating_comments` | Comentarios en reseñas |
| — | `rating_reactions` | Reacciones (útil/no útil) |

### Migraciones Fase 16–23 (14 tablas adicionales)
| # | Tabla | Propósito |
|---|-------|-----------|
| 32 | `cities` | Ciudades con coordenadas |
| 33 | `zones` | Zonas por ciudad |
| 34 | `delivery_rates` | Tarifas de envío |
| 35 | `commission_config` | Configuración de comisiones |
| 36 | `commission_transactions` | Comisiones generadas |
| 37 | `business_payouts` | Pagos a negocios |
| 38 | `coupons` | Cupones de descuento |
| 39 | `coupon_usage` | Uso de cupones |
| 40 | `referrals` | Códigos de referido |
| 41 | `loyalty_points` | Puntos de fidelidad |
| 42 | `rewards` | Catálogo de recompensas |
| 43 | `reward_redemptions` | Canjes de recompensas |
| 44 | `review_reports` | Reportes de reseñas |

### Columnas agregadas a tablas existentes
- `businesses`: +`city_id`, +`zone_id`, +`latitude`, +`longitude`
- `drivers`: +`city_id`, +`zone_id`

## Relaciones Clave
- `profiles.id` → `auth.users.id` (CASCADE)
- `businesses.owner_id` → `profiles.id`
- `orders.customer_id` → `profiles.id`
- `orders.business_id` → `businesses.id`
- `orders.courier_id` → `profiles.id` (SET NULL)
- `drivers.id` → `profiles.id` (CASCADE)
- `wallets.user_id` → `profiles.id` (UNIQUE)
- Todas las tablas de negocio referencian a `businesses.id` con CASCADE o RESTRICT

## Funciones SQL (23)
- `update_updated_at_column()` — Trigger que actualiza `updated_at`
- `update_address_location()` — Convierte lat/lng a PostGIS GEOGRAPHY
- `generate_order_number()` — Genera ORD-YYYYMMDD-NNNNN
- `auto_generate_order_number()` — Trigger BEFORE INSERT on orders
- `log_order_status_change()` — Trigger AFTER UPDATE on orders
- `cleanup_old_driver_locations()` — Mantiene solo 1000 ubicaciones/repartidor
- `create_wallet_for_user()` — Trigger AFTER INSERT on profiles
- `add_wallet_transaction()` — Transacción atómica de wallet
- `update_chat_last_message()` — Trigger AFTER INSERT on messages
- `mark_messages_as_read()` — Marca mensajes como leídos
- `mark_notification_as_read()` — Marca notificación como leída
- `create_notification()` — Crea registro de notificación
- `create_notification_preferences()` — Auto-crea preferencias al registrar
- `recalculate_business_rating()` — Recalcula rating promedio
- `recalculate_driver_rating()` — Recalcula rating de repartidor
- `recalculate_product_rating()` — Recalcula rating de producto
- `trigger_recalculate_rating()` — Dispatcher por rating_type
- `update_order_rating()` — Actualiza rating en orders
- `public.is_admin()` — SECURITY DEFINER (evita recursión RLS)
- `calculate_commission()` — Cálculo jerárquico de comisión
- `auto_create_commission()` — Trigger al entregar pedido
- `auto_create_referral_code()` — Genera código único al crear perfil
- `notify_new_order()`, `notify_order_status_change()`, `notify_new_message()`, `notify_new_registration()` — Triggers de notificaciones

## Triggers (44+)
Triggers BEFORE/AFTER INSERT/UPDATE en todas las tablas principales para:
- Actualizar `updated_at` automáticamente
- Crear wallet al registrar
- Crear preferencias de notificación al registrar
- Generar número de orden
- Loggear cambios de estado
- Recalcular ratings
- Calcular comisiones
- Crear código de referido
- Notificar eventos

## RLS Policies (~45+)
RLS habilitado en las 45 tablas. Políticas principales:
- `profiles`: usuarios leen propio perfil; admins leen todos (via `is_admin()` SECURITY DEFINER)
- `businesses`: lectura pública (activos); CRUD para owner/admin
- `orders`: cliente ←→ negocio ←→ repartidor según roles
- `wallets`: solo el dueño ve su wallet
- `notifications`: solo el destinatario
- `cities/zones/delivery_rates`: lectura pública, admin escribe
- `coupons`: admin gestiona, usuario lee activos
- Comisiones y pagos: admin gestiona, negocio ve lo suyo

## Storage Buckets (6, deben crearse manualmente)
1. `business-logos` — Logos de negocios
2. `business-banners` — Banners de negocios
3. `product-images` — Fotos de productos
4. `avatars` — Fotos de perfil
5. `promotions` — Imágenes promocionales
6. `categories` — Imágenes de categorías

## Realtime
- Suscripciones a cambios en `orders`, `driver_locations`, `messages`, `notifications`, `assignment_requests`
- Usado por los contexts `CourierContext`, `OrderContext`, `ChatContext`, `TrackingContext`, `NotificationBell`

---

# 5. RUTAS

## Páginas públicas (no requieren autenticación)
| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/` | `src/app/page.tsx` | Landing page: hero, categorías hardcodeadas, featured, recomendados, features, stats, testimonios, CTA |
| `/login` | `src/app/login/page.tsx` | Login con email/contraseña, toggle show password, validación, redirección post-login |
| `/register` | `src/app/register/page.tsx` | Registro multi-rol (cliente, negocio, repartidor), formulario con nombre, email, contraseña |
| `/forgot-password` | `src/app/forgot-password/page.tsx` | Solicitud de restablecimiento de contraseña |
| `/auth/reset-password` | `src/app/auth/reset-password/page.tsx` | Formulario para nueva contraseña (llegada desde email) |
| `/privacidad` | `src/app/privacidad/page.tsx` | Política de privacidad |
| `/terminos` | `src/app/terminos/page.tsx` | Términos y condiciones |

## Cliente (`/cliente/*`) — Requiere rol: `customer`
| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/cliente` | `src/app/cliente/page.tsx` | Home: HeroSearch con ciudad, categorías, promos, más pedidos, cerca de ti, farmacias, supermercados, destacados |
| `/cliente/business/[slug]` | `src/app/cliente/business/[slug]/page.tsx` | Detalle de negocio: menú, productos, reseñas, agregar al carrito |
| `/cliente/cart` | `src/app/cliente/cart/page.tsx` | Carrito de compras |
| `/cliente/categories` | `src/app/cliente/categories/page.tsx` | Todas las categorías |
| `/cliente/checkout` | `src/app/cliente/checkout/page.tsx` | Checkout: dirección, items, cupón, resumen, confirmar |
| `/cliente/favoritos` | `src/app/cliente/favoritos/page.tsx` | Negocios favoritos |
| `/cliente/pedidos` | `src/app/cliente/pedidos/page.tsx` | Historial de pedidos |
| `/cliente/pedidos/[id]` | `src/app/cliente/pedidos/[id]/page.tsx` | Detalle de pedido + tracking |
| `/cliente/perfil` | `src/app/cliente/perfil/page.tsx` | Editar perfil |
| `/cliente/search` | `src/app/cliente/search/page.tsx` | Resultados de búsqueda |

## Negocio (`/negocio/*`) — Requiere rol: `merchant`
| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/negocio` | `src/app/negocio/page.tsx` | Dashboard: stats, pedidos recientes |
| `/negocio/clientes` | `src/app/negocio/clientes/page.tsx` | Lista de clientes |
| `/negocio/configuracion` | `src/app/negocio/configuracion/page.tsx` | Configuración del negocio |
| `/negocio/pedidos` | `src/app/negocio/pedidos/page.tsx` | Gestión de pedidos |
| `/negocio/productos` | `src/app/negocio/productos/page.tsx` | CRUD de productos |
| `/negocio/reportes` | `src/app/negocio/reportes/page.tsx` | Reportes y export CSV |
| `/negocio/resenas` | `src/app/negocio/resenas/page.tsx` | Reseñas de clientes |

## Repartidor (`/repartidor/*`) — Requiere rol: `courier`
| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/repartidor` | `src/app/repartidor/page.tsx` | Dashboard: pedidos disponibles, activos, toggle disponibilidad |
| `/repartidor/pedidos` | `src/app/repartidor/pedidos/page.tsx` | Lista de pedidos |
| `/repartidor/ganancias` | `src/app/repartidor/ganancias/page.tsx` | Ganancias con filtros y export CSV |
| `/repartidor/perfil` | `src/app/repartidor/perfil/page.tsx` | Perfil del repartidor |

## Admin (`/admin/*`) — Requiere rol: `admin`
| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/admin` | `src/app/admin/page.tsx` | Dashboard: KPIs, horas pico, top 5 (negocios, repartidores, clientes) |
| `/admin/cobertura` | `src/app/admin/cobertura/page.tsx` | Gestión de ciudades, zonas, tarifas de envío |
| `/admin/configuracion` | `src/app/admin/configuracion/page.tsx` | Configuración general |
| `/admin/finanzas` | `src/app/admin/finanzas/page.tsx` | Comisiones, transacciones, pagos masivos, export CSV |
| `/admin/negocios` | `src/app/admin/negocios/page.tsx` | CRUD de negocios |
| `/admin/pedidos` | `src/app/admin/pedidos/page.tsx` | Vista general de pedidos |
| `/admin/promociones` | `src/app/admin/promociones/page.tsx` | Cupones, referidos, puntos, recompensas |
| `/admin/repartidores` | `src/app/admin/repartidores/page.tsx` | CRUD de repartidores |
| `/admin/reportes` | `src/app/admin/reportes/page.tsx` | Dashboard de reportes |
| `/admin/resenas` | `src/app/admin/resenas/page.tsx` | Moderación de reseñas |
| `/admin/usuarios` | `src/app/admin/usuarios/page.tsx` | CRUD de usuarios |
| `/admin/wallets` | `src/app/admin/wallets/page.tsx` | Vistas de wallets |

## Compartidas / Generales
| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/notificaciones` | `src/app/notificaciones/page.tsx` | Historial completo de notificaciones (todos los roles) |
| `/api/profile` | `src/app/api/profile/route.ts` | API route: GET (perfil), POST (crear), PATCH (actualizar) |

## Routes groups (layout wrappers, sin ruta directa)
| Grupo | Layout | Propósito |
|-------|--------|-----------|
| `(auth)` | — | Placeholder para layouts de autenticación |
| `(admin)` | — | Placeholder para layouts admin |
| `(courier)` | — | Placeholder para layouts repartidor |
| `(customer)` | — | Placeholder para layouts cliente |
| `(merchant)` | — | Placeholder para layouts negocio |

## Páginas: 43 totales (según build de Next.js)
```
/                        /admin/wallets          /cliente/perfil
/_not-found              /auth/reset-password    /cliente/search
/admin                   /cliente                /forgot-password
/admin/cobertura         /cliente/business/[slug]/login
/admin/configuracion     /cliente/cart           /negocio
/admin/finanzas          /cliente/categories     /negocio/clientes
/admin/negocios          /cliente/checkout       /negocio/configuracion
/admin/pedidos           /cliente/favoritos      /negocio/pedidos
/admin/promociones       /cliente/pedidos        /negocio/productos
/admin/repartidores      /cliente/pedidos/[id]   /negocio/reportes
/admin/reportes          /negocio/resenas
/admin/resenas           /notificaciones
/admin/usuarios          /privacidad
                         /register
                         /repartidor
                         /repartidor/ganancias
                         /repartidor/pedidos
                         /repartidor/perfil
                         /terminos
```

---

# 6. COMPONENTES

## UI Primitives (`src/components/ui/`)
| Componente | Archivo | Propósito |
|-----------|---------|-----------|
| `Alert` | `alert.tsx` | Alertas con variantes |
| `AppHeader` | `app-header.tsx` | Header sticky con menú de usuario, notificaciones, logo |
| `AppSidebar` | `app-sidebar.tsx` | Sidebar de navegación (admin y negocio) |
| `Avatar` | `avatar.tsx` | Avatar circular con iniciales |
| `Badge` | `badge.tsx` | Etiqueta con variantes (default, secondary, destructive, info) |
| `BottomNavigation` | `bottom-navigation.tsx` | Navegación inferior móvil (cliente, repartidor) |
| `Button` | `button.tsx` | Botón con variantes y tamaños |
| `Card` | `card.tsx` | Contenedor tipo card |
| `DashboardCard` | `dashboard-card.tsx` | Card con título + acción opcional |
| `Drawer` | `drawer.tsx` | Drawer lateral |
| `Dropdown` | `dropdown.tsx` | Menú desplegable |
| `EmptyState` | `empty-state.tsx` | Estado vacío con icono y mensaje |
| `Footer` | `footer.tsx` | Footer global |
| `Input` | `input.tsx` | Input de texto |
| `LoadingState` | `loading-state.tsx` | Spinner de carga |
| `Modal` | `modal.tsx` | Modal/diálogo |
| `PageContainer` | `page-container.tsx` | Contenedor de página con max-width |
| `PageTitle` | `page-title.tsx` | Título + descripción de página |
| `Placeholders` | `placeholders.tsx` | Skeleton placeholders |
| `SearchInput` | `search-input.tsx` | Input de búsqueda |
| `Select` | `select.tsx` | Select desplegable |
| `Skeleton` | `skeleton.tsx` | Skeleton loading |
| `StatCard` | `stat-card.tsx` | Card de estadística (icono, label, valor) |
| `Tabs` | `tabs.tsx` | Tabs de navegación |
| `Textarea` | `textarea.tsx` | Área de texto |
| `Toast` | `toast.tsx` | Notificación tipo toast |

## Delivery / Negocio
| Componente | Archivo | Propósito |
|-----------|---------|-----------|
| `BusinessCard` | `delivery/business-card.tsx` | Card de negocio con logo, rating, tiempo, precio |
| `CategoryCard` | `delivery/category-card.tsx` | Card de categoría |
| `DriverCard` | `delivery/driver-card.tsx` | Card de repartidor |
| `DriverStatsCard` | `delivery/DriverStatsCard.tsx` | Stats de repartidor |
| `AssignmentCard` | `delivery/AssignmentCard.tsx` | Card de asignación |
| `DeliveryStatusTimeline` | `delivery/DeliveryStatusTimeline.tsx` | Timeline de estado de entrega |
| `OrderCard` | `delivery/order-card.tsx` | Card de pedido |
| `ProductCard` | `delivery/product-card.tsx` | Card de producto |
| `TrackingCard` | `delivery/tracking-card.tsx` | Card de tracking |

## Marketplace
| Componente | Archivo | Propósito |
|-----------|---------|-----------|
| `HeroSearch` | `marketplace/hero-search.tsx` | Hero con buscador, geolocalización, selector de ciudad |
| `CategoryScroll` | `marketplace/category-scroll.tsx` | Scroll horizontal de categorías |
| `BusinessSection` | `marketplace/business-section.tsx` | Sección de negocios con scroll horizontal |

## Chat
| Componente | Archivo | Propósito |
|-----------|---------|-----------|
| `ChatWindow` | `chat/ChatWindow.tsx` | Ventana de chat completa |
| `ConversationHeader` | `chat/ConversationHeader.tsx` | Cabecera de conversación |
| `MessageBubble` | `chat/MessageBubble.tsx` | Burbuja de mensaje individual |
| `MessageInput` | `chat/MessageInput.tsx` | Input de mensaje con envío |
| `QuickReplies` | `chat/QuickReplies.tsx` | Respuestas rápidas predefinidas |

## Tracking / Mapa
| Componente | Archivo | Propósito |
|-----------|---------|-----------|
| `DeliveryProgress` | `tracking/DeliveryProgress.tsx` | Barra de progreso de entrega |
| `EtaCard` | `tracking/EtaCard.tsx` | Card con ETA estimado |
| `TrackingMap` | `tracking/TrackingMap.tsx` | Mapa (placeholder, mosaico gris) |

## Notificaciones
| Componente | Archivo | Propósito |
|-----------|---------|-----------|
| `NotificationBell` | `notifications/NotificationBell.tsx` | Campana con badge, dropdown, mark read |

## Dashboard / Analytics
| Componente | Archivo | Propósito |
|-----------|---------|-----------|
| `ActivityCard` | `dashboard/activity-card.tsx` | Card de actividad reciente |
| `ChartCard` | `dashboard/chart-card.tsx` | Card con gráfico CSS |
| `DataTable` | `dashboard/data-table.tsx` | Tabla de datos |
| `KPICard` | `dashboard/kpi-card.tsx` | Card KPI |
| `RevenueCard` | `dashboard/revenue-card.tsx` | Card de ingresos |
| `StatsCard` | `dashboard/stats-card.tsx` | Card de estadísticas |

## Auth / Providers
| Componente | Archivo | Propósito |
|-----------|---------|-----------|
| `ProtectedRoute` | `auth/ProtectedRoute.tsx` | Ruta protegida por rol |
| `RootProviders` | `providers/RootProviders.tsx` | Provider raíz (Auth + Cart) |

## Otros
| Componente | Archivo | Propósito |
|-----------|---------|-----------|
| `GoogleAnalytics` | `GoogleAnalytics.tsx` | Scripts GA4 (condicional a GA_ID) |
| `ReviewModal` | `reviews/ReviewModal.tsx` | Modal para crear reseña |
| `StorageManager` | `storage/storage-manager.tsx` | Gestor de archivos en storage |
| `NegocioOrderCard` | `orders/negocio-order-card.tsx` | Card de pedido para vista negocio |
| `OrderTimeline` | `orders/OrderTimeline.tsx` | Timeline de estados del pedido |

---

# 7. CONTEXTS

## AuthContext (`src/contexts/AuthContext.tsx`)
**Estado**: `user`, `profile`, `isAuthenticated`, `isLoading`, `error`
**Métodos**: `login()`, `register()`, `logout()`, `resetPassword()`, `updateProfile()`, `resendVerificationEmail()`
**Relaciones**: Usado por toda la app. Depende de `SupabaseAuthService` (lib/auth/supabase.ts). Carga el perfil via API route `/api/profile` para evitar RLS. Se suscribe a `onAuthStateChange`.

## CartContext (`src/contexts/CartContext.tsx`)
**Estado**: `items[]`, `businessId`, `businessName`, `itemCount`, `subtotal`, `isEmpty`
**Métodos**: `addItem()`, `removeItem()`, `updateQuantity()`, `clearCart()`
**Persistencia**: `localStorage` con clave `domiu-cart`
**Relaciones**: Usado en layout cliente (badge), checkout, página carrito. Provee `itemCount` al header.

## ChatContext (`src/contexts/ChatContext.tsx`)
**Estado**: `conversations[]`, `currentMessages[]`, `currentConversation`, `unreadTotal`, `loading`
**Métodos**: `openConversation()`, `closeConversation()`, `sendMessage()`, `markAsRead()`
**Relaciones**: Depende de `chatService`. Requiere `userId` y `userRole`. Se suscribe a Realtime para mensajes nuevos.

## CourierContext (`src/contexts/CourierContext.tsx`)
**Estado**: `courier`, `availableOrders[]`, `activeDeliveries[]`, `deliveryHistory[]`, `earnings[]`, `isAvailable`, `pendingRequests[]`, varios earnings calculados
**Métodos**: `toggleAvailability()`, `acceptDelivery()`, `updateDeliveryStatus()`, `refresh()`
**Relaciones**: Depende de `orderService` y `assignmentService`. Se suscribe a Realtime para cambios de pedidos y solicitudes de asignación. Requiere `courierId`.

## OrderContext (`src/contexts/OrderContext.tsx`)
**Estado**: `customerOrders[]`, `businessOrders[]`, `loading`
**Métodos**: `refreshOrders()`, `getOrder()`, `createOrder()`, `updateOrderStatus()`, `acceptOrder()`, `rejectOrder()`
**Relaciones**: Depende de `orderService`. Se suscribe a Realtime para cambios. Requiere `customerId` y/o `businessId`.

## TrackingContext (`src/contexts/TrackingContext.tsx`)
**Estado**: `driverLocations{}`, `trackingInfos{}`, `isSharingLocation`
**Métodos**: `startTracking()`, `stopTracking()`, `startSharing()`, `stopSharing()`, `getTrackingInfo()`, `getDriverLocation()`
**Relaciones**: Depende de `trackingService`. Se suscribe a Realtime para ubicaciones de repartidores en vivo.

## Árbol de anidamiento
```
RootProviders (layout raíz)
├── AuthProvider
│   └── CartProvider
│       └── App contenido...
│           ├── ChatProvider (dentro de páginas que lo usan)
│           ├── CourierProvider (dentro de layout repartidor)
│           ├── OrderProvider (dentro de páginas que lo usan)
│           └── TrackingProvider (dentro de páginas que lo usan)
```

---

# 8. SERVICES

| Service | Archivo | Líneas | Propósito |
|---------|---------|--------|-----------|
| `adminService` | `admin.ts` | 603 | Dashboard stats, CRUD usuarios/negocios/repartidores, actualización masiva, asignación masiva, stats por hora/ciudad/top |
| `orderService` | `orders.ts` | 337 | CRUD pedidos, aceptar/rechazar, asignar courier, actualizar estado, subscribe Realtime, mapeo de datos |
| `marketplaceService` | `marketplace.ts` | 231 | Categorías (dinámicas desde businesses), negocios (con filtros por ciudad/zona/categoría), búsqueda, productos |
| `trackingService` | `tracking.ts` | 210 | Compartir ubicación (GeoWatch), distancia haversine, ETA, suscripción a ubicaciones, tracking info |
| `chatService` | `chat.ts` | 309 | Conversaciones 1:1, mensajes, marcar leídos, quick replies, subscribe Realtime, get-or-create conversation |
| `reviewsService` | `reviews.ts` | 245 | CRUD reseñas, stats de negocio/repartidor, comments, reacciones útil/no útil |
| `couponService` | `coupons.ts` | ~120 | CRUD cupones, validación (fechas, montos, límites), aplicar a orden, usage stats |
| `referralService` + `loyaltyService` | `referrals.ts` | ~120 | Códigos de referido, stats, puntos de fidelidad, rewards, redemptions |
| `coverageService` | `coverage.ts` | ~130 | CRUD ciudades/zonas/tarifas, detección por coordenadas haversine, filtrar negocios, calcular tarifa envío |
| `commissionService` | `commission.ts` | 103 | CRUD configuración comisiones, transacciones, pagos, cobro masivo |
| `notificationService` | `notifications.ts` | 93 | CRUD notificaciones, unread count, marcar leídas, subscribe Realtime |
| `reportService` | `reports.ts` | 94 | Export CSV (ventas, comisiones, ganancias repartidor) |
| `assignmentService` | `assignment.ts` | ~80 | CRUD repartidores, toggle disponibilidad, solicitudes de asignación |

**Patrón común**: Todos los servicios:
1. Importan `getBrowserClient()` de `@/lib/db/supabase`
2. Definen `async function getClient()` (o usan `getBrowserClient()` directamente)
3. Exportan un objeto con métodos que esperan `await getClient()`
4. Usan `/* eslint-disable @typescript-eslint/no-explicit-any */`

---

# 9. FLUJOS

## Registro
1. Usuario llena formulario en `/register` (email, password, nombre, rol)
2. `AuthContext.register()` → `SupabaseAuthService.register()`:
   - Llama `supabase.auth.signUp()` para crear usuario en auth.users
   - Hace POST a `/api/profile` con userId, email, rol, nombre
   - API route verifica token o userId con service_role
   - Inserta/actualiza perfil en `profiles` via service_client (bypass RLS)
3. Triggers automáticos: `create_wallet_for_user()` (customer/courier), `create_notification_preferences()`, `auto_create_referral_code()`
4. AuthContext actualiza estado: `isAuthenticated: false` (pendiente verificación email)
5. Redirige a `/login` con mensaje de confirmación

## Login
1. Usuario ingresa email + password en `/login`
2. `AuthContext.login()` → `SupabaseAuthService.login()`:
   - `supabase.auth.signInWithPassword()`
3. Si éxito, carga perfil via API route GET `/api/profile`
4. AuthContext actualiza: `isAuthenticated: true`, `profile`, `user`
5. `useEffect` en landing page (`/`) detecta autenticación + rol y redirige:
   - `customer` → `/cliente`
   - `merchant` → `/negocio`
   - `courier` → `/repartidor`
   - `admin` → `/admin`

## Crear Pedido (checkout → orden)
1. Cliente en `/cliente/checkout` con items del carrito
2. Opcional: aplica cupón (validación con `couponService.validate()`)
3. Confirma dirección de entrega e instrucciones
4. `OrderContext.createOrder()` → `orderService.createOrder()`:
   - Prepara datos: items, subtotal, delivery_fee, tax, total
   - Llama server action `createOrderAction()` que usa service_role
   - Server action: busca/crea address, inserta `orders`, inserta `order_items`
5. Triggers: `auto_generate_order_number()`, `notify_new_order()` (notifica al negocio)
6. Carrito se limpia (`clearCart()`)
7. Redirige a `/cliente/pedidos/[id]`

## Aceptar Pedido (negocio)
1. Negocio recibe notificación/ve pedido en `/negocio/pedidos`
2. `OrderContext.acceptOrder(orderId)` → `orderService.updateStatus(orderId, 'confirmed')`
3. Trigger `log_order_status_change()` registra en `order_tracking`
4. Trigger `notify_order_status_change()` notifica al cliente
5. Pedido pasa a disponible para repartidores

## Asignar Repartidor
1. Pedido en estado `confirmed` o `preparing` aparece en `/repartidor` como disponible
2. Repartidor ve pedido, hace clic en "Aceptar"
3. `CourierContext.acceptDelivery(orderId)`:
   - `orderService.assignCourier(orderId, courierId, courierName)` → actualiza `orders.courier_id`
   - `orderService.updateStatus(orderId, 'assigned')`
4. Trigger `notify_order_status_change()`: cliente y negocio notificados
5. Cliente ve repartidor asignado en tracking

## Tracking (repartidor → cliente)
1. Repartidor inicia viaje:
   - `updateDeliveryStatus(orderId, 'picked_up')` → estado `in_transit`
   - `TrackingContext.startSharing(courierId, orderId, businessId, customerId)`:
     - Inicia GeoWatch, upsert periódico a `driver_locations`
     - Suscripción Realtime: cliente recibe ubicaciones en vivo
2. Cliente ve en `/cliente/pedidos/[id]`:
   - Mapa (placeholder), distancia, ETA, progreso
3. Llega a destino → `updateDeliveryStatus(orderId, 'delivered')`
4. Trigger `auto_create_commission()`: calcula comisión del negocio
5. Detiene ubicación compartida

## Entrega
1. Repartidor marca como entregado → `status = 'delivered'`
2. Trigger `auto_create_commission()` ejecuta `calculate_commission()`:
   - Busca commission_config por jerarquía: business → category → global
   - Crea registro en `commission_transactions` con monto calculado
3. Trigger `notify_order_status_change()` notifica al cliente
4. Cliente puede calificar (rating + reseña)

## Calificación (post-entrega)
1. Cliente abre modal de calificación
2. `reviewsService.createReview()`:
   - Inserta en `ratings` con `rating_type = 'merchant' o 'courier'`
   - Si hay texto, lo guarda en `review`
3. Triggers `recalculate_rating_on_insert` y `update_order_rating`:
   - `recalculate_business_rating()`: AVG de ratings del negocio
   - Actualiza `orders.rating_by_customer`

## Administración (flujo general)
1. Admin accede a `/admin` con sidebar con 12 items
2. Cada página carga datos via `adminService` (usa Supabase queries directas)
3. Admin puede: CRUD usuarios/negocios/repartidores, ver pedidos, gestionar finanzas (comisiones, pagos), promociones (cupones), cobertura (ciudades, zonas, tarifas), reportes y reseñas
4. Operaciones de escritura: `supabase.from().insert/update/delete()` con service_role

---

# 10. VARIABLES DE ENTORNO

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (ej: `https://xxxx.supabase.co`) | ✅ Sí |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key de Supabase (para el cliente browser) | ✅ Sí |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (para bypass de RLS desde el servidor) | ✅ Sí |
| `NEXT_PUBLIC_APP_URL` | URL base de la app (ej: `http://localhost:3000`) | ✅ Sí |
| `NEXT_PUBLIC_GA_ID` | Google Analytics ID (opcional, si está presente activa GA4) | ❌ No |

## Notas de seguridad
- `SUPABASE_SERVICE_ROLE_KEY` tiene acceso total a la base de datos. Solo debe usarse desde server-side (API routes, server actions).
- `NEXT_PUBLIC_*` variables son expuestas al cliente; no deben contener secretos.
- La API route `/api/profile` usa service_role para crear/leer perfiles evitando RLS.

---

# 11. DEPENDENCIAS

## Dependencias de producción
| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `next` | 16.2.9 | Framework React full-stack (App Router, Server Components) |
| `react` + `react-dom` | 19.2.4 | UI library |
| `@supabase/supabase-js` | ^2.108.1 | Cliente Supabase (DB, Auth, Storage, Realtime) |
| `@supabase/ssr` | ^0.12.0 | Server-side rendering con Supabase |
| `@supabase/auth-helpers-nextjs` | ^0.15.0 | Helpers de autenticación para Next.js |
| `lucide-react` | ^1.18.0 | Iconos SVG |
| `class-variance-authority` | ^0.7.1 | Variantes de clases condicionales |
| `clsx` | ^2.1.1 | Concatenación de clases condicional |
| `tailwind-merge` | ^3.6.0 | Merge inteligente de clases Tailwind |
| `radix-ui` | ^1.5.0 | Primitivas UI accesibles |
| `shadcn` | ^4.11.0 | CLI de shadcn/ui |
| `tw-animate-css` | ^1.4.0 | Animaciones CSS para Tailwind |
| `pg` | ^8.21.0 | Cliente PostgreSQL nativo |

## Dependencias de desarrollo
| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `typescript` | ^5 | Tipado estático |
| `@types/react` + `@types/react-dom` | ^19 | Tipos de React |
| `@types/node` | ^20 | Tipos de Node.js |
| `@types/pg` | ^8.20.0 | Tipos de pg |
| `eslint` | ^9 | Linter |
| `eslint-config-next` | 16.2.9 | Config ESLint para Next.js (core-web-vitals + typescript) |
| `prettier` | ^3.8.4 | Formateador de código |
| `prettier-plugin-tailwindcss` | ^0.8.0 | Plugin Prettier para ordenar clases Tailwind |
| `tailwindcss` | ^4 | Framework CSS utility-first |

---

# 12. ESTADO DEL PROYECTO

## ✅ Completado
- Arquitectura completa de Next.js 16 App Router con layouts anidados
- Sistema de autenticación multi-rol (admin, merchant, customer, courier)
- Protección de rutas por rol con redirección automática
- Landing page pública con categorías, featured, stats, testimonios
- Marketplace: home cliente con hero search, categorías, secciones dinámicas
- Carrito de compras con persistencia localStorage
- Checkout con validación de cupón
- CRUD de pedidos con timeline de estados
- Asignación de repartidores
- Tracking con ubicación GPS (haversine, ETA, distancia)
- Chat 1:1 y grupal con Realtime
- Perfiles de usuario con edición
- Dashboard y CRUD administrador completo (12 vistas)
- Dashboard y CRUD negocio (7 vistas)
- Dashboard repartidor (4 vistas)
- Notificaciones push: tabla, templates, preferencias, triggers automáticos, NotificationBell
- Sistema de reseñas: calificación, comentarios, reacciones, recálculo automático
- Wallets con transacciones atómicas
- Comisiones: configuración jerárquica, cálculo automático, pagos masivos
- Cupones: porcentaje, fijo, envío gratis, validación multi-regla
- Referidos: código único, stats
- Puntos de fidelidad y recompensas
- Cobertura multi-ciudad: ciudades, zonas, tarifas, detección por coordenadas
- Google Analytics + Meta Pixel (condicional)
- Export CSV (ventas, comisiones, ganancias)
- 19 migraciones SQL, ~2,015 líneas, 45 tablas, 23 funciones, 44+ triggers, 45+ RLS policies
- Build: 0 TS errors, 0 lint errors, 43 rutas

## 🟡 Parcial
- **TrackingMap**: Solo placeholder gris, sin integración con Google Maps/Mapbox
- **Notificaciones push nativas**: La infraestructura DB está lista (device_tokens, templates), pero no hay integración con Firebase Cloud Messaging (FCM) o servicios equivalentes
- **Pagos reales**: No hay integración con pasarela de pagos (Nequi, Daviplata, Stripe, etc.)
- **Analytics**: Google Analytics y Meta Pixel implementados pero sin configuración real (GA_ID puede estar vacío)
- **Almacenamiento**: 6 buckets definidos en código pero deben crearse manualmente en Supabase
- **Pruebas**: Carpeta `tests/` vacía
- **Migraciones RLS**: La migración `12_disable_rls_profiles.sql` deshabilita RLS en profiles como workaround, lo que es inseguro

## ❌ Pendiente / No iniciado
- Integración con pasarela de pagos real (Nequi, Daviplata, Stripe, Wompi)
- Notificaciones push nativas (FCM/APNs)
- Mapa real (Google Maps / Mapbox)
- Despliegue en producción (configuración de dominios, SSL, variables de producción)
- Monitoreo y logging (Sentry, LogRocket, etc.)
- Tests automatizados (unit, integration, e2e)
- CI/CD pipeline
- PWA (Service Worker, manifest)
- Modo offline / soporte offline-first
- Internacionalización (i18n)
- Tema oscuro / modo oscuro
- Feature flags
- Rate limiting / protección contra abuso
- Auditoría de seguridad completa
- Documentación de API para integraciones externas
- Administración de contenido (CMS para landing page)
- Onboarding / tutorial interactivo
- Modo repartidor en segundo plano (background location)
- WebSockets para chat (usa polling/realtime de Supabase, no WebSocket nativo)

---

# 13. ROADMAP (hasta v2.0)

## Prioridad Crítica (v1.1)
1. **Integrar pasarela de pagos real** (Nequi, Wompi o Stripe para Colombia)
2. **Configurar Storage buckets** en Supabase Dashboard
3. **Desplegar en producción** (dominio, SSL, variables de entorno reales)
4. **Corregir seguridad**: Revisar RLS en profiles (evitar `DISABLE ROW LEVEL SECURITY`)
5. **Agregar monitoreo** (Sentry para errores, analytics para tracking de uso)

## Prioridad Alta (v1.2)
6. **Integración de mapas real** (Google Maps para tracking visual)
7. **Notificaciones push nativas** (FCM para Android + Web Push)
8. **Tests automatizados**: Unit (Jest/Vitest) + E2E (Playwright/Cypress)
9. **Rate limiting** en API routes y server actions
10. **Cacheo y optimización**: React Query / SWR para data fetching

## Prioridad Media (v1.3–v1.5)
11. **PWA**: Service Worker, manifest, instalable, offline fallback
12. **Modo oscuro** con persistencia
13. **Internacionalización (i18n)**: Español/English mínimo
14. **Onboarding interactivo** para nuevos usuarios
15. **Fondo de garantía / cashback**: Módulo de promociones avanzadas
16. **Programa de fidelización avanzado**: Niveles (bronce, plata, oro)
17. **Panel de análisis avanzado**: Gráficos reales (Recharts, D3) en reemplazo de CSS bars

## Prioridad Baja (v1.6–v2.0)
18. **Feature flags** para despliegues progresivos
19. **CMS para landing page** (editar hero, categorías, features dinámicamente)
20. **Modo multi-idioma** completo
21. **App móvil nativa** (React Native / Flutter) compartiendo backend
22. **Marketplace multi-proveedor**: Varios negocios en un solo pedido
23. **Suscripciones y pedidos programados**
24. **OpenAPI / documentación de API** para integraciones externas

---

# 14. DEUDA TÉCNICA

## Problemas encontrados

### RLS deshabilitado en profiles
- **Archivo**: `supabase/migrations/20250614_12_disable_rls_profiles.sql`
- **Problema**: `ALTER TABLE profiles DISABLE ROW LEVEL SECURITY` desactiva completamente la seguridad a nivel de fila en la tabla más sensible del sistema. Esto es un workaround porque el trigger de creación de wallet y notificaciones requiere acceso a profiles.
- **Riesgo**: ALTO — cualquier usuario autenticado podría potencialmente leer/modificar perfiles si hay otras brechas.
- **Solución**: Refactorizar las políticas RLS de profiles usando `is_admin()` SECURITY DEFINER correctamente.

### Uso extensivo de `any`
- Casi todos los archivos usan `/* eslint-disable @typescript-eslint/no-explicit-any */`
- **Riesgo**: Pérdida de type safety, errores en runtime difíciles de detectar
- **Solución**: Tipar correctamente los retornos de Supabase usando los tipos generados de `database.ts`

### Sin tests automatizados
- Carpeta `tests/` completamente vacía
- **Riesgo**: Cada cambio requiere verificación manual (build + lint)
- **Solución**: Implementar tests unitarios para servicios y contexts

### React Compiler warnings/hacks
- Varios `// eslint-disable-line react-hooks/exhaustive-deps` y `// eslint-disable-line react-hooks/set-state-in-effect` por incompatibilidad con React Compiler de Next.js 16
- **Riesgo**: Posibles bugs sutiles por efectos mal declarados
- **Solución**: Refactorizar effects para cumplir con reglas del compilador

### Código duplicado
- Lógica de mapeo de negocios a UI (`mapBusinessToUI`) en marketplace.ts
- Lógica de cálculos de distancia haversine (duplicada en tracking.ts y coverage.ts)
- Múltiples páginas admin comparten patrón CRUD similar
- **Solución**: Extraer a hooks o utilidades compartidas

### Estructura de features no utilizada
- `src/features/` tiene 14 directorios vacíos
- Todo el código está en `src/app/`, `src/components/`, `src/services/`
- **Solución**: Definir si se migrará a feature-based architecture o se eliminan los placeholders

### Archivos grandes
| Archivo | Líneas | Problema |
|---------|--------|----------|
| `src/types/database.ts` | ~764 | Auto-generado, pero muy grande; difícil de mantener |
| `src/app/page.tsx` | 538 | Landing page con todo inline; difícil de mantener |
| `src/services/admin.ts` | 603 | Demasiadas responsabilidades (dashboard stats + CRUD users + CRUD businesses + etc.) |
| `src/app/admin/finanzas/page.tsx` | ~500+ | Múltiples tabs con lógica compleja |

### Sin CI/CD
- No hay archivos de GitHub Actions, CircleCI, etc.
- **Riesgo**: Errores pueden llegar a producción sin detección

### Sin manejo de errores robusto
- Muchos `.catch(() => {})` silenciosos
- Sin logging centralizado
- **Riesgo**: Dificultad para diagnosticar problemas en producción

---

# 15. MÉTRICAS

| Métrica | Valor | Notas |
|---------|-------|-------|
| Archivos `.ts`/`.tsx` totales (excl. node_modules, .next) | **143** | Incluye app, components, services, contexts, lib, types, hooks |
| Archivos en `src/` | **140** | Sólo código fuente |
| Componentes | **64** | En `src/components/` (incluye UI primitives, feature components) |
| Páginas (`page.tsx`) | **41** | En `src/app/` |
| Rutas generadas en build | **43** | 42 estáticas + 1 dinámica (`/cliente/business/[slug]`) + 1 API (`/api/profile`) |
| Servicios | **14** | En `src/services/` (13 .ts + .gitkeep) |
| Hooks | **2** | 1 real (`useAuthProtection`) + .gitkeep |
| Contexts | **6** | Auth, Cart, Chat, Courier, Orders, Tracking |
| Migraciones SQL | **19** | En `supabase/migrations/` |
| Tablas en DB | **45** | Definidas en migraciones |
| Funciones SQL | **23** | Triggers + utilidades |
| Triggers | **44+** | BEFORE/AFTER INSERT/UPDATE |
| Políticas RLS | **45+** | Una o más por tabla |
| Buckets Storage | **6** | Definidos en código, no creados |
| Líneas migraciones SQL | **2,015** | Total de todos los archivos .sql |
| Líneas servicios | **2,560** | Total de archivos en src/services/ |
| Líneas componentes | **4,014** | Total de archivos en src/components/ |
| Líneas páginas | **5,971** | Total de archivos page.tsx |
| Líneas totales (src/ estimado) | **~15,000** | Suma estimada de todo el código fuente |
| Errores TypeScript | **0** | `npm run build` pasa sin errores |
| Errores Lint | **0** | `npm run lint` pasa sin warnings ni errores |

---

# 16. RESUMEN EJECUTIVO

## ¿Qué es DomiU?
DomiU es una plataforma de delivery multi-rol (clientes, restaurantes/negocios, repartidores, administradores) construida con **Next.js 16 + React 19 + Supabase + Tailwind CSS 4**. Está diseñada para operar en múltiples ciudades colombianas, comenzando con Santa Marta.

## ¿Qué tan completo está?
El proyecto está **~70% funcional** para un MVP. El núcleo del negocio funciona:
- ✅ Registro y autenticación multi-rol
- ✅ Marketplace con búsqueda, categorías, filtro por ciudad
- ✅ Carrito de compras persistente
- ✅ Checkout con validación de cupones
- ✅ Ciclo completo de pedidos (crear → aceptar → asignar → preparar → entregar)
- ✅ Dashboard para cada rol (admin, negocio, repartidor, cliente)
- ✅ Chat en tiempo real entre cliente y repartidor
- ✅ Tracking de ubicación con distancia y ETA
- ✅ Sistema de reseñas y calificaciones
- ✅ Notificaciones in-app con triggers automáticos
- ✅ Comisiones, pagos y finanzas para administradores
- ✅ Cupones, referidos y programa de fidelización
- ✅ Cobertura multi-ciudad (ciudades, zonas, tarifas dinámicas)
- ✅ Wallets virtuales por usuario
- ✅ Exportación de reportes CSV

## ¿Qué falta para producción?
**Crítico (bloqueante para producción)**:
1. ❌ Integración con pasarela de pagos real (Nequi, Wompi, Stripe)
2. ❌ Buckets de Storage deben crearse manualmente en Supabase
3. ❌ RLS en profiles está deshabilitado (inseguro)
4. ❌ Sin monitoreo de errores (Sentry)
5. ❌ Sin despliegue configurado (dominio, SSL, producción)

**Importante para calidad**:
6. ❌ Sin tests automatizados
7. ❌ Sin CI/CD pipeline
8. ❌ Uso extensivo de `any` (pérdida de type safety)
9. ❌ Mapa de tracking es placeholder (sin Google Maps/Mapbox)
10. ❌ Notificaciones push nativas sin implementar (solo in-app)

## Datos clave
- **0 errores** de TypeScript, **0 errores** de lint
- **43 rutas** funcionales en **140 archivos fuente**
- **45 tablas** en PostgreSQL con **23 funciones SQL** y **44+ triggers**
- **6 contexts** de React para estado global
- **14 services** que encapsulan toda la lógica de negocio
- **~15,000 líneas** de código TypeScript/React

## ¿Quién puede continuar?
Cualquier desarrollador con experiencia en Next.js, React, TypeScript y Supabase puede continuar este proyecto sin perder contexto, gracias a la separación clara en capas (app → components → services → lib → types) y la documentación de base de datos en `supabase/DATABASE_DESIGN.md`. Las instrucciones para agentes IA están en `AGENTS.md` (en la raíz del proyecto).

---

*Documentación generada el 19 de junio de 2026. Último build verificado: 43/43 páginas, 0 errores TS, 0 errores lint.*
