# Desarrollo local

```bash
npm ci
npx vitest run src/test/manual-orders-schema.test.ts
npx vitest run src/test/manual-orders-architecture.test.ts
npm run build
npm run dev
```

Usar una base Supabase de desarrollo reconstruida con las migraciones. No probar contra clientes, inventario o pedidos reales. Las variables privadas permanecen únicamente en `.env.local`.
