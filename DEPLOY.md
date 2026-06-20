# DomiU — Guía de Deploy

## Requisitos

- Node.js 20+
- Cuenta en [Vercel](https://vercel.com)
- Cuenta en [Supabase](https://supabase.com)
- (Opcional) API Key de [Google Maps Platform](https://console.cloud.google.com/google/maps-apis)

## 1. Supabase

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Vincular proyecto (una vez)
supabase link --project-ref vuwaqmwgvldqmmgkpyjh

# Aplicar migraciones
supabase db push

# Verificar estado
supabase db list
```

### Configurar Authentication

1. Ir a Supabase Dashboard → Authentication → Settings
2. Deshabilitar "Confirm email" para desarrollo (o configurar SMTP)
3. En Site URL: poner la URL de Vercel (ej: `https://domiu-app.vercel.app`)
4. En Redirect URLs: agregar `https://domiu-app.vercel.app/auth/reset-password`

## 2. Variables en Vercel

En Vercel Dashboard → Project Settings → Environment Variables, agregar:

| Variable | Visibility |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public |
| `NEXT_PUBLIC_APP_URL` | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Private (secret) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Public |
| `NEXT_PUBLIC_GA_ID` | Public |

Usa `NEXT_PUBLIC_APP_URL=https://domiu-app.vercel.app` en producción.

## 3. Vercel Deploy

### Opción A: Git Integration (recomendada)

```bash
git push origin main
# Vercel depliega automáticamente
```

### Opción B: Vercel CLI

```bash
# Login
vercel login

# Pull env vars
vercel env pull

# Deploy
vercel --prod
```

## 4. Post-Deploy

- [ ] Verificar login funciona
- [ ] Verificar registro funciona
- [ ] Verificar admin panel carga
- [ ] Verificar mapa carga (si API key configurada)
- [ ] Verificar migraciones de base de datos

## 5. Troubleshooting

**Error: `Supabase no configurado`**
→ Verificar que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` están en Vercel.

**Error: `Build failed`**
→ Ejecutar `npm run build` localmente. Revisar logs de build en Vercel.

**Error: `Failed to load profile`**
→ Verificar que la migración `20250614_profiles.sql` fue aplicada.

**Error: `Google Maps no carga`**
→ Verificar que `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` está configurada y que la API de Maps está habilitada en Google Cloud Console.
