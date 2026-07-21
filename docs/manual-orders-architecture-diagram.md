# Diagrama de arquitectura

```text
Admin UI ─┐
          ├─ ManualOrderWizard
Merchant ─┘        │
                   ▼
          /api/manual-orders/*
                   │ auth + CSRF + Zod + rate limit
                   ▼
          manual-orders/service.ts
                   │ tenant + catálogo + cotización
                   ▼
          confirm_manual_order RPC
                   │ transacción + locks + snapshots
                   ▼
 orders ─ order_items ─ inventory movements
                   │
                   └─ triggers: tracking, pagos, finanzas, notificaciones, logística
```
