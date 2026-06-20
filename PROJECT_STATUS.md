# DomiU App — Project Status

## Arquitectura Actual

```
domiu-app-1-0/
├── src/
│   ├── app/              → Next.js 16 App Router (45 páginas)
│   │   ├── admin/        → Admin Enterprise + Seguridad RBAC (15 páginas)
│   │   ├── negocio/      → Business Enterprise (7 páginas)
│   │   ├── repartidor/   → Courier Pro (4 páginas)
│   │   ├── cliente/      → Marketplace (8 páginas)
│   │   └── ...auth, landing, notificaciones, etc.
│   ├── components/       → UI components reutilizables
│   ├── contexts/         → Auth, Courier, Chat, Tracking
│   ├── services/         → API clients (singleton pattern)
│   ├── lib/              → Supabase client, utilities
│   └── types/            → TypeScript interfaces
├── supabase/
│   └── migrations/       → 10 archivos SQL (31 tablas)
└── public/               → Assets estáticos
```

## Módulos Completados

| Módulo | Estado | Páginas | Build |
|--------|--------|---------|-------|
| Landing Premium | ✅ | `/` | 0 errors |
| Marketplace Premium | ✅ | `/cliente/*` (8) | 0 errors |
| Admin Enterprise | ✅ | `/admin/*` (15) | 0 errors |
| Admin Seguridad (RBAC) | ✅ | `/admin/seguridad`, `/admin/auditoria` | 0 errors |
| Business Enterprise | ✅ | `/negocio/*` (7) | 0 errors |
| Courier Pro | ✅ | `/repartidor/*` (4) | 0 errors |
| Login / Registro | ✅ | `/login`, `/register` | 0 errors |
| Chat (base) | ✅ | Integrado en pedidos | 0 errors |
| Tracking (base) | ✅ | Simulación GPS en tiempo real | 0 errors |
| Reviews | ✅ | Admin + Courier + Business | 0 errors |
| Dashboard (completo) | ✅ | Admin + Business + Courier KPIs | 0 errors |
| CRUD Productos | ✅ | Admin + Business | 0 errors |
| Kanban Pedidos | ✅ | Admin + Courier + Cliente | 0 errors |

## Base de Datos

**31 tablas creadas en 10 migraciones:**

| Tabla | Propósito |
|-------|-----------|
| `roles` | Roles y permisos del sistema |
| `profiles` | Perfiles de usuario extendidos |
| `businesses` | Negocios registrados |
| `business_hours` | Horarios de atención |
| `business_addresses` | Direcciones de negocios |
| `categories` | Categorías de productos |
| `products` | Catálogo de productos |
| `product_images` | Imágenes de productos |
| `product_variants` | Variantes (talla, color) |
| `orders` | Pedidos |
| `order_items` | Items por pedido |
| `order_tracking` | Historial de estados |
| `addresses` | Direcciones de usuarios |
| `drivers` | Repartidores |
| `driver_locations` | Ubicaciones en tiempo real |
| `driver_availability` | Disponibilidad programada |
| `driver_earnings` | Ganancias y comisiones |
| `payments` | Pagos |
| `payment_methods` | Métodos de pago |
| `wallets` | Billeteras digitales |
| `wallet_transactions` | Transacciones de billetera |
| `ratings` | Calificaciones y reseñas |
| `review_reports` | Reportes de reseñas |
| `favorites` | Favoritos de clientes |
| `audit_logs` | Auditoría de administración |
| `notifications` | Notificaciones |
| `notification_preferences` | Preferencias de notificación |
| `chat_conversations` | Conversaciones de chat |
| `chat_messages` | Mensajes de chat |
| `commission_transactions` | Transacciones de comisión |
| `admin_sessions` | Sesiones de admin (RBAC) |
| `admin_history` | Historial de acciones admin |

**Enums:** `user_role`, `user_status`, `order_status`, `payment_status`, `payment_method`, `rating_type`, `product_status`, `address_type`, `driver_status`, `vehicle_type`, `transaction_type`, `wallet_transaction_status`, `message_type`, `notification_type`, `notification_channel`

