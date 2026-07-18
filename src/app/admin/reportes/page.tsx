'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bike,
  Building2,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  ShoppingBag,
  Store,
  Users,
  WalletCards,
  XCircle,
} from 'lucide-react';
import { getBrowserClient } from '@/lib/db/supabase';
import { formatCOP, formatCOPNumber } from '@/lib/money';
import { DOMIU_OFFICIAL_LOGO_DATA_URI } from '@/lib/brand-assets';

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  business_id: string;
  courier_id: string | null;
  created_at: string;
}

interface LedgerRow {
  business_id: string;
  courier_id: string | null;
  product_subtotal: number;
  merchant_earnings: number;
  delivery_fee: number;
  courier_gross_earnings: number;
  courier_commission: number;
  courier_net_earnings: number;
  platform_service_fee: number;
  platform_delivery_commission: number;
  platform_total_earnings: number;
  customer_total: number;
  finalized_at: string;
}

interface BusinessSummary {
  id: string;
  name: string;
  orders: number;
  productSales: number;
  customerValue: number;
}

interface CourierSummary {
  id: string;
  name: string;
  deliveries: number;
  grossDelivery: number;
  commission: number;
  netEarnings: number;
}

interface DailyReport {
  date: string;
  operationStatus: 'open' | 'closed' | 'not_created';
  operationOpenedAt: string | null;
  operationClosedAt: string | null;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  activeOrders: number;
  pendingOrders: number;
  registeredUsers: number;
  registeredCustomers: number;
  registeredMerchants: number;
  registeredCouriers: number;
  registeredBusinesses: number;
  activeCouriers: number;
  businessShifts: number;
  courierShifts: number;
  settlementsGenerated: number;
  settlementsPaid: number;
  productSales: number;
  deliveryValue: number;
  courierNetEarnings: number;
  platformDeliveryCommission: number;
  platformServiceFees: number;
  platformRevenue: number;
  grossCustomerValue: number;
  businessSales: BusinessSummary[];
  courierResults: CourierSummary[];
  statusBreakdown: Array<{ status: string; count: number }>;
}

function localDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function dateBounds(date: string) {
  const start = new Date(`${date}T00:00:00-05:00`);
  const end = new Date(start.getTime() + 86400000);
  return { start: start.toISOString(), end: end.toISOString() };
}

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function download(content: string, fileName: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function statusName(status: string) {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    preparing: 'Preparando',
    ready: 'Listo',
    assigned: 'Asignado',
    accepted: 'Aceptado',
    picked_up: 'Recogido',
    in_transit: 'En camino',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
    rejected: 'Rechazado',
  };
  return labels[status] || status.replaceAll('_', ' ');
}

