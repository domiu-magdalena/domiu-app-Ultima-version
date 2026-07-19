# Domi — agente personal integrado

Fecha: 19 de julio de 2026

## Resultado

Domi deja de funcionar como un chat aislado y pasa a operar como un agente integrado a DomiU. El sistema combina contexto autenticado, conversación persistente, memoria autorizada, datos reales, herramientas controladas, planificación de compra, voz, proactividad y aprendizaje supervisado.

Domi no afirma tener conciencia, emociones reales ni vida propia. Su autonomía está limitada por el rol, los permisos, el tenant, el nivel de riesgo y las reglas de confirmación.

## Flujo de conversación

1. Autenticar usuario y perfil.
2. Construir contexto exclusivamente en el backend.
3. Verificar estado de cuenta, rate limit, idempotencia y propiedad de conversación.
4. Aplicar reglas de seguridad y bloqueo de instrucciones maliciosas.
5. Recuperar mensajes recientes, objetivo activo y memorias autorizadas.
6. Clasificar intención y extraer restricciones, consulta y presupuesto.
7. Elegir una herramienta controlada o un flujo conversacional.
8. Consultar datos actuales de DomiU.
9. Validar disponibilidad, propiedad, permisos y estado.
10. Calcular y comparar resultados.
11. Preparar acciones reversibles o solicitar confirmación cuando corresponda.
12. Persistir respuesta, contexto, auditoría y candidato de aprendizaje.

## Asistencia completa de compra

El perfil cliente puede pedir recomendaciones abiertas o indicar un presupuesto en pesos colombianos. El motor consulta:

- productos disponibles;
- existencias actuales;
- negocios activos, abiertos y recibiendo pedidos;
- precio y descuento registrados;
- calificación del producto y del negocio;
- productos y negocios favoritos;
- preferencias autorizadas;
- dirección principal;
- configuración vigente de domicilio;
- configuración vigente de tarifa de servicio;
- tiempo de preparación.

Cada recomendación distingue datos confirmados de valores estimados. El total presentado incluye producto, domicilio y tarifa de servicio. Domi no inventa negocios, precios, promociones, existencias, tiempos ni calificaciones.

## Carrito y borrador de pedido

Cuando el usuario elige una recomendación, Domi:

- revalida producto, inventario y negocio;
- recalcula precio y cargos;
- crea un borrador reversible en `domi_order_drafts`;
- reemplaza de forma atómica el carrito visible de React;
- conserva la dirección como provisional;
- muestra el total estimado;
- dirige al carrito o al checkout.

Domi no crea el pedido definitivo en este flujo y no ejecuta pagos. El usuario debe confirmar dirección, método y pago manualmente.

## Promociones, cupones, direcciones y pagos

Domi consulta únicamente promociones y cupones activos. También puede mostrar direcciones y métodos de pago pertenecientes al usuario autenticado. Los datos financieros sensibles nunca se incluyen en respuestas ni memorias.

## Conversaciones y objetivos

Cada conversación conserva:

- título;
- resumen;
- mensajes;
- contexto actual;
- objetivo activo;
- fecha del último mensaje;
- estado activa, pausada, completada o archivada.

Domi puede retomar un hilo anterior y conservar el próximo paso, por ejemplo revisar el carrito, elegir dirección o continuar al pago manual.

## Memoria controlada

El usuario puede:

- consultar recuerdos;
- guardar una preferencia con consentimiento;
- rechazar un candidato;
- corregir un recuerdo específico;
- eliminar un recuerdo específico;
- borrar toda la memoria mediante confirmación;
- desactivar la memoria sin borrar lo existente.

Nunca se guardan contraseñas, tarjetas completas, PIN, CVV, tokens, claves bancarias, datos médicos, información de terceros o contenido sin finalidad operativa.

## Voz

La interfaz incorpora reconocimiento y síntesis de voz del navegador:

- botón independiente para hablar con Domi;
- transcripción enviada al mismo chat seguro;
- respuesta hablada opcional;
- interrupción de escucha y lectura;
- idioma configurable;
- auditoría de inicio y cierre de sesión.

No se almacenan grabaciones de audio. La disponibilidad depende del soporte y los permisos del navegador.

## Proactividad

Los avisos proactivos están sujetos a consentimiento, frecuencia y horario silencioso. Solo se generan a partir de datos verificados:

- pedidos que superaron el tiempo estimado;
- borradores de compra pendientes;
- cupones que vencen pronto;
- objetivos activos de conversación.

El usuario puede leer, descartar o desactivar los avisos. Un error del módulo proactivo nunca bloquea la aplicación.

## Aprendizaje supervisado

Domi registra candidatos privados cuando detecta:

- una corrección explícita;
- una preferencia recurrente;
- una capacidad faltante;
- retroalimentación negativa sobre una respuesta.

Ningún candidato se convierte automáticamente en conocimiento global. El panel `/admin/domi` permite:

1. revisar métricas y evaluaciones;
2. aprobar o rechazar candidatos;
3. impedir que preferencias privadas se publiquen;
4. redactar manualmente un artículo general verificado;
5. publicar el artículo con trazabilidad administrativa.

## Persistencia añadida

- `domi_order_drafts`
- `domi_learning_candidates`
- `domi_evaluations`
- `domi_proactive_events`
- `domi_voice_sessions`
- nuevas preferencias en `domi_user_settings`

Las tablas tienen RLS. El cliente autenticado solo puede leer sus propios borradores, evaluaciones, eventos y sesiones. Los candidatos de aprendizaje son visibles únicamente para administradores y las escrituras se ejecutan mediante servicios backend.

## Seguridad conservada

Domi no puede:

- ejecutar pagos o transferencias;
- retirar dinero;
- procesar reembolsos automáticamente;
- crear administradores;
- modificar roles o permisos;
- suspender usuarios desde conversación libre;
- exportar datos personales;
- leer conversaciones o datos de terceros;
- consultar directamente la base de datos sin herramientas autorizadas;
- publicar preferencias privadas como conocimiento global.

## APIs nuevas

- `GET/PUT /api/domi/settings`
- `GET/PATCH /api/domi/proactive`
- `POST /api/domi/feedback`
- `POST /api/domi/voice`
- `GET/POST /api/admin/domi`

Todas requieren autenticación; el endpoint administrativo exige rol de administrador.

## Interfaz nueva

- `DomiAgentBridge`: aplica comandos verificados al carrito.
- `DomiVoiceDock`: conversación por voz.
- `DomiProactiveDock`: avisos consentidos.
- `DomiFeedbackDock`: evaluación explícita.
- `/admin/domi`: panel de evaluación y aprendizaje.

Todos los módulos se ejecutan dentro del límite de error de Domi para proteger el resto de DomiU.

## Pruebas

La suite valida:

- seguridad y contexto;
- separación por rol y tenant;
- idempotencia y confirmaciones;
- conversaciones persistentes;
- estabilidad de hooks y sesión;
- clasificación de presupuestos e intenciones;
- ausencia de automatizaciones financieras sensibles;
- preparación de carrito sin crear pedido o pago;
- aprendizaje supervisado;
- voz sin almacenamiento de audio;
- proactividad condicionada por consentimiento;
- compilación completa de TypeScript y Next.js.

## Operación

La aplicación no depende de una clave nueva de un proveedor de modelos para ejecutar estos flujos. Las recomendaciones y acciones utilizan datos actuales de DomiU y reglas auditables. Un modelo conversacional externo podrá añadirse posteriormente como capa de redacción y comprensión, pero nunca sustituirá los controles de permisos, herramientas, confirmaciones, RLS ni auditoría implementados aquí.
