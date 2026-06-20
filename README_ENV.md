# DomiU — Entorno Completo: Guía de Reconstrucción Desde Cero

Este documento explica cómo reconstruir todo el entorno del proyecto DomiU App 1.0 desde cero, incluyendo variables de entorno, Supabase, y Vercel.

---

##  Pre-requisitos

| Herramienta | Cómo instalar |
|---|---|
| Node.js >= 18 | `winget install OpenJS.NodeJS` o [nodejs.org](https://nodejs.org) |
| `supabase` CLI | `npm install -g supabase` o `winget install supabase` |
| `vercel` CLI | `npm install -g vercel` |
| Git | `winget install Git.Git` |

---

## 1. Clonar el Repositorio

```bash
git clone https://github.com/leivakevin620-ui/domiu-app-Ultima-version.git
cd domiu-app-ultima-version
```

> Si no tienes `gh` CLI, usa git directamente.  
> Rama principal: `master`

---

## 2. Instalar Dependencias

```bash
npm install
```

---

## 3. Autenticar Herramientas CLI

### 3.1. Autenticar Vercel CLI

```bash
vercel login
```

Sigue el flujo de autenticación (email o GitHub). Luego vincula el proyecto:

```bash
vercel link --project domiu-app-ultima-version
```

### 3.2. Autenticar Supabase CLI

```bash
supabase login
```

Genera un token de acceso en [app.supabase.com/account/tokens](https://app.supabase.com/account/tokens) e ingrésalo cuando se solicite.

Vincula el proyecto correcto:

```bash
supabase link --project-ref vuwaqmwgvldqmmgkpyjh
```

Verifica:

```bash
supabase projects list
```

El proyecto `vuwaqmwgvldqmmgkpyjh` debe mostrar `"linked": true`.

---

## 4. Variables de Entorno

### 4.1. Obtener credenciales de Supabase

Las claves se obtienen del proyecto Supabase conectado:

```bash
supabase projects api-keys
```

Esto devuelve el `anon` key, `service_role` key, y otras.  
La URL del proyecto es: `https://vuwaqmwgvldqmmgkpyjh.supabase.co`

### 4.2. Crear `.env.local`

Copia el archivo de ejemplo:

```bash
cp .env.example .env.local
```

Llena al menos estas 4 variables obligatorias:

```env
NEXT_PUBLIC_SUPABASE_URL=https://vuwaqmwgvldqmmgkpyjh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4.3. Verificar variables

```bash
node scripts/check-environment.cjs
```

Debe mostrar todos los checks en verde.

---

## 5. Supabase — Migraciones

Verifica que las migraciones estén al día:

```bash
supabase db push --dry-run
```

Si dice "Remote database is up to date", estás listo.  
Si hay migraciones pendientes, aplícalas:

```bash
supabase db push
```

Las migraciones están en `supabase/migrations/` (22 archivos actualmente).

---

## 6. Supabase — Verificaciones Post-Migración

### Buckets de Storage

Los buckets deben crearse desde el Dashboard de Supabase (Settings > Storage):

| Bucket | Propósito |
|---|---|
| `product-images` | Imágenes de productos |
| `business-logos` | Logos de negocios |
| `user-avatars` | Avatares de usuarios |
| `chat-files` | Archivos de chat |
| `ratings-images` | Imágenes de reseñas |

### Realtime

Habilitar Realtime para tablas críticas en Dashboard (Settings > Realtime):
- `messages`
- `notifications`
- `driver_locations`
- `orders`

---

## 7. Vercel — Configurar Variables

Las variables deben configurarse en Vercel para que el build funcione en producción:

### 7.1. Agregar una variable

```bash
vercel env add <NOMBRE> <environment> --value "<valor>" --yes
```

### 7.2. Variables requeridas en Production

| Variable | Dónde obtenerla |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_APP_URL` | `https://domiu-app-ultima-version.vercel.app` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Cloud Console > APIs & Services |

### 7.3. Listar variables existentes

```bash
vercel env ls
```

### 7.4. Pull de variables de desarrollo (si configuradas)

```bash
vercel env pull
```

Esto descarga las variables del entorno Development y crea `.env.local`.

---

## 8. Configuración de Supabase CLI

El archivo `supabase/config.toml` ya está configurado con:

- `project_id = "domiu-app-10"`
- PostgreSQL v17
- Auth, Storage, Realtime habilitados
- Studio en puerto 54323

No es necesario modificarlo a menos que necesites cambios locales.

---

## 9. Construir y Verificar

```bash
npm run build
```

Debe compilar sin errores:

```
✓ Compiled successfully
✓ 57/57 pages generated
Proxy (Middleware) activo
```

---

## 10. Deploy en Vercel

### 10.1. Deploy manual

```bash
vercel --prod
```

Esto construye y despliega a producción usando las variables configuradas en el paso 7.

### 10.2. Deploy preview

```bash
vercel
```

### 10.3. Verificar deploy

```bash
vercel list
```

El último deploy de producción debe mostrar `● Ready`.

---

## 11. Post-Deploy

1. Verificar que la app carga en `https://domiu-app-ultima-version.vercel.app`
2. Probar registro de usuario
3. Probar login
4. Verificar que el proxy (middleware) redirige correctamente según el rol
5. Verificar que el Super Admin (`domiumagdalena@gmail.com`) puede acceder a `/admin`

---

##   Troubleshooting

### Error: "failed to parse config"

El archivo `supabase/config.toml` tiene formato incorrecto. Regenerar desde el template:

```bash
# En un directorio temporal
cd /tmp && mkdir supabase-fix && cd supabase-fix
supabase init --force
# Copiar el config.toml generado al proyecto
```

### Error: "required flag(s) 'project-ref' not set"

El enlace de Supabase no está completo:

```bash
supabase link --project-ref vuwaqmwgvldqmmgkpyjh
```

### Error: Environment Variable no encontrada en Vercel

Verificar que la variable existe en el entorno correcto:

```bash
vercel env ls
```

Si falta, agregarla con `vercel env add`.

### Build falla con errores de TypeScript

Ejecutar el checker de entorno primero:

```bash
node scripts/check-environment.cjs
```

Si las variables están bien, el build debería pasar.

---

##   Referencias Rápidas

| Item | Valor |
|---|---|
| Repositorio GitHub | `https://github.com/leivakevin620-ui/domiu-app-Ultima-version.git` |
| Proyecto Vercel | `domiu-app-ultima-version` |
| URL Producción | `https://domiu-app-ultima-version.vercel.app` |
| Proyecto Supabase | `vuwaqmwgvldqmmgkpyjh` |
| Supabase URL | `https://vuwaqmwgvldqmmgkpyjh.supabase.co` |
| Base de datos host | `db.vuwaqmwgvldqmmgkpyjh.supabase.co` |
| Región | `us-west-2` |
| PostgreSQL | v17.6.1 |
| Migraciones | 22 aplicadas (local = remote) |

---

*Última actualización: 20 de junio de 2026*
