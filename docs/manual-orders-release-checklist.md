# Checklist de liberación — pedidos manuales

- [ ] Escaneo de secretos verde.
- [ ] `npm audit --audit-level=high` verde.
- [ ] Pruebas de esquema verdes.
- [ ] Pruebas de arquitectura verdes.
- [ ] TypeScript y Next.js build verdes.
- [ ] Migraciones reconstruidas desde una base limpia.
- [ ] RLS y privilegios comprobados.
- [ ] Preview de Vercel en `READY`.
- [ ] Sin logs `error` o `fatal`.
- [ ] Prueba controlada de invitado y cliente registrado.
- [ ] Prueba controlada de pickup y domicilio.
- [ ] Prueba de idempotencia.
- [ ] Prueba de stock concurrente.
- [ ] Producción desplegada.
- [ ] `/api/health` en estado `ok`.
- [ ] Plan de rollback registrado.
