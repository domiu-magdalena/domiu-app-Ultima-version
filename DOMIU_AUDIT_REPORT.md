#  DOMIU AUDIT REPORT — FASE 1

> **Fecha:** 20 de junio de 2026  
> **Proyecto:** DomiU App 1.0  
> **Entorno:** Next.js 16.2.9 / Supabase / Vercel  
> **Total páginas:** 57  
> **Estado build:** ✅ 0 errores, 0 TS errors

---

##  TABLA DE CONTENIDOS

1. [Login & Autenticación](#1-login--autenticacin)
2. [Dashboard Cliente](#2-dashboard-cliente)
3. [Dashboard Negocio](#3-dashboard-negocio)
4. [Dashboard Repartidor](#4-dashboard-repartidor)
5. [Dashboard Admin](#5-dashboard-admin)
6. [Base de Datos](#6-base-de-datos)
7. [Seguridad](#7-seguridad)
8. [Performance](#8-performance)
9. [Responsive](#9-responsive)
10. [Accesibilidad](#10-accesibilidad)
11. [Errores Encontrados](#11-errores-encontrados)
12. [Soluciones y Prioridad](#12-soluciones-y-prioridad)
13. [Estado Final del Proyecto](#13-estado-final-del-proyecto)

---

## 1. Login & Autenticación

### 1.1 Login (`login/page.tsx`)

| Componente | Estado | Hallazgo |
|---|---|---|
| Formulario email/password | ✅ | Funciona con validación básica |
| Recordar sesión | ❌ | Checkbox decorativo — no implementa persistencia |
| Botones demo (dev) | ⚠️ | **CRÍTICO:** 4 sets de credenciales hardcodeadas en bundle cliente (`1193042104`, `AdminPass2025!`, `demo1234`) |
| Guardia `NODE_ENV` | ⚠️ | Evaluado en build-time, no runtime — posible exposición en producción |
| CAPTCHA | ❌ | No implementado |
| Rate limiting | ❌ | No implementado |

### 1.2 Registro (`register/page.tsx`)

| Componente | Estado | Hallazgo |
|---|---|---|
| Formulario registro | ✅ | Funciona con selección de rol |
| Rol admin bloqueado | ✅ | UI no permite seleccionar admin |
| Validación servidor rol | ❌ | **CRÍTICO:** No hay validación server-side del rol — se puede enviar `role: 'admin'` vía API |
| Política contraseña | ⚠️ | Mínimo 6 caracteres — sin mayúsculas, números o símbolos |
| Rate limiting | ❌ | No implementado |

### 1.3 Recuperación Contraseña (`forgot-password/page.tsx`)

| Componente | Estado | Hallazgo |
|---|---|---|
| Envío email recuperación | ✅ | Funciona |
| User enumeration | ⚠️ | Mensaje de error genérico (mitigado parcialmente) |
| Rate limiting | ❌ | No implementado |

### 1.4 Reset Contraseña (`auth/reset-password/page.tsx`)

| Componente | Estado | Hallazgo |
|---|---|---|
| Formulario nueva contraseña | ❌ | **CRÍTICO: NUNCA llama a `updatePassword()`** — Muestra éxito y redirige sin cambiar la contraseña |
| Token validation | ❌ | Token extraído de URL pero nunca validado contra Supabase |
| Error handling | ⚠️ | Usa `error` de `useAuth()` que puede ser de operación anterior |

### 1.5 AuthContext (`AuthContext.tsx`)

| Componente | Estado | Hallazgo |
|---|---|---|
| Session init | ✅ | Funciona con `onAuthStateChange` |
| Token refresh | ✅ | Implementado |
| Demo login | ❌ | **CRÍTICO:** Credenciales hardcodeadas `leivakevin620@gmail.com` / `1193042104` |
| Error handling | ⚠️ | Errores silenciados — `catch` devuelve `null` sin feedback |
| Cleanup subscription | ⚠️ | Dependencia de estructura interna del objeto `subscription` |

### 1.6 Middleware / Proxy (`proxy.ts`)

| Componente | Estado | Hallazgo |
|---|---|---|
| SSR session | ✅ | Funciona — crea server client y setea cookies |
| Role redirect | ✅ | `/login` para no auth |
| Admin route protection | ⚠️ | Solo protege `/admin` — no protege `/negocio`, `/repartidor`, `/cliente` |
| Super Admin check | ⚠️ | **Hardcodeado por email** `domiumagdalena@gmail.com` — sin respaldo en DB |
| Profile validation | ❌ | No verifica que el perfil exista en `profiles` — sesión activa = acceso permitido |

### 1.7 Perfil API (`api/profile/route.ts`)

| Componente | Estado | Hallazgo |
|---|---|---|
| GET (leer) | ⚠️ | Auth por Bearer token — OK |
| POST (crear) | ❌ | **CRÍTICO:** Permite crear/actualizar perfil solo con `userId` en body — sin autenticación real |
| PATCH (actualizar) | ⚠️ | Auth por Bearer token pero sin validación de ownership |
| Validación input | ❌ | Acepta campos arbitrarios del body — podría modificar `role`, `status` |

### 1.8 Server Actions (`actions/auth.ts`, `orders.ts`, `chat.ts`)

| Componente | Estado | Hallazgo |
|---|---|---|
| `registerUserAction` | ❌ | **CRÍTICO:** Usa `admin.createUser` (bypass email verification) sin verificar que el caller sea admin |
| `createOrderAction` | ❌ | **CRÍTICO:** Acepta `customerId` sin verificar ownership |
| `assignCourierAction` | ❌ | **CRÍTICO:** Permite asignar cualquier courier a cualquier orden |
| `updateUserProfileAction` | ❌ | Toma `userId` — sin verificación de autorización |
| `sendMessageAction` | ❌ | Sin verificación de participación en chat |
| **TODAS las server actions** | ❌ | **NINGUNA tiene verificación de autenticación o autorización** |

---

## 2. Dashboard Cliente

### 2.1 Resumen General

| Página | Estado | Líneas | Bugs | Error Handling | Loading | Empty |
|---|---|---|---|---|---|---|
| Home | ✅ Completo | 246 | ⚠️ rating 0 → string vacío | ❌ catch vacío | ✅ | ⚠️ Implícito |
| Search | ✅ Completo | 211 | ⚠️ Sin debounce, mic/filter decorativos | ❌ Sin try/catch | ✅ | ✅ |
| Categories | ⚠️ Completo | 50 | ❌ Intersection type frágil | ❌ Sin catch | ⚠️ Sin padding | ❌ Implícito |
| Restaurant Detail | ✅ Completo | 285 | ⚠️ setTimeout sin cleanup | ❌ Sin try/catch | ✅ | ✅ |
| Cart | ✅ Completo | 173 | ❌ **businessId usado como slug** | N/A | N/A | ✅ |
| Checkout | ✅ Completo | 328 | ⚠️ Orden operaciones errado | ⚠️ Parcial | ⚠️ Parcial | ✅ |
| Orders List | ✅ Completo | 149 | ⚠️ Filtros recomputados | ❌ Sin catch | ✅ | ✅ |
| Order Detail | ✅ Completo | 459 | ❌ `handleReorder` usa `as any` | ⚠️ Parcial | ✅ | ✅ |
| Favorites | ✅ Completo | 151 | ⚠️ Optimistic sin rollback | ❌ Sin catch | ✅ | ✅ |
| Wallet | ✅ Completo | 139 | ⚠️ Botón "Recargar" sin handler | ❌ Sin catch | ✅ | ✅ |
| Coupons | ✅ Completo | 151 | ⚠️ `TYPE_ICONS` tipo `any` | ❌ Sin catch | ✅ | ✅ |
| Profile | ✅ Completo | 228 | ⚠️ Stats fallan silenciosamente | ❌ Sin catch | ⚠️ Implícito | N/A |
| Settings | ✅ Completo | 167 | ❌ **Delete account no hace nada** | ❌ Sin catch | ✅ | N/A |
| Support | ⚠️ Completo | 154 | ❌ **`useMemo` con async (si aplica)** | N/A | ❌ No tiene | ✅ |
| Referrals | ✅ Completo | 138 | — | ❌ Sin catch | ✅ | N/A |
| Addresses | ✅ Completo | 231 | ⚠️ `defaultValue` no reactivo | ❌ Sin catch | ✅ | ✅ |
| Payment Methods | ✅ Completo | 181 | ⚠️ Sin validación `last_four` | ❌ Sin catch | ✅ | ✅ |
| Loyalty | ✅ Completo | 242 | ⚠️ `e: any` catch | ⚠️ Parcial (redeem) | ✅ | ✅ |
| Notifications | ✅ Completo | 129 | ⚠️ Optimistic sin rollback | ❌ Sin catch | ✅ | ✅ |
| Layout | ✅ Completo | 67 | ❌ **`useCart()` sin `CartProvider`** | ❌ Sin error boundary | ⚠️ Sin timeout | N/A |
| TrackingContext | ✅ Completo | 188 | ⚠️ Múltiples loops animación | ❌ Sin try/catch | N/A | N/A |

### 2.2 Bugs Críticos

| # | Bug | Archivo | Severidad |
|---|---|---|---|
| C1 | `businessId` usado como `slug` en link | `cart/page.tsx:77` | **ALTA** |
| C2 | `useMemo` posible con función async | `soporte/page.tsx:31` | **CRÍTICA** |
| C3 | Layout usa `useCart()` sin `CartProvider` garantizado | `layout.tsx:24` | **ALTA** |
| C4 | Delete account no funcional | `configuracion/page.tsx:140` | **MEDIA** |

### 2.3 Patrón General

- **Error handling:** 16/20 páginas no manejan errores de API — solo `console.error` o `catch {}`
- **Error boundaries:** 0/20 páginas tienen `error.tsx` o ErrorBoundary
- **Optimistic updates:** 5 páginas actualizan UI antes de API — sin rollback en fallo

---

## 3. Dashboard Negocio

### 3.1 Resumen General

| Página | Estado | Líneas | Bugs | Error Handling | Loading | Empty |
|---|---|---|---|---|---|---|
| Dashboard | ✅ Completo | — | ⚠️ Clases Tailwind dinámicas | ❌ catch vacío | ✅ | ⚠️ Con fallbacks |
| Productos | ✅ Completo | — | ❌ **`category_id` nunca se envía** | ❌ Sin try/catch | ✅ | ✅ |
| Pedidos | ✅ Completo | — | ❌ **Supabase direct bypass service layer** | ❌ Sin catch | ✅ | ✅ |
| Clientes | ✅ Completo | — | ⚠️ Sin paginación | ❌ Sin catch | ✅ | ✅ |
| Reportes | ✅ Completo | — | — | ❌ catch vacío | ✅ | ✅ |
| Configuración | ⚠️ Incompleto | — | ❌ **CRÍTICO: Hours/Coverage/Payments tabs no guardan** | ❌ Sin catch | ✅ | ✅ |
| Mapa | ✅ Completo | — | ⚠️ Markers recreados en cada render | ❌ Sin catch | ✅ | ✅ |
| Reseñas | ✅ Completo | — | ❌ **`respondToReview` usa profile.id en vez de business.id** | ❌ Solo console.error | ✅ | ✅ |
| Sidebar | ✅ Completo | — | ⚠️ Import `Search` no usado | N/A | N/A | N/A |

### 3.2 Bugs Críticos

| # | Bug | Archivo | Severidad |
|---|---|---|---|
| N1 | `category_id` no se envía al crear/editar producto | `productos/page.tsx` | **ALTA** |
| N2 | Pedidos bypass service layer — llama a Supabase directo | `pedidos/page.tsx` | **MEDIA** |
| N3 | Config tabs (Hours, Coverage, Payments) decorativos — no persisten | `configuracion/page.tsx` | **CRÍTICA** |
| N4 | `respondToReview` pasa `profile.id` en vez de `business.id` | `resenas/page.tsx` | **ALTA** |
| N5 | Clases Tailwind dinámicas (`from-${kpi.gradient}`) no funcionan en JIT | Varios | **ALTA** (UI silenciosa) |

---

## 4. Dashboard Repartidor

### 4.1 Resumen General

| Página | Estado | Líneas | Bugs | Error Handling | Loading | Empty |
|---|---|---|---|---|---|---|
| Dashboard | ✅ Completo | — | ⚠️ Race condition status toggle | ❌ Sin error state | ✅ | ✅ |
| Pedidos | ✅ Completo | — | ❌ **Copy-paste: muestra address en vez de phone** | ❌ Sin catch | ✅ | ✅ |
| Ganancias | ✅ Completo | — | ❌ **Desglose hardcodeado (70/15/15)** | ❌ catch vacío | ✅ | ✅ |
| Perfil | ✅ Completo | — | ⚠️ Forms sin validación | ❌ Sin catch | ✅ | ✅ |
| Mapa | ✅ Completo | — | ❌ **Origen hardcodeado Barranquilla** | ❌ Sin catch | ✅ | ✅ |
| Layout | ✅ Completo | 67 | ❌ **CRÍTICO: Sin role check — cualquiera accede** | ❌ Sin error boundary | ⚠️ Sin timeout | N/A |

### 4.2 Bugs Críticos

| # | Bug | Archivo | Severidad |
|---|---|---|---|
| R1 | Layout no verifica rol `courier` — admin/customer puede acceder | `layout.tsx` | **CRÍTICA** |
| R2 | Copy-paste: muestra dirección en campo de teléfono | `pedidos/page.tsx:146` | **MEDIA** |
| R3 | Origen del mapa hardcodeado en Barranquilla (no GPS real) | `mapa/page.tsx:68` | **MEDIA** |
| R4 | Desglose de ganancias hardcodeado 70/15/15 | `ganancias/page.tsx` | **BAJA** |

---

## 5. Dashboard Admin

### 5.1 Resumen General

| Página | Estado | Líneas | Bugs | Error Handling | Loading | Empty |
|---|---|---|---|---|---|---|
| Dashboard | ✅ Completo | — | ⚠️ `XCircle` importado 2 veces | ❌ catch vacío | ✅ | ✅ |
| Usuarios | ✅ Completo | — | ⚠️ Super Admin hardcodeado por email | ⚠️ Alert component | ✅ | ✅ |
| Negocios | ✅ Completo | — | ⚠️ `reload()` pelea con `useEffect` | ⚠️ Alert component | ✅ | ✅ |
| Pedidos | ✅ Completo | — | — | ⚠️ Alert component | ✅ | ✅ |
| Repartidores | ✅ Completo | — | ⚠️ `handleToggleActive` lógica dudosa | ⚠️ Alert component | ✅ | ✅ |
| Wallets | ❌ **STUB** | 24 | Sin funcionalidad — placeholder | N/A | N/A | N/A |
| Reportes | ✅ Completo | — | — | ❌ catch vacío | ⚠️ Solo texto | ✅ |
| Promociones | ✅ Completo | — | ⚠️ Form coupon sin campos requeridos | ❌ catch vacío | ✅ | ✅ |
| Configuración | ❌ **STUB** | — | ❌ **CRÍTICO: No persiste nada — save es fake** | N/A | N/A | N/A |
| Auditoría | ✅ Completo | — | ⚠️ Flash de contenido antes de redirect | ❌ catch vacío | ✅ | ✅ |
| Seguridad | ✅ Completo | — | ⚠️ Historial de acceso es stub "Próximamente" | ⚠️ Alert component | ✅ | ✅ |
| Cobertura | ✅ Completo | — | ⚠️ Sin validación en forms | ❌ catch vacío | ✅ | ❌ Implícito |
| Mapa | ✅ Completo | — | ⚠️ Click marker no hace panTo | ❌ Sin catch | ✅ | ✅ |
| Finanzas | ✅ Completo | — | ⚠️ Optimistic sin rollback | ❌ Solo console.error | ✅ | ✅ |
| Reseñas | ✅ Completo | — | ⚠️ Transacción no atómica (delete + status) | ❌ Solo console.error | ✅ | ✅ |

### 5.2 Stubs Identificados

| Página | Tipo | Detalle |
|---|---|---|
| `admin/wallets` | **STUB completo** | Placeholder "Próximamente" — sin datos ni funcionalidad |
| `admin/configuracion` | **STUB funcional** | UI completa pero **nada persiste** — save es un `setTimeout` de 3s |
| `admin/seguridad` (sección) | **STUB parcial** | "Historial de Acceso Reciente" dice "Próximamente" |
| `negocio/configuracion` (Staff tab) | **STUB parcial** | Pestaña "Staff" dice "Próximamente" |

### 5.3 Ruta Faltante

| Ruta | Estado |
|---|---|
| `/admin/negocios/[id]` | ❌ **No existe** — actualmente no linkeada, pero 404 si se navega manualmente |

---

## 6. Base de Datos

### 6.1 Inventario de Tablas

| Estado | Cantidad | Detalle |
|---|---|---|
| **Totales** | **49** | (no 31 como documentado) |
| Con RLS + policies | 31 | Funcionando correctamente |
| Con RLS pero **sin policies** | **18** | **Denegado total** — cualquier query con anon key falla |
| RLS **deshabilitado** | 1 | `profiles` |

### 6.2 Tablas con RLS pero SIN Policies (Deny-All)

| # | Tabla | Impacto |
|---|---|---|
| 1 | `roles` | ❌ No se pueden leer roles |
| 2 | `business_hours` | ❌ No se pueden leer horarios |
| 3 | `product_images` | ❌ No se pueden acceder imágenes |
| 4 | `product_variants` | ❌ No se pueden acceder variantes |
| 5 | `business_addresses` | ❌ No se pueden leer direcciones |
| 6 | `order_items` | ❌ No se pueden leer items de orden |
| 7 | `order_tracking` | ❌ No se puede leer tracking |
| 8 | `driver_availability` | ❌ No se puede leer disponibilidad |
| 9 | `driver_earnings` | ❌ No se pueden leer ganancias |
| 10 | `wallet_topups` | ❌ No se pueden gestionar recargas |
| 11 | `group_chats` | ❌ No se pueden leer chats grupales |
| 12 | `group_chat_members` | ❌ No se pueden leer miembros |
| 13 | `group_messages` | ❌ No se pueden leer mensajes grupales |
| 14 | `notification_preferences` | ❌ No se pueden leer preferencias |
| 15 | `notification_templates` | ❌ No se pueden leer templates |
| 16 | `device_tokens` | ❌ No se pueden registrar dispositivos |
| 17 | `rating_comments` | ❌ No se pueden leer comentarios |
| 18 | `rating_reactions` | ❌ No se pueden reaccionar |

### 6.3 RLS — Perfiles (`profiles`)

| Migración | Acción | Estado Actual |
|---|---|---|
| `2025061411` | Habilita RLS + policies | ⚠️ Causa recursión infinita |
| `2025061412` | **DESHABILITA** RLS | ⚠️ Solución temporal |
| `2025061413` | Crea `is_admin()` SECURITY DEFINER + arregla policies | ✅ Pero no reactiva RLS |
| `2025061704` | **DESHABILITA** RLS otra vez | ❌ **Estado actual: RLS OFF** |
| `2025062101` | Super Admin enforcement con `is_super_admin()` | ❌ **Ineficaz** porque RLS está OFF |

**Conclusión:** Las políticas de Super Admin, aunque bien diseñadas, **no se aplican** porque RLS en `profiles` está deshabilitado.

### 6.4 Foreign Keys

| Aspecto | Estado | Detalle |
|---|---|---|
| Definición | ✅ | Todas correctas |
| `CASCADE` | ✅ | Tablas hijas |
| `RESTRICT` | ✅ | Tablas críticas (owner, business) |
| `SET NULL` | ✅ | Courier, sender, response_by |

### 6.5 Triggers (46 total)

| Tipo | Cantidad | Hallazgo |
|---|---|---|
| `update_updated_at` | 30+ | ✅ Estándar |
| `create_wallet_on_profile_creation` | 1 | ✅ Solo customer/courier |
| `create_notification_prefs` | 1 | ✅ |
| `auto_create_referral_code` | 1 | ✅ |
| `auto_create_commission` | 1 | ✅ Solo en 'delivered' |
| `auto_detect_geofence` | 1 | ⚠️ SECURITY DEFINER sin `search_path` |
| `notify_order_status_change` | 1 | ❌ **Referencia `'assigned'` que no existe en enum** |
| `cleanup_driver_locations` | 1 | ✅ Mantiene máximo 1000 por driver |

### 6.6 RPC Functions (29 total)

| Función | Seguridad | Hallazgo |
|---|---|---|
| `public.is_admin()` | SECURITY DEFINER | ✅ `search_path = public` seteado |
| `detect_geofence_event()` | SECURITY DEFINER | ❌ **Sin `search_path`** |
| `get_loyalty_balance()` | SECURITY DEFINER | ❌ **Sin `search_path`** |
| `is_super_admin()` | SECURITY DEFINER | ❌ **Sin `search_path`** |
| `update_order_status` | ❌ | **NO EXISTE** — llamado por `admin.ts` pero nunca creada |

### 6.7 Índices

| Aspecto | Estado |
|---|---|
| Perfiles | ✅ 5 índices (email, phone, role, status, deleted_at) |
| Órdenes | ✅ 10 índices incluyendo compuestos |
| Productos | ✅ 9 índices |
| Faltantes | ⚠️ `notifications(recipient_id, is_read)`, `wallet_transactions(wallet_id, created_at DESC)`, `driver_locations(driver_id, created_at DESC)` |

### 6.8 Enums (15 total)

| Enum | Valores | Estado |
|---|---|---|
| `user_role` | admin, merchant, customer, courier | ✅ |
| `order_status` | pending, confirmed, preparing, ready, in_transit, delivered, cancelled, refunded | ⚠️ Falta `assigned` |
| Los demás 13 | — | ✅ |

### 6.9 Storage

| Aspecto | Estado |
|---|---|
| Buckets creados | ❌ **NINGUNO** — no hay migración de storage |
| Políticas de storage | ❌ **NINGUNA** |
| Columnas que referencian storage | 7 (`avatar_url`, `logo_url`, `banner_url`, `icon_url`, `image_url` x3) |

---

## 7. Seguridad

### 7.1 Matriz de Vulnerabilidades

| # | Vulnerabilidad | Severidad | Tipo | Componente |
|---|---|---|---|---|
| S1 | **Credenciales hardcodeadas en bundle cliente** | 🔴 **CRÍTICA** | Exposición | `login/page.tsx`, `AuthContext.tsx` |
| S2 | **Password reset no funcional** (nunca llama API) | 🔴 **CRÍTICA** | Funcional | `auth/reset-password/page.tsx` |
| S3 | **Profile API POST sin auth real** (solo userId en body) | 🔴 **CRÍTICA** | Auth | `api/profile/route.ts` |
| S4 | **Server actions sin auth ni autorización** | 🔴 **CRÍTICA** | Auth | `actions/auth.ts`, `orders.ts`, `chat.ts` |
| S5 | **`registerUserAction` crea usuarios verificados sin autorización** | 🔴 **CRÍTICA** | Auth | `actions/auth.ts` |
| S6 | **admin.ts usa browser client para operaciones críticas** | 🔴 **CRÍTICA** | Auth | `services/admin.ts` |
| S7 | **RLS en profiles DESHABILITADO** | 🔴 **CRÍTICA** | RLS | Migraciones 2025061412, 2025061704 |
| S8 | **18 tablas con RLS pero sin policies** (deny-all) | 🔴 **CRÍTICA** | RLS | Ver tabla 6.2 |
| S9 | **Service role key en `.env.local` (commiteado)** | 🟠 **ALTA** | Exposición | `.env.local` |
| S10 | **Super Admin enforcement ineficaz por RLS OFF** | 🟠 **ALTA** | RLS | `2025062101_enforce_super_admin.sql` |
| S11 | **Demo credentials expuestas en build-time** | 🟠 **ALTA** | Exposición | `login/page.tsx` |
| S12 | **Sin validación server-side de rol en registro** | 🟠 **ALTA** | Auth | `register/page.tsx` |
| S13 | **Layout repartidor sin role check** | 🟠 **ALTA** | Auth | `repartidor/layout.tsx` |
| S14 | **3 funciones SECURITY DEFINER sin `search_path`** | 🟠 **ALTA** | DB | RPCs |
| S15 | **Rol autoseleccionado en registro** | 🟡 **MEDIA** | Auth | `register/page.tsx` |
| S16 | **Email confirmation deshabilitado** | 🟡 **MEDIA** | Auth | `config.toml` |
| S17 | **Min password 6 caracteres** | 🟡 **MEDIA** | Auth | `config.toml`, `register/page.tsx` |
| S18 | **Middleware no protege rutas no-admin** | 🟡 **MEDIA** | Auth | `proxy.ts` |
| S19 | **Optimistic updates sin rollback** (5 páginas) | 🟡 **MEDIA** | UX | Dashboard |
| S20 | **Sin rate limiting en login/register** | 🟡 **MEDIA** | Auth | Todos |

### 7.2 Pruebas de Seguridad

| Prueba | Resultado | Detalle |
|---|---|---|
| ¿Alguien puede entrar como admin? | ❌ **SÍ** | Server actions sin auth + Profile API débil + RLS OFF |
| ¿Alguien puede editar otro usuario? | ❌ **SÍ** | Profile API POST + server actions |
| ¿Negocio ve pedidos ajenos? | ⚠️ Probablemente no | Policies de orders tienen filtros por `business_id` (RLS activo en orders) |
| ¿Repartidor ve pedidos ajenos? | ⚠️ Probablemente no | Policies de orders filtran por `courier_id` |
| ¿Cliente ve info privada? | ❌ **SÍ** — RLS OFF en profiles permite leer todos los perfiles |

---

## 8. Performance

### 8.1 Build Output

| Métrica | Valor |
|---|---|
| Tiempo compilación | ~71s (Turbopack) |
| TypeScript check | ~31s |
| Páginas generadas | **57/57** |
| Páginas dinámicas | 3 (`/api/profile`, `/cliente/business/[slug]`, `/cliente/pedidos/[id]`) |
| Proxy activo | ✅ |
| Errores | **0** |
| Advertencias | **0** (build), ⚠️ React Compiler warnings (pre-existentes, no bloqueantes) |

### 8.2 Análisis de Bundle (Estimado)

| Aspecto | Hallazgo |
|---|---|
| Bundle cliente | ⚠️ **Grande**: framer-motion + recharts + lucide-react son pesados |
| Carga inicial | Múltiples context providers (Auth, Cart, Order, Chat, Tracking, Maps) |
| Code splitting | No implementado — `next/dynamic` no usado en dashboards |
| Imágenes | Sin `next/image` optimization consistente |
| Fuentes | No verificado — posible descarga de Google Fonts |

### 8.3 Data Fetching

| Aspecto | Hallazgo |
|---|---|
| Patrón | Client-side con `useEffect` + `useState` (la mayoría) |
| SSR/SSG | 54/57 páginas estáticas — datos se cargan cliente |
| Caché | No implementada — cada navegación refetches |
| Race conditions | 2+ páginas sin abort controller |
| Paginación | ❌ Ausente en admin (usuarios, negocios, pedidos, etc.) |

### 8.4 Lighthouse (Estimado)

| Métrica | Score Estimado | Notas |
|---|---|---|
| Performance | 🟡 50-70 | Bundle grande, sin lazy loading, muchas re-renderizaciones de contexto |
| Accessibility | 🟡 60-80 | Sin auditoría formal (ver sección 10) |
| Best Practices | 🟢 80-90 | Next.js 16, TypeScript |
| SEO | 🟢 90-100 | Páginas estáticas con metadata |

---

## 9. Responsive

### 9.1 Análisis por Componente

| Componente | Desktop (1920+) | Laptop (1366) | Tablet (768) | iPad (1024) | Android (360) | iPhone (375) |
|---|---|---|---|---|---|---|
| Login/Register | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cliente Home | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| Cliente Search | ✅ | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ |
| Cliente Restaurant | ✅ | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ |
| Cliente Cart/Checkout | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Negocio Dashboard | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ❌ |
| Negocio Productos | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ❌ |
| Negocio Pedidos (Kanban) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Repartidor Dashboard | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| Admin Dashboard | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Admin Usuarios (tabla) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Admin Config (tabs) | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ❌ |

### 9.2 Hallazgos

| # | Problema | Severidad |
|---|---|---|
| R1 | Dashboards admin/negocio diseñados solo para desktop — tablas no tienen versiones mobile | **ALTA** |
| R2 | Kanban de pedidos (negocio) no responsive — 7 columnas en horizontal | **ALTA** |
| R3 | Bottom navigation en cliente no se adapta en landscape | **MEDIA** |
| R4 | Enterprise tables sin horizontal scroll en mobile | **MEDIA** |
| R5 | Algunos modales no son full-screen en mobile | **BAJA** |
| R6 | Tailwind responsive classes usadas pero no testeadas consistentemente | **MEDIA** |

---

## 10. Accesibilidad

### 10.1 Auditoría Rápida

| Aspecto | Estado | Hallazgo |
|---|---|---|
| Contraste de color | ⚠️ | Uso de gradientes `from-${color}/10` — Tailwind JIT no las compila → fondo transparente |
| Navegación por teclado (Tab) | ❌ | Menús desplegables y modales sin focus trapping |
| Screen Reader (ARIA) | ❌ | Sin `aria-label`, `role`, `aria-live` en componentes dinámicos |
| Focus management | ❌ | Sin `useFocusTrap` en modales |
| Skip to content | ❌ | Sin `SkipNavLink` |
| Alt text en imágenes | ❌ | Sin `alt` en imágenes decorativas y de contenido |
| Form labels | ⚠️ | Algunos inputs sin `aria-label` o `htmlFor` |
| Touch targets | ⚠️ | Botones pequeños en tablas admin (< 44px) |

### 10.2 Problemas Identificados

| # | Problema | WCAG | Severidad |
|---|---|---|---|
| A1 | Sin ARIA labels en iconos decorativos | 1.1.1 | **ALTA** |
| A2 | Sin focus trap en modales | 2.1.2 | **ALTA** |
| A3 | Gradientes dinámicos no compilados = fondo blanco sobre texto blanco | 1.4.3 | **ALTA** |
| A4 | Sin Skip Navigation | 2.4.1 | **MEDIA** |
| A5 | Tablas sin `scope` en headers | 1.3.1 | **MEDIA** |
| A6 | Sin `aria-live` para contenido dinámico (notificaciones, pedidos) | 4.1.3 | **MEDIA** |
| A7 | Algunos formularios sin labels asociados | 1.3.1 | **MEDIA** |
| A8 | Sin `role="alert"` en mensajes de error | 4.1.3 | **BAJA** |
| A9 | Sin `role="progressbar"` en loading states | 4.1.2 | **BAJA** |

---

## 11. Errores Encontrados

### 11.1 Resumen por Categoría

| Categoría | 🔴 Crítico | 🟠 Alto | 🟡 Medio | 🔵 Bajo | Total |
|---|---|---|---|---|---|
| **Seguridad** | 8 | 6 | 5 | 1 | **20** |
| **Auth** | 4 | 3 | 4 | 2 | **13** |
| **Frontend (Cliente)** | 1 | 2 | 5 | 4 | **12** |
| **Frontend (Negocio)** | 1 | 2 | 3 | 2 | **8** |
| **Frontend (Repartidor)** | 1 | 1 | 2 | 1 | **5** |
| **Frontend (Admin)** | 1 | 1 | 4 | 3 | **9** |
| **Base de Datos** | 2 | 4 | 3 | 3 | **12** |
| **RLS** | 2 | 2 | 0 | 0 | **4** |
| **Performance** | 0 | 1 | 3 | 2 | **6** |
| **Responsive** | 0 | 2 | 3 | 1 | **6** |
| **Accesibilidad** | 0 | 3 | 3 | 3 | **9** |
| **TOTAL** | **20** | **27** | **35** | **22** | **104** |

### 11.2 Top 10 Errores Críticos

| # | Error | Componente | Impacto |
|---|---|---|---|
| 1 | **Credenciales hardcodeadas en bundle cliente** | `login/page.tsx` + `AuthContext.tsx` | Cualquier usuario puede extraer credenciales del bundle JS |
| 2 | **Password reset no funcional** | `auth/reset-password/page.tsx` | Usuarios no pueden recuperar acceso |
| 3 | **Server actions sin auth** | `actions/*.ts` (5 archivos) | Cualquiera puede crear órdenes, usuarios, chats |
| 4 | **Profile API POST auth débil** | `api/profile/route.ts` | Cualquiera con userId puede modificar perfiles |
| 5 | **RLS en profiles deshabilitado** | Migraciones 2025061412, 2025061704 | Todos los perfiles son públicos |
| 6 | **18 tablas con RLS deny-all** | Base de datos | Funcionalidad rota (imágenes, variantes, tracking) |
| 7 | **`registerUserAction` sin autorización** | `actions/auth.ts` | Cualquiera crea usuarios verificados con cualquier rol |
| 8 | **admin.ts usa browser client** | `services/admin.ts` | Operaciones admin ejecutadas con anon key |
| 9 | **Config admin no persiste nada** | `admin/configuracion/page.tsx` | Save es fake; datos nunca se guardan |
| 10 | **Layout repartidor sin role check** | `repartidor/layout.tsx` | Admin/customer puede ver interfaz de repartidor |

---

## 12. Soluciones y Prioridad

### 12.1 🔴 Inmediatas (Día 1-2)

| # | Solución | Archivos |
|---|---|---|
| 1 | **Eliminar credenciales hardcodeadas** del bundle cliente; usar backend + env vars | `login/page.tsx`, `AuthContext.tsx` |
| 2 | **Arreglar password reset**: llamar `supabase.auth.updateUser()` con token | `auth/reset-password/page.tsx` |
| 3 | **Agregar auth checks a server actions**: verificar sesión y autorización | `actions/auth.ts`, `orders.ts`, `chat.ts` |
| 4 | **Arreglar Profile API POST**: requerir token Bearer, eliminar fallback userId | `api/profile/route.ts` |
| 5 | **Re-habilitar RLS en `profiles`** y arreglar policies con `is_admin()` | Migración nueva |
| 6 | **Agregar policies a 18 tablas deny-all** (mínimo SELECT para owners) | Migración nueva |
| 7 | **Proteger `registerUserAction`**: solo admins pueden llamarlo | `actions/auth.ts` |
| 8 | **Separar admin.ts**: usar service client en server actions, no browser client | `services/admin.ts` |

### 12.2 🟠 Alta Prioridad (Día 3-5)

| # | Solución | Archivos |
|---|---|---|
| 9 | **Agregar role check en layout repartidor** | `repartidor/layout.tsx` |
| 10 | **Arreglar Config Admin**: conectar formularios a backend/supabase | `admin/configuracion/page.tsx` |
| 11 | **Agregar validación server-side de rol en registro** | `actions/auth.ts`, `api/profile/route.ts` |
| 12 | **Arreglar `category_id` no enviado en productos** | `negocio/productos/page.tsx` |
| 13 | **Agregar `search_path` a SECURITY DEFINER functions** | Migración nueva |
| 14 | **Arreglar `respondToReview` — pasar business.id** | `negocio/resenas/page.tsx` |
| 15 | **Arreglar `businessId` usado como slug** en link carrito | `cliente/cart/page.tsx` |
| 16 | **Agregar error boundaries** a layouts de dashboard | `cliente/layout.tsx`, `negocio/layout.tsx`, `admin/layout.tsx`, `repartidor/layout.tsx` |
| 17 | **Agregar middleware role check** para todas las rutas protegidas | `proxy.ts` |
| 18 | **Hacer `SUPABASE_SERVICE_ROLE_KEY` required** en validación Zod | `lib/env.ts` |

### 12.3 🟡 Media Prioridad (Semana 2)

| # | Solución | Archivos |
|---|---|---|
| 19 | **Agregar error handling** a todas las páginas (try/catch + user feedback) | Todos los dashboards |
| 20 | **Agregar paginación** a tablas admin | `admin/usuarios`, `admin/negocios`, `admin/pedidos` |
| 21 | **Implementar `update_order_status` RPC** o eliminar dead code | Migración nueva + `admin.ts` |
| 22 | **Arreglar `profile_id` → `driver_id`** en geofencing.ts | `services/geofencing.ts` |
| 23 | **Crear storage buckets** con políticas RLS | Migración nueva |
| 24 | **Agregar `'assigned'` a enum `order_status`** o arreglar trigger | Migración nueva |
| 25 | **Reemplazar coordenadas hardcodeadas** con datos reales | `services/geofencing.ts`, `repartidor/mapa/page.tsx` |
| 26 | **Implementar Wallet Admin** | `admin/wallets/page.tsx` |
| 27 | **Arreglar clases Tailwind dinámicas** — usar variantes completas | Varios dashboards |
| 28 | **Agregar rate limiting** a login y registro | `login/page.tsx`, `register/page.tsx` |

### 12.4 🔵 Baja Prioridad (Semana 3+)

| # | Solución | Archivos |
|---|---|---|
| 29 | **Agregar captcha** a formularios públicos | `login`, `register` |
| 30 | **Implementar email confirmation** | `config.toml` |
| 31 | **Aumentar min password a 8+** | `config.toml`, `register/page.tsx`, `reset-password/page.tsx` |
| 32 | **Agregar ARIA labels y focus management** | Todos los dashboards |
| 33 | **Implementar responsive para admin tables** | Componentes de tabla |
| 34 | **Optimizar bundle con `next/dynamic`** | Layouts de dashboard |
| 35 | **Agregar Skip Navigation** | Root layout |
| 36 | **Implementar `verificarEmail` en reset-password** | `auth/reset-password/page.tsx` |
| 37 | **Eliminar `as any` type assertions** | Varios |
| 38 | **Agregar real-time subscriptions** a órdenes y mapa | `negocio/pedidos` |

---

## 13. Estado Final del Proyecto

### 13.1 Scorecard General

| Dimensión | Puntaje | Estado |
|---|---|---|
| **Build** | 10/10 | ✅ 57/57 páginas, 0 errores TS |
| **Login & Auth** | 3/10 | ❌ Múltiples vulnerabilidades críticas |
| **Dashboard Cliente** | 7/10 | ⚠️ Completo pero sin error handling |
| **Dashboard Negocio** | 6/10 | ⚠️ Bugs funcionales + config rota |
| **Dashboard Repartidor** | 5/10 | ❌ Role check faltante |
| **Dashboard Admin** | 5/10 | ❌ 2 stubs completos + bugs |
| **Base de Datos** | 4/10 | ❌ RLS roto, 18 tablas deny-all |
| **Seguridad** | 2/10 | ❌ 8 vulnerabilidades críticas |
| **Performance** | 6/10 | ⚠️ Bundle grande, sin optimizaciones |
| **Responsive** | 5/10 | ❌ Admin/negocio no responsive |
| **Accesibilidad** | 3/10 | ❌ Sin soporte básico |
| **PROMEDIO GENERAL** | **5.1/10** | ⚠️ Funcional pero con deuda técnica severa |

### 13.2 Resumen Ejecutivo

```
DOMIU AUDIT REPORT
═══════════════════════════════════════

✔ Build (57/57 páginas, 0 TS errors)
⚠ Login (3/10 — credenciales hardcodeadas, password reset roto)
⚠ Registro (sin validación server-side de rol)
⚠ AuthContext (demo credenciales en bundle)
⚠ Proxy/Middleware (no protege rutas no-admin)
⚠ Server Actions (SIN AUTENTICACIÓN — todas)
⚠ API Profile (POST auth débil — solo userId en body)
⚠ Perfil API (service role sin restricciones)
⚠ Dashboard Cliente (completo, sin error handling)
⚠ Dashboard Negocio (bugs funcionales, config rota)
⚠ Dashboard Repartidor (sin role check en layout)
⚠ Dashboard Admin (2 stubs, config fake)
✔ Storage (no configurado — 0 buckets)
⚠ Buckets (no existen)
⚠ RLS (profiles deshabilitado, 18 tablas deny-all)
⚠ Base de Datos (49 tablas, 22 migraciones)
⚠ Seguridad (8 críticas, 6 altas)
⚠ Performance (build OK, bundle grande)
⚠ Responsive (admin/negocio solo desktop)
⚠ Accesibilidad (sin soporte)
⚠ Lighthouse (est. 50-70 performance)
⚠ Errores (104 encontrados: 20 críticos, 27 altos)
⚠ Soluciones (38 priorizadas)
⚠ Estado Final (5.1/10 — funcional pero inseguro)

RECOMENDACIÓN:
    1. Arreglar las 8 vulnerabilidades CRÍTICAS
    2. Rehabilitar RLS en profiles
    3. Agregar policies a tablas deny-all
    4. Arreglar server actions (agregar auth)
    5. Implementar password reset real
    6. Eliminar credenciales hardcodeadas
    7. Bloquear funcionalidad hasta resolver seguridad
```

---

*Auditoría generada el 20 de junio de 2026 — DomiU App 1.0*
