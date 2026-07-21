# Notas para revisión del PR

Revisar especialmente:

- función `confirm_manual_order` y rollback transaccional;
- compatibilidad de triggers de tarifa y finanzas;
- nulabilidad controlada de cliente, dirección y producto;
- lecturas con snapshots;
- privilegios de la función y RLS;
- UX móvil y confirmación;
- pruebas concurrentes de stock e idempotencia.
