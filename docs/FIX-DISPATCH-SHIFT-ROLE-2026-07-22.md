# Corrección de publicación, jornadas y roles — 22 de julio de 2026

## Problemas corregidos

1. Los comercios no podían publicar pedidos para repartidores porque el cambio de estado se ejecutaba directamente desde el navegador y dependía de RLS.
2. La aplicación del repartidor mezclaba pedidos entregados de jornadas anteriores con la jornada nueva.
3. La asignación de roles podía guardar un rol distinto al seleccionado o dejar un repartidor sin perfil operativo.

## Comportamiento esperado

- La publicación se procesa en servidor, valida propiedad del negocio, transición de estado y concurrencia.
- Al no existir jornada abierta, las listas operativas del repartidor quedan vacías.
- Con jornada abierta, los pedidos activos, entregados, ganancias y solicitudes corresponden únicamente a esa jornada.
- El historial completo permanece en base de datos y continúa disponible para administración, auditoría y liquidaciones.
- Los roles administrativos se asignan únicamente por el administrador principal.
- Al asignar `courier`, se verifica que exista el registro correspondiente en `drivers`; si no existe, el cambio se revierte.
- El autorregistro público solo crea cuentas `customer` y nunca transforma silenciosamente otro rol en cliente.

## Validación funcional recomendada

1. Crear o seleccionar un pedido de negocio en estado `preparing`.
2. Pulsar **Marcar listo y publicar** y confirmar que cambia a `ready`.
3. Abrir una jornada nueva para un repartidor sin pedidos activos.
4. Confirmar que Activo e Historial inician vacíos.
5. Publicar un pedido y confirmar que aparece en Disponibles.
6. Aceptarlo, completar la entrega y confirmar que aparece en el historial de la jornada actual.
7. Cerrar la jornada, abrir otra y confirmar que el pedido anterior ya no aparece en el panel operativo.
8. Desde Administración, cambiar una cuenta a Cliente, Repartidor y Negocio y comprobar que cada inicio de sesión abre el panel correspondiente.
