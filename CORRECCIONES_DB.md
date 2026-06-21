# DOMIU MAGDALENA - Correcciones de Base de Datos

## Problemas Corregidos

1. **Limpieza automática de pedidos al abrir turno**: Cuando el admin abre un nuevo turno, ahora se eliminan automáticamente todos los pedidos del turno anterior.

2. **Filtrado de pedidos por turno**: El repartidor ahora solo ve los pedidos del turno activo, no todos los pedidos históricos.

3. **Creación de productos**: Se agregó la columna `imagen_url` a la tabla `productos` para que funcione correctamente la creación de productos.

4. **Columna codigo en repartidores**: Se agregó la columna `codigo` a la tabla `repartidores`.

## Instrucciones para Ejecutar las Correcciones

### Paso 1: Abrir Supabase SQL Editor

Ve a: https://supabase.com/dashboard/project/auyzmvyfscvfzrhhjejq/sql/new

### Paso 2: Copiar y Ejecutar el SQL

Copia TODO el contenido del archivo `fix_database.sql` y pégalo en el SQL Editor de Supabase.

Luego haz clic en "Run" o presiona Ctrl+Enter.

### Paso 3: Verificar

Después de ejecutar el SQL, deberías ver mensajes de éxito para cada operación.

## Cambios en el Código

### Admin (AdminApp.tsx)
- La función `abrirTurno()` ahora:
  1. Elimina todos los pedidos del turno anterior
  2. Cierra el turno anterior
  3. Crea un nuevo turno
  4. Limpia el estado local de pedidos

### Repartidor (RiderApp.tsx)
- La función `loadData()` ahora:
  1. Obtiene el turno activo
  2. Filtra los pedidos por `turno_id`
  3. Solo muestra los pedidos del turno actual

### Productos (productos/page.tsx)
- Se agregó manejo de errores mejorado
- Se agregó el campo `disponible: true` por defecto

## Despliegue

Después de ejecutar las correcciones SQL, despliega la aplicación:

```bash
npm run build
npm run start
```

O despliega a Vercel:

```bash
vercel --prod
```

## Notas Importantes

- Las correcciones SQL usan `IF NOT EXISTS` y `IF EXISTS`, por lo que son seguras de ejecutar múltiples veces.
- Todas las políticas RLS están configuradas para permitir el acceso necesario.
- El sistema de turnos ahora funciona correctamente con limpieza automática.