**RLS:** Pendiente de implementar en migración final

## Courier Pro — Detalle del Módulo

### Servicios
- `src/services/courier-pro.ts` — Servicio premium: niveles (7 tiers), earnings breakdown, AI readiness, gestión vehículo/documentos
- `src/services/assignment.ts` — Asignación de pedidos a repartidores
- `src/services/orders.ts` — CRUD de pedidos con suscripción en memoria
- `src/services/tracking.ts` — Simulación GPS con ruta generada entre negocio y cliente
- `src/services/reviews.ts` — Calificaciones de courier con estadísticas
- `src/services/reports.ts` — Exportación CSV de ganancias

### Contextos
- `CourierContext` — Estado global: courier, pedidos activos, disponibles, historial, ganancias, disponibilidad
- `ChatContext` — Chat courier ↔ cliente
- `TrackingContext` — Compartir ubicación en vivo

### Páginas
| Ruta | Características |
|------|-----------------|
| `/repartidor` | Status toggle animado (ping, glow), earnings KPIs (hoy/semana/mes), stats grid (entregas, rating, nivel), barra de progreso de nivel, bonus tiers, pedido activo, pedidos disponibles |
| `/repartidor/pedidos` | 3 tabs: Activo (mega-card con negocio/cliente/pago, timeline visual, navegación Google Maps, artículos), Disponibles (lista con aceptar), Historial |
| `/repartidor/ganancias` | 4 KPIs con tendencia, área chart Recharts (hoy/semana/mes/año), desglose (base/propinas/bonificaciones), transacciones recientes, exportar CSV |
| `/repartidor/perfil` | Avatar con gradiente, nivel, stats (rating/entregas/ganancias), info personal, formulario vehículo (tipo/placa/modelo), documentos/licencia, reseñas recibidas |

### Niveles (Courier Pro)
| Nivel | Entregas | Bonus |
|-------|----------|-------|
| 1. Novato | 0 | +0% |
| 2. Bronce | 10 | +5% |
| 3. Plata | 50 | +10% |
| 4. Oro | 150 | +15% |
| 5. Platino | 350 | +20% |
| 6. Diamante | 600 | +30% |
| 7. Élite | 1000 | +50% |

### AI Readiness (interfaces preparadas, sin implementación)
- Predicción de demanda (`nextHourOrders`, `confidence`, `peakTimeToday`)
- Zonas calientes (`hotZones` con `ordersPerHour`, `distanceKm`)
- Rutas óptimas (`optimalRoute` con `estimatedSavings`, `recommendedStops`)
- Ganancias estimadas (`estimatedEarnings` con proyecciones)

## Rutas Implementadas (45 total)

```
/                          → Landing Premium
/login                     → Login
/register                  → Registro
/forgot-password           → Recuperar contraseña
/auth/reset-password       → Reset password
/admin/* (15)              → Admin Enterprise + Seguridad RBAC
/negocio/* (7)             → Business Enterprise
/repartidor/* (4)          → Courier Pro
/cliente/* (8)             → Marketplace Premium
/notificaciones            → Notificaciones
/terminos                  → Términos y condiciones
/privacidad                → Privacidad
```

## Componentes Creados

### UI Base
- `LoadingState`, `EmptyState`, `PageContainer`, `PageTitle`, `DashboardCard`
- `StatCard`, `BottomNavigation`, `AppHeader`, `Footer`
- `EnterpriseTable<T>` — genérico con search, sort, CSV export, skeleton, actions

### Admin
- `AdminSidebar` — colapsable con búsqueda, tooltips, badge, filtrado por permisos
- `AdminHeader` — breadcrumbs dinámicos, NotificationBell, perfil dropdown
- `ReAuthModal` — re-autenticación con contraseña
- `ConfirmModal` — confirmación universal (danger/warning/info) con reauth opcional

