# Auditoría e implementación multi-tenant de DomiU

**Estado:** Fase 1 preparada  
**Fecha:** 2026-07-10  
**Rama:** `docs/arquitectura-oficial-domiu`

## 1. Objetivo

Introducir una base multi-tenant sin romper el funcionamiento actual de DomiU App 1.2 Release Candidate.

La primera fase crea las entidades estructurales, registra un tenant predeterminado para la operación existente y agrega `tenant_id` de forma compatible a tablas operativas que ya existan.

## 2. Hallazgos confirmados

- El proyecto utiliza Supabase PostgreSQL, Auth, Storage y Realtime.
- Existen tablas centrales como `profiles`, `businesses`, `orders`, `notifications`, `messages` y `driver_locations`.
- El sistema actual utiliza `profiles.role = 'admin'` en funciones de seguridad existentes.
- Hay migraciones preparadas que todavía no han sido aplicadas al entorno remoto.
- El repositorio está en Release Candidate; por tanto, el aislamiento estricto no debe activarse en un solo cambio.

## 3. Estrategia segura

### Fase 1 — Foundation

Incluida en la migración `2026071001_multitenancy_foundation.sql`:

- `tenants`
- `tenant_memberships`
- `cities`
- `zones`
- tenant predeterminado `domiu-magdalena`
- ciudad inicial `Ciénaga`
- funciones auxiliares de tenant
- columnas `tenant_id` agregadas dinámicamente a tablas existentes conocidas
- backfill al tenant predeterminado
- índices básicos

En esta fase, las nuevas columnas no se fuerzan todavía como `NOT NULL` en todas las tablas y no se reemplazan políticas RLS existentes.

### Fase 2 — Adaptación de aplicación

- Resolver tenant activo en servidor.
- Incluir `tenant_id` al crear negocios, pedidos, productos, promociones, wallets y registros operativos.
- Añadir contexto de tenant a servicios y Server Actions.
- Incluir tenant en claves de caché.
- Evitar que el cliente pueda escoger arbitrariamente un tenant mediante datos enviados desde el navegador.

### Fase 3 — RLS multi-tenant

- Crear políticas por tabla usando `is_tenant_member` y `has_tenant_role`.
- Mantener reglas adicionales de propiedad: cliente, negocio, repartidor y administrador.
- Probar acceso cruzado con usuarios de tenants diferentes.
- Aplicar `NOT NULL` solamente después de verificar que no existen filas sin tenant.

### Fase 4 — Operación multi-ciudad

- Crear zonas PostGIS reales.
- Asociar negocios, direcciones, repartidores y pedidos con ciudad y zona.
- Activar tarifas y asignación por zona.

## 4. Tablas candidatas para tenant_id

La migración usa detección dinámica y solo modifica una tabla cuando existe:

- `profiles`
- `businesses`
- `business_hours`
- `categories`
- `products`
- `product_options`
- `addresses`
- `favorites`
- `carts`
- `cart_items`
- `orders`
- `order_items`
- `order_events`
- `assignments`
- `drivers`
- `couriers`
- `driver_locations`
- `courier_locations`
- `notifications`
- `chats`
- `messages`
- `wallets`
- `wallet_transactions`
- `promotions`
- `coupons`
- `ratings`
- `support_tickets`
- `audit_logs`

## 5. Reglas de seguridad

1. `tenant_id` nunca debe confiarse directamente desde el frontend.
2. El servidor debe resolverlo desde la sesión, membresía, negocio o recurso padre.
3. Un usuario puede pertenecer a uno o varios tenants mediante `tenant_memberships`.
4. La membresía suspendida o revocada no concede acceso.
5. El administrador principal del tenant no equivale automáticamente a superadministrador global.
6. Cualquier cambio de membresía o rol debe registrarse en auditoría.

## 6. Validaciones antes de aplicar remotamente

Ejecutar en staging:

```sql
select slug, name, status from public.tenants;
select count(*) from public.tenant_memberships;
select table_name, column_name
from information_schema.columns
where table_schema = 'public' and column_name = 'tenant_id'
order by table_name;
```

Verificar filas sin tenant:

```sql
-- Ejecutar por cada tabla crítica antes de activar NOT NULL.
select count(*) from public.orders where tenant_id is null;
select count(*) from public.businesses where tenant_id is null;
```

## 7. Criterios para aprobar Fase 1

- La migración se aplica dos veces sin fallar.
- Se conserva el tenant predeterminado sin duplicados.
- Los datos actuales quedan asociados al tenant predeterminado.
- El build y las pruebas existentes siguen pasando.
- No cambia el comportamiento visible de la aplicación.
- No se bloquean usuarios actuales por políticas RLS nuevas.

## 8. Riesgos controlados

- **Tablas con nombres diferentes:** el bloque dinámico ignora tablas inexistentes.
- **Datos existentes:** se asignan al tenant predeterminado.
- **RLS actual:** no se reemplaza en Fase 1.
- **Migraciones remotas pendientes:** deben aplicarse en orden y primero en staging.
- **Roles existentes:** se mantiene compatibilidad con el modelo actual y la migración introduce roles de membresía separados.

## 9. Siguiente implementación

Después de aplicar y validar esta base, el siguiente cambio debe ser el `TenantContext` del servidor y la propagación de `tenant_id` en el flujo de creación de pedidos, sin activar todavía aislamiento estricto en producción.