function exportExcel(report: DailyReport) {
  const metricRows = [
    ['Fecha', report.date],
    ['Estado operativo', report.operationStatus === 'open' ? 'Abierto' : report.operationStatus === 'closed' ? 'Cerrado' : 'Sin jornada'],
    ['Pedidos creados', report.totalOrders],
    ['Pedidos entregados', report.deliveredOrders],
    ['Pedidos activos', report.activeOrders],
    ['Pedidos cancelados', report.cancelledOrders],
    ['Usuarios registrados', report.registeredUsers],
    ['Comercios registrados', report.registeredBusinesses],
    ['Repartidores activos', report.activeCouriers],
    ['Venta de productos', formatCOPNumber(report.productSales)],
    ['Valor de domicilios', formatCOPNumber(report.deliveryValue)],
    ['Ganancia neta repartidores', formatCOPNumber(report.courierNetEarnings)],
    ['Comisión DomiU por domicilios', formatCOPNumber(report.platformDeliveryCommission)],
    ['Tarifas de servicio', formatCOPNumber(report.platformServiceFees)],
    ['Ganancia DomiU', formatCOPNumber(report.platformRevenue)],
    ['Valor pagado por clientes', formatCOPNumber(report.grossCustomerValue)],
  ];

  const table = (rows: Array<Array<string | number>>) => `<table border="1" cellspacing="0" cellpadding="5">${rows.map((row) => `<tr>${row.map((cell, index) => `<${index === 0 ? 'th' : 'td'}>${escapeHtml(cell)}</${index === 0 ? 'th' : 'td'}>`).join('')}</tr>`).join('')}</table>`;
  const businessRows: Array<Array<string | number>> = [['Comercio', 'Pedidos entregados', 'Venta de productos', 'Valor pagado por clientes'], ...report.businessSales.map((business) => [business.name, business.orders, formatCOPNumber(business.productSales), formatCOPNumber(business.customerValue)])];
  const courierRows: Array<Array<string | number>> = [['Repartidor', 'Entregas', 'Domicilios brutos', 'Comisión DomiU', 'Ganancia neta'], ...report.courierResults.map((courier) => [courier.name, courier.deliveries, formatCOPNumber(courier.grossDelivery), formatCOPNumber(courier.commission), formatCOPNumber(courier.netEarnings)])];
  const statusRows: Array<Array<string | number>> = [['Estado', 'Cantidad'], ...report.statusBreakdown.map((row) => [statusName(row.status), row.count])];

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial}h1,h2{background:#17191f;color:white;padding:10px}h1{background:#ffd400;color:#17191f}table{border-collapse:collapse;margin-bottom:22px}th{background:#fff3a3;font-weight:700}</style></head><body><h1>DomiU Magdalena — Reporte diario ${escapeHtml(report.date)}</h1><h2>Resumen</h2>${table(metricRows)}<h2>Estados de pedidos</h2>${table(statusRows)}<h2>Ventas por comercio</h2>${table(businessRows)}<h2>Resultados por repartidor</h2>${table(courierRows)}</body></html>`;
  download(html, `reporte-diario-domiu-${report.date}.xls`, 'application/vnd.ms-excel;charset=utf-8');
}