### Delivery / Courier
- `DriverCard` — avatar, nombre, estado, vehículo, rating
- `DriverStatsCard` — label, valor, subtítulo, tendencia
- `AssignmentCard` — nueva solicitud con aceptar/rechazar
- `DeliveryStatusTimeline` — timeline 4 pasos (asignado → recogido → en camino → entregado)

### Tracking
- `EtaCard` — ETA, distancia, velocidad, indicador "En vivo"

### Chat
- `ChatWindow` — con quick replies, roles courier/cliente

### Business
- `BusinessSidebar` — colapsable con gradiente, logout, nombre negocio
- `BusinessHeader` — badge abierto/cerrado, horas, notificaciones, perfil

### Dashboard
- `KPICard` — gradiente, hover animation, icono
- `DashboardCharts` — 6 componentes Recharts (ventas, pedidos, top productos, etc.)

## Servicios y Contextos

### Services
| Archivo | Líneas | Propósito |
|---------|--------|-----------|
| `admin.ts` | ~620 | CRUD admin: usuarios, negocios, repartidores, órdenes, auditoría, wallet, config, dashboard stats |
| `audit.ts` | ~100 | Logging de auditoría con IP/browser/device/OS/result |
| `permissions.ts` | ~70 | RBAC: hasPermission, hasAnyPermission, hasAllPermissions |
| `admin-auth.ts` | ~120 | Sesiones admin, historial, reautenticación, system status |
| `business.ts` | ~315 | Servicio negocio: dashboard stats, productos CRUD, clientes, órdenes, reportes |
| `courier-pro.ts` | ~180 | Courier Pro: niveles, earnings breakdown, AI readiness, vehicle/docs management |
| `assignment.ts` | ~224 | Asignación de pedidos a repartidores |
| `orders.ts` | ~337 | CRUD órdenes con suscripción en memoria |
| `tracking.ts` | ~210 | Simulación GPS, ubicaciones en tiempo real |
| `reviews.ts` | ~245 | Calificaciones y reseñas |
| `reports.ts` | ~94 | Exportación CSV |
| `chat.ts` | ~309 | Chat con soporte multi-rol |

### Contexts
| Archivo | Propósito |
|---------|-----------|
| `AuthContext` | Auth global: login, register, logout, perfil, sesión |
| `CourierContext` | Estado courier: pedidos activos, earnings, disponibilidad |
| `ChatContext` | Chat en tiempo real por conversación |
| `TrackingContext` | Compartir ubicación GPS |

## Dependencias Instaladas

### Core
- `next` (16.2.9), `react`, `react-dom`
- `@supabase/supabase-js`, `@supabase/ssr`

### UI
- `lucide-react` — iconos
- `recharts` — gráficas (aprobado para admin y business)
- `tailwindcss`, `postcss`, `autoprefixer`

### Desarrollo
- `typescript`, `@types/react`, `@types/node`
- `eslint`, `eslint-config-next`

## Variables de Entorno

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Módulos Pendientes (Roadmap)

| Prioridad | Módulo | Estado |
|-----------|--------|--------|
| Alta | Cliente Premium (perfil, direcciones, favoritos, historial, cupones) | ⏳ |
| Alta | GPS y Tracking en tiempo real avanzado | ⏳ |
| Alta | Pagos (Stripe / Wompi / Mercado Pago) | ⏳ |
| Media | Notificaciones Push | ⏳ |
| Media | PWA (instalable, haptic feedback) | ⏳ |
| Media | SEO y rendimiento (Server Components, Dynamic Imports, next/image) | ⏳ |
| Baja | IA (recomendaciones y analítica) | ⏳ |
| Alta | Preparación producción (logs, monitoreo, backups, CI/CD) | ⏳ |
| Alta | SQL migraciones RLS para todas las tablas | ⏳ |
| Alta | Middleware de protección de rutas | ⏳ |

## Próximo Módulo Recomendado

**Cliente Premium** — perfil completo, direcciones múltiples, favoritos, historial de pedidos, cupones, gestión de métodos de pago.
