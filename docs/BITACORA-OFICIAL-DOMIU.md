# DomiU Magdalena — Bitácora Oficial de Desarrollo

> Documento vivo y fuente oficial del proceso de construcción de DomiU Magdalena.

## 1. Propósito

Registrar de forma continua y verificable:

- avances funcionales y técnicos;
- decisiones de arquitectura;
- cambios en base de datos;
- migraciones aplicadas;
- errores encontrados y correcciones;
- pruebas ejecutadas y resultados;
- pendientes, riesgos y próximos pasos.

Este archivo se actualizará durante cada fase del proyecto. No se crearán documentos separados para cada avance.

## 2. Estado base del proyecto

**Fecha de inicio de la bitácora:** 13 de julio de 2026.

### Estado confirmado

- Repositorio oficial clonado y sincronizado con `origin/master`.
- Next.js 16.2.9.
- Build de producción completado correctamente.
- 161 pruebas automatizadas aprobadas.
- Supabase conectado al proyecto oficial `DomiU App 1.0`.
- Base de datos reiniciada para comenzar pruebas desde cero.
- Cuentas iniciales creadas y verificadas:
  - Administrador: rol `admin`.
  - Repartidor: rol `courier`.
  - Cliente: rol `customer`.
  - Negocio: rol `merchant`.
- Inicio de sesión y redirección por rol comprobados.
- Endpoint `/api/profile` respondiendo correctamente.

## 3. Trabajo técnico realizado antes de la Fase 1

### Seguridad y RLS

- Endurecimiento de funciones y permisos en Supabase.
- Consolidación de políticas RLS críticas.
- Protección frente a escalamiento de privilegios.
- Restricción de ejecución pública de funciones internas.
- Optimización de políticas con `(SELECT auth.uid())`.
- Revisión de pedidos, perfiles, negocios, repartidores, wallets, chats, notificaciones, cobertura y módulos financieros.

### Datos iniciales

La base fue limpiada conservando la estructura, funciones, migraciones, políticas e índices. Se eliminaron datos anteriores para comenzar una prueba controlada.

### Corrección de creación de usuarios

Se corrigió el trigger de notificación de nuevos registros que intentaba usar el valor textual `negocio` como valor del enum `user_role`. Los roles válidos son:

- `admin`
- `merchant`
- `customer`
- `courier`

## 4. Fase 1 — Gestión completa de negocios

**Estado:** Iniciada.

### Objetivo

Construir el flujo completo de registro, revisión, aprobación, creación, administración y operación de negocios dentro de DomiU.

### Alcance funcional

1. Solicitud de registro de negocio.
2. Captura y validación de información comercial.
3. Carga y revisión de documentos.
4. Revisión por el administrador.
5. Aprobación o rechazo con motivo.
6. Creación automática del negocio aprobado.
7. Asignación del usuario propietario.
8. Configuración inicial del negocio.
9. Activación, suspensión y reactivación.
10. Auditoría de todas las acciones administrativas.
11. Validación de permisos RLS.
12. Pruebas funcionales del flujo completo.

### Criterios de finalización

La Fase 1 se considerará terminada cuando:

- un usuario con rol `merchant` pueda completar su solicitud;
- el administrador pueda revisarla y decidir;
- una aprobación cree correctamente el negocio y lo vincule al propietario;
- un rechazo conserve historial y motivo;
- el negocio aprobado pueda acceder a su panel y configurar sus datos;
- ningún negocio pueda leer o modificar información de otro;
- todas las acciones relevantes queden auditadas;
- lint, pruebas y build finalicen correctamente.

## 5. Registro cronológico

### 2026-07-13 — Inicio formal de la bitácora

- Se adoptó GitHub como ubicación oficial del documento vivo.
- Se creó `docs/BITACORA-OFICIAL-DOMIU.md`.
- Se definió que este mismo archivo será actualizado durante cada fase.
- Se inició formalmente la Fase 1: Gestión completa de negocios.

## 6. Próximo bloque de trabajo

Auditar el estado actual del módulo de solicitudes y gestión de negocios en el código y en Supabase para determinar:

- qué está terminado;
- qué está incompleto;
- qué rutas, acciones y tablas participan;
- qué validaciones y políticas faltan;
- qué cambios serán necesarios para completar la Fase 1 sin duplicar funcionalidad existente.