function printPdf(report: DailyReport) {
  const popup = window.open('', '_blank', 'width=1100,height=900');
  if (!popup) return;
  const cards = [
    ['Pedidos', report.totalOrders],
    ['Entregados', report.deliveredOrders],
    ['Usuarios nuevos', report.registeredUsers],
    ['Comercios nuevos', report.registeredBusinesses],
    ['Ventas productos', formatCOP(report.productSales)],
    ['Domicilios', formatCOP(report.deliveryValue)],
    ['Ganancia repartidores', formatCOP(report.courierNetEarnings)],
    ['Ganancia DomiU', formatCOP(report.platformRevenue)],
  ];
  const businessRows = report.businessSales.map((business) => `<tr><td>${escapeHtml(business.name)}</td><td>${business.orders}</td><td>${formatCOP(business.productSales)}</td><td>${formatCOP(business.customerValue)}</td></tr>`).join('');
  const courierRows = report.courierResults.map((courier) => `<tr><td>${escapeHtml(courier.name)}</td><td>${courier.deliveries}</td><td>${formatCOP(courier.grossDelivery)}</td><td>${formatCOP(courier.commission)}</td><td>${formatCOP(courier.netEarnings)}</td></tr>`).join('');
  const statusRows = report.statusBreakdown.map((row) => `<tr><td>${escapeHtml(statusName(row.status))}</td><td>${row.count}</td></tr>`).join('');

  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Reporte DomiU ${escapeHtml(report.date)}</title><style>
    @page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#17191f}.header{display:flex;align-items:center;justify-content:space-between;border-bottom:5px solid #ffd400;padding-bottom:12px}.logo{width:125px;height:78px;object-fit:contain}.title{text-align:right}.title h1{font-size:25px;margin:0}.title p{font-size:11px;color:#69717d}.status{display:inline-block;margin-top:6px;padding:6px 10px;border-radius:999px;background:${report.operationStatus === 'open' ? '#dcfce7' : '#fef3c7'};font-size:10px;font-weight:700}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0}.card{border:1px solid #e0e3e8;border-radius:12px;padding:12px}.card span{font-size:9px;color:#707782;text-transform:uppercase}.card strong{display:block;margin-top:5px;font-size:17px}.section{margin-top:18px}.section h2{font-size:15px;margin:0 0 8px;border-left:5px solid #ffd400;padding-left:8px}table{width:100%;border-collapse:collapse;font-size:9px}th{background:#17191f;color:white;text-align:left;padding:7px}td{border-bottom:1px solid #e5e7eb;padding:7px}.columns{display:grid;grid-template-columns:.7fr 1.3fr;gap:16px}.footer{margin-top:18px;border-top:1px solid #ddd;padding-top:10px;font-size:8px;color:#737b87}button{margin-top:16px;border:0;border-radius:10px;background:#17191f;color:white;padding:10px 16px;font-weight:700}@media print{button{display:none}}
  </style></head><body><header class="header"><img class="logo" src="${DOMIU_OFFICIAL_LOGO_DATA_URI}" alt="DomiU"><div class="title"><h1>Reporte diario de operación</h1><p>${escapeHtml(report.date)} · generado ${new Date().toLocaleString('es-CO')} · valores en COP</p><span class="status">Operación ${report.operationStatus === 'open' ? 'abierta' : report.operationStatus === 'closed' ? 'cerrada' : 'sin jornada'}</span></div></header><div class="cards">${cards.map(([label, value]) => `<div class="card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}</div><div class="columns"><section class="section"><h2>Estados de pedidos</h2><table><thead><tr><th>Estado</th><th>Cantidad</th></tr></thead><tbody>${statusRows || '<tr><td colspan="2">Sin datos</td></tr>'}</tbody></table></section><section class="section"><h2>Resumen financiero</h2><table><tbody><tr><td>Tarifas de servicio</td><td>${formatCOP(report.platformServiceFees)}</td></tr><tr><td>Comisión por domicilios</td><td>${formatCOP(report.platformDeliveryCommission)}</td></tr><tr><td>Ganancia total DomiU</td><td><strong>${formatCOP(report.platformRevenue)}</strong></td></tr><tr><td>Valor total pagado por clientes</td><td>${formatCOP(report.grossCustomerValue)}</td></tr><tr><td>Liquidaciones generadas / pagadas</td><td>${report.settlementsGenerated} / ${report.settlementsPaid}</td></tr><tr><td>Jornadas comercio / repartidor</td><td>${report.businessShifts} / ${report.courierShifts}</td></tr></tbody></table></section></div><section class="section"><h2>Ventas por comercio</h2><table><thead><tr><th>Comercio</th><th>Pedidos</th><th>Venta de productos</th><th>Valor cliente</th></tr></thead><tbody>${businessRows || '<tr><td colspan="4">Sin ventas entregadas</td></tr>'}</tbody></table></section><section class="section"><h2>Resultados por repartidor</h2><table><thead><tr><th>Repartidor</th><th>Entregas</th><th>Domicilios brutos</th><th>Comisión DomiU</th><th>Ganancia neta</th></tr></thead><tbody>${courierRows || '<tr><td colspan="5">Sin entregas registradas</td></tr>'}</tbody></table></section><footer class="footer">Documento operativo generado por DomiU Magdalena. Los importes financieros provienen del libro financiero de pedidos entregados. Las cifras deben conciliarse con liquidaciones y comprobantes antes del cierre contable definitivo.</footer><button onclick="window.print()">Guardar o imprimir PDF</button></body></html>`);
  popup.document.close();
  popup.focus();
  window.setTimeout(() => popup.print(), 600);
}

export default function AdminReports() {
  const [date, setDate] = useState(localDate());
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const supabase = getBrowserClient();
    const bounds = dateBounds(date);
    try {
      const [ordersResult, ledgerResult, profilesResult, registeredBusinessResult, allBusinessesResult, courierProfilesResult, driversResult, businessShiftsResult, courierShiftsResult, settlementsResult, operationResult] = await Promise.all([
        supabase.from('orders').select('id,order_number,status,business_id,courier_id,created_at').gte('created_at', bounds.start).lt('created_at', bounds.end).is('deleted_at', null),
        supabase.from('order_financial_ledger').select('business_id,courier_id,product_subtotal,merchant_earnings,delivery_fee,courier_gross_earnings,courier_commission,courier_net_earnings,platform_service_fee,platform_delivery_commission,platform_total_earnings,customer_total,finalized_at').gte('finalized_at', bounds.start).lt('finalized_at', bounds.end),
        supabase.from('profiles').select('id,role').gte('created_at', bounds.start).lt('created_at', bounds.end).is('deleted_at', null),
        supabase.from('businesses').select('id').gte('created_at', bounds.start).lt('created_at', bounds.end).is('deleted_at', null),
        supabase.from('businesses').select('id,name').is('deleted_at', null),
        supabase.from('profiles').select('id,first_name,last_name').eq('role', 'courier').is('deleted_at', null),
        supabase.from('drivers').select('id,status,is_active').eq('is_active', true).is('deleted_at', null),
        supabase.from('business_shifts').select('id,status,opened_at,closed_at').gte('opened_at', bounds.start).lt('opened_at', bounds.end),
        supabase.from('courier_shifts').select('id,status,started_at,ended_at').gte('started_at', bounds.start).lt('started_at', bounds.end),
        supabase.from('settlement_batches').select('id,status').gte('created_at', bounds.start).lt('created_at', bounds.end),
        supabase.from('operations_days').select('status,opened_at,closed_at').eq('operation_date', date).maybeSingle(),
      ]);

      const failures = [ordersResult, ledgerResult, profilesResult, registeredBusinessResult, allBusinessesResult, courierProfilesResult, driversResult, businessShiftsResult, courierShiftsResult, settlementsResult, operationResult].map((result) => result.error).filter(Boolean);
      if (failures.length) throw new Error(failures[0]?.message || 'No se pudo construir el reporte');

      const orders = (ordersResult.data ?? []) as OrderRow[];
      const ledger = (ledgerResult.data ?? []).map((row) => ({
        ...row,
        product_subtotal: number(row.product_subtotal),
        merchant_earnings: number(row.merchant_earnings),
        delivery_fee: number(row.delivery_fee),
        courier_gross_earnings: number(row.courier_gross_earnings),
        courier_commission: number(row.courier_commission),
        courier_net_earnings: number(row.courier_net_earnings),
        platform_service_fee: number(row.platform_service_fee),
        platform_delivery_commission: number(row.platform_delivery_commission),
        platform_total_earnings: number(row.platform_total_earnings),
        customer_total: number(row.customer_total),
      })) as LedgerRow[];

      const businessNames = new Map((allBusinessesResult.data ?? []).map((business) => [business.id, business.name || 'Comercio']));
      const courierNames = new Map((courierProfilesResult.data ?? []).map((courier) => [courier.id, `${courier.first_name || ''} ${courier.last_name || ''}`.trim() || 'Repartidor']));
      const businessMap = new Map<string, BusinessSummary>();
      const courierMap = new Map<string, CourierSummary>();
      for (const row of ledger) {
        const business = businessMap.get(row.business_id) ?? { id: row.business_id, name: businessNames.get(row.business_id) || 'Comercio', orders: 0, productSales: 0, customerValue: 0 };
        business.orders += 1;
        business.productSales += row.merchant_earnings;
        business.customerValue += row.customer_total;
        businessMap.set(row.business_id, business);
        if (row.courier_id) {
          const courier = courierMap.get(row.courier_id) ?? { id: row.courier_id, name: courierNames.get(row.courier_id) || 'Repartidor', deliveries: 0, grossDelivery: 0, commission: 0, netEarnings: 0 };
          courier.deliveries += 1;
          courier.grossDelivery += row.courier_gross_earnings;
          courier.commission += row.courier_commission;
          courier.netEarnings += row.courier_net_earnings;
          courierMap.set(row.courier_id, courier);
        }
      }

      const statuses = new Map<string, number>();
      for (const order of orders) statuses.set(order.status, (statuses.get(order.status) ?? 0) + 1);
      const profiles = profilesResult.data ?? [];
      const settlements = settlementsResult.data ?? [];
      const activeStatuses = new Set(['confirmed', 'preparing', 'ready', 'assigned', 'accepted', 'picked_up', 'in_transit']);
      const operation = operationResult.data;

      setReport({
        date,
        operationStatus: operation?.status === 'open' ? 'open' : operation?.status === 'closed' ? 'closed' : 'not_created',
        operationOpenedAt: operation?.opened_at ?? null,
        operationClosedAt: operation?.closed_at ?? null,
        totalOrders: orders.length,
        deliveredOrders: orders.filter((order) => order.status === 'delivered').length,
        cancelledOrders: orders.filter((order) => ['cancelled', 'rejected'].includes(order.status)).length,
        activeOrders: orders.filter((order) => activeStatuses.has(order.status)).length,
        pendingOrders: orders.filter((order) => order.status === 'pending').length,
        registeredUsers: profiles.length,
        registeredCustomers: profiles.filter((profile) => profile.role === 'customer').length,
        registeredMerchants: profiles.filter((profile) => profile.role === 'merchant').length,
        registeredCouriers: profiles.filter((profile) => profile.role === 'courier').length,
        registeredBusinesses: registeredBusinessResult.data?.length ?? 0,
        activeCouriers: driversResult.data?.length ?? 0,
        businessShifts: businessShiftsResult.data?.length ?? 0,
        courierShifts: courierShiftsResult.data?.length ?? 0,
        settlementsGenerated: settlements.length,
        settlementsPaid: settlements.filter((settlement) => settlement.status === 'paid').length,
        productSales: ledger.reduce((sum, row) => sum + row.merchant_earnings, 0),
        deliveryValue: ledger.reduce((sum, row) => sum + row.delivery_fee, 0),
        courierNetEarnings: ledger.reduce((sum, row) => sum + row.courier_net_earnings, 0),
        platformDeliveryCommission: ledger.reduce((sum, row) => sum + row.platform_delivery_commission, 0),
        platformServiceFees: ledger.reduce((sum, row) => sum + row.platform_service_fee, 0),
        platformRevenue: ledger.reduce((sum, row) => sum + row.platform_total_earnings, 0),
        grossCustomerValue: ledger.reduce((sum, row) => sum + row.customer_total, 0),
        businessSales: Array.from(businessMap.values()).sort((a, b) => b.productSales - a.productSales),
        courierResults: Array.from(courierMap.values()).sort((a, b) => b.netEarnings - a.netEarnings),
        statusBreakdown: Array.from(statuses.entries()).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count),
      });
    } catch (cause) {
      setReport(null);
      setError(cause instanceof Error ? cause.message : 'No se pudo generar el reporte diario');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { void load(); }, [load]);

  const cards = useMemo(() => report ? [
    { label: 'Pedidos creados', value: report.totalOrders, icon: ShoppingBag, tone: 'bg-violet-50 text-violet-700' },
    { label: 'Entregados', value: report.deliveredOrders, icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Activos', value: report.activeOrders, icon: Activity, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Cancelados', value: report.cancelledOrders, icon: XCircle, tone: 'bg-red-50 text-red-700' },
    { label: 'Usuarios nuevos', value: report.registeredUsers, icon: Users, tone: 'bg-cyan-50 text-cyan-700' },
    { label: 'Comercios nuevos', value: report.registeredBusinesses, icon: Building2, tone: 'bg-amber-50 text-amber-700' },
    { label: 'Repartidores activos', value: report.activeCouriers, icon: Bike, tone: 'bg-orange-50 text-orange-700' },
    { label: 'Ganancia DomiU', value: formatCOP(report.platformRevenue), icon: WalletCards, tone: 'bg-yellow-50 text-yellow-800' },
  ] : [], [report]);

  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-[2rem] bg-[#17191F] p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div><p className="text-xs font-black uppercase tracking-[.18em] text-[#FFD400]">Inteligencia operativa</p><h1 className="mt-2 text-3xl font-black">Reporte diario DomiU</h1><p className="mt-2 max-w-2xl text-sm text-white/65">Consolida operación, registros, ventas de comercios, ganancias de repartidores, ingresos de DomiU, jornadas y liquidaciones.</p></div>
          <div className="flex flex-wrap items-center gap-2"><input type="date" value={date} max={localDate()} onChange={(event) => setDate(event.target.value)} className="h-11 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white [color-scheme:dark]" /><button type="button" onClick={() => void load()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-bold"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</button>{report && <><button type="button" onClick={() => printPdf(report)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#FFD400] px-4 text-sm font-black text-[#17191F]"><Printer className="h-4 w-4" />PDF</button><button type="button" onClick={() => exportExcel(report)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-bold"><FileSpreadsheet className="h-4 w-4" />Excel</button></>}</div>
        </div>
      </section>

      {error && <p className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
      {loading && !report ? <div className="rounded-3xl border bg-card p-12 text-center text-sm text-muted-foreground">Construyendo reporte desde la base financiera…</div> : report && <>
        <section className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-5 py-4 ${report.operationStatus === 'open' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><div><p className="font-black">Operación {report.operationStatus === 'open' ? 'abierta' : report.operationStatus === 'closed' ? 'cerrada' : 'sin jornada registrada'}</p><p className="mt-1 text-xs text-muted-foreground">Apertura: {report.operationOpenedAt ? new Date(report.operationOpenedAt).toLocaleString('es-CO') : 'No registrada'} · Cierre: {report.operationClosedAt ? new Date(report.operationClosedAt).toLocaleString('es-CO') : 'No registrado'}</p></div><Clock3 className="h-5 w-5" /></section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon, tone }) => <article key={label} className="rounded-3xl border bg-card p-5 shadow-sm"><span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}><Icon className="h-5 w-5" /></span><p className="mt-4 text-xs font-bold uppercase text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></article>)}</section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border bg-card p-5"><Store className="h-5 w-5 text-emerald-600" /><p className="mt-4 text-xs uppercase text-muted-foreground">Venta de productos</p><p className="mt-1 text-xl font-black">{formatCOP(report.productSales)}</p></article>
          <article className="rounded-3xl border bg-card p-5"><Bike className="h-5 w-5 text-blue-600" /><p className="mt-4 text-xs uppercase text-muted-foreground">Valor de domicilios</p><p className="mt-1 text-xl font-black">{formatCOP(report.deliveryValue)}</p></article>
          <article className="rounded-3xl border bg-card p-5"><WalletCards className="h-5 w-5 text-violet-600" /><p className="mt-4 text-xs uppercase text-muted-foreground">Ganancia repartidores</p><p className="mt-1 text-xl font-black">{formatCOP(report.courierNetEarnings)}</p></article>
          <article className="rounded-3xl border bg-card p-5"><WalletCards className="h-5 w-5 text-amber-600" /><p className="mt-4 text-xs uppercase text-muted-foreground">Pagado por clientes</p><p className="mt-1 text-xl font-black">{formatCOP(report.grossCustomerValue)}</p></article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[.75fr_1.25fr]">
          <article className="rounded-3xl border bg-card p-5 shadow-sm"><h2 className="font-black">Estados de pedidos</h2><div className="mt-4 space-y-2">{report.statusBreakdown.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Sin pedidos creados.</p> : report.statusBreakdown.map((row) => <div key={row.status} className="flex justify-between rounded-2xl bg-muted/40 px-4 py-3 text-sm"><span>{statusName(row.status)}</span><strong>{row.count}</strong></div>)}</div></article>
          <article className="rounded-3xl border bg-card p-5 shadow-sm"><h2 className="font-black">Ingresos de DomiU</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-yellow-50 p-4"><p className="text-xs text-yellow-800">Tarifas de servicio</p><p className="mt-1 text-xl font-black text-yellow-900">{formatCOP(report.platformServiceFees)}</p></div><div className="rounded-2xl bg-orange-50 p-4"><p className="text-xs text-orange-800">Comisión de domicilios</p><p className="mt-1 text-xl font-black text-orange-900">{formatCOP(report.platformDeliveryCommission)}</p></div><div className="rounded-2xl bg-[#17191F] p-4 text-white sm:col-span-2"><p className="text-xs text-white/60">Ganancia total DomiU</p><p className="mt-1 text-3xl font-black text-[#FFD400]">{formatCOP(report.platformRevenue)}</p></div></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-2xl border p-4"><p className="text-xs text-muted-foreground">Liquidaciones generadas</p><p className="mt-1 text-xl font-black">{report.settlementsGenerated}</p></div><div className="rounded-2xl border p-4"><p className="text-xs text-muted-foreground">Liquidaciones pagadas</p><p className="mt-1 text-xl font-black">{report.settlementsPaid}</p></div></div></article>
        </section>

        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm"><header className="border-b px-5 py-4"><h2 className="font-black">Ventas por comercio</h2><p className="text-xs text-muted-foreground">Solo pedidos entregados dentro de la fecha seleccionada.</p></header><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-4">Comercio</th><th className="p-4">Pedidos</th><th className="p-4">Venta de productos</th><th className="p-4">Valor pagado por clientes</th></tr></thead><tbody>{report.businessSales.length === 0 ? <tr><td colSpan={4} className="p-10 text-center text-muted-foreground">No hay ventas entregadas.</td></tr> : report.businessSales.map((business) => <tr key={business.id} className="border-t"><td className="p-4 font-black">{business.name}</td><td className="p-4">{business.orders}</td><td className="p-4 font-bold text-emerald-700">{formatCOP(business.productSales)}</td><td className="p-4">{formatCOP(business.customerValue)}</td></tr>)}</tbody></table></div></section>

        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm"><header className="border-b px-5 py-4"><h2 className="font-black">Resultados por repartidor</h2><p className="text-xs text-muted-foreground">Entregas, valor bruto, comisión y ganancia neta.</p></header><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-sm"><thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-4">Repartidor</th><th className="p-4">Entregas</th><th className="p-4">Domicilios brutos</th><th className="p-4">Comisión DomiU</th><th className="p-4">Ganancia neta</th></tr></thead><tbody>{report.courierResults.length === 0 ? <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No hay entregas financieras registradas.</td></tr> : report.courierResults.map((courier) => <tr key={courier.id} className="border-t"><td className="p-4 font-black">{courier.name}</td><td className="p-4">{courier.deliveries}</td><td className="p-4">{formatCOP(courier.grossDelivery)}</td><td className="p-4 text-amber-700">{formatCOP(courier.commission)}</td><td className="p-4 font-black text-emerald-700">{formatCOP(courier.netEarnings)}</td></tr>)}</tbody></table></div></section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><article className="rounded-3xl border bg-card p-5"><Users className="h-5 w-5 text-primary" /><p className="mt-4 text-xs text-muted-foreground">Clientes nuevos</p><p className="mt-1 text-xl font-black">{report.registeredCustomers}</p></article><article className="rounded-3xl border bg-card p-5"><Store className="h-5 w-5 text-primary" /><p className="mt-4 text-xs text-muted-foreground">Perfiles de comercio nuevos</p><p className="mt-1 text-xl font-black">{report.registeredMerchants}</p></article><article className="rounded-3xl border bg-card p-5"><Bike className="h-5 w-5 text-primary" /><p className="mt-4 text-xs text-muted-foreground">Repartidores nuevos</p><p className="mt-1 text-xl font-black">{report.registeredCouriers}</p></article><article className="rounded-3xl border bg-card p-5"><Clock3 className="h-5 w-5 text-primary" /><p className="mt-4 text-xs text-muted-foreground">Jornadas comercio / repartidor</p><p className="mt-1 text-xl font-black">{report.businessShifts} / {report.courierShifts}</p></article></section>
      </>}
    </div>
  );
}
