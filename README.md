# DomiU App

Plataforma multirol de domicilios para clientes, negocios, repartidores y administración.

## Stack

- Next.js 16 con App Router y React 19.
- TypeScript estricto.
- Supabase Auth, PostgreSQL, Storage y Realtime.
- Tailwind CSS 4.
- Zod y Vitest.
- Vercel.
- Google Maps para geolocalización y rutas cuando está configurado.

## Módulos principales

- Marketplace y checkout de cliente.
- Operación de negocios y catálogo.
- Aplicación de repartidores, asignación y seguimiento.
- Administración Enterprise, auditoría, finanzas y liquidaciones.
- Domi AI con herramientas controladas por rol.
- Pedidos manuales Enterprise desde administración y comercio.

## Pedidos manuales

Rutas:

- `/admin/pedidos/crear`
- `/negocio/pedidos/crear`

El módulo admite clientes registrados o invitados, productos y variantes, artículos personalizados autorizados, domicilio o recogida, pagos, canales externos, borradores, asignación administrativa, inventario transaccional, snapshots, auditoría e idempotencia.

La aplicación no confía en precios, totales, tenant, creador o inventario enviados por el navegador. La fuente de verdad es el backend y la confirmación PostgreSQL.

Documentación: [`docs/MANUAL-ORDERS-ENTERPRISE-2026-07-21.md`](docs/MANUAL-ORDERS-ENTERPRISE-2026-07-21.md).

## Desarrollo

```bash
npm ci
npm run check:env
npm run lint
npm test
npm run build
npm run dev
```

## Variables

Copiar `.env.example` a `.env.local`. Nunca versionar `.env.local`, claves `service_role`, `sb_secret_...`, claves OpenAI ni tokens de Vercel.

Variables principales:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SECRET_KEY` o compatibilidad temporal `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- Variables de Domi documentadas en su guía técnica.

## Arquitectura

```text
src/
├── app/                 App Router, páginas y APIs
├── components/          UI reutilizable
├── contexts/            Estado React
├── hooks/               Hooks
├── lib/                 Dominio server-side, seguridad e integraciones
├── services/            Lecturas y servicios de interfaz
├── test/                Pruebas unitarias y estructurales
└── types/               Tipos de dominio y base de datos

supabase/migrations/     Esquema, RLS, funciones y triggers reproducibles
```

## Validación de cambios

Los PR ejecutan, según el módulo afectado:

- instalación limpia;
- escaneo de secretos;
- auditoría de dependencias;
- pruebas Vitest;
- validaciones de seguridad y arquitectura;
- TypeScript y build de Next.js;
- preview de Vercel;
- reconstrucción o validación de migraciones Supabase cuando está disponible.

No declarar una funcionalidad desplegada hasta comprobar el commit final en producción, health check y logs.
