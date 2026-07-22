# Matriz de regresión

| Caso | Resultado esperado |
|---|---|
| Negocio publica `preparing -> ready` | Pedido visible para repartidores y evento de tracking creado |
| Dos actores intentan publicar/cancelar el mismo pedido | Solo una transición condicional se confirma |
| Repartidor sin jornada | Listas operativas vacías |
| Repartidor abre jornada nueva | No aparecen entregas de jornadas anteriores |
| Pedido entregado durante jornada | Aparece únicamente en historial de la jornada actual |
| Cambio a `courier` | Perfil `profiles.role=courier` y fila `drivers` existente |
| Cambio desde `courier` | Historial preservado; conductor queda offline e inactivo |
| Autorregistro intenta rol no cliente | Registro rechazado explícitamente |
| Admin secundario intenta asignar admin | Operación rechazada |
