import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server-auth';
import { getServiceClient } from '@/lib/db/supabase';
import { ADMIN_ROLES } from '@/types/auth';

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function cell(value: unknown, style = '') {
  return `<Cell${style ? ` ss:StyleID="${style}"` : ''}><Data ss:Type="String">${escapeXml(
    value,
  )}</Data></Cell>`;
}

function cop(value: unknown) {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(
    Math.round(Number(value ?? 0)),
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }
  if (!ADMIN_ROLES.includes(auth.session.profile.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const date = request.nextUrl.searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const supabase = getServiceClient();
  const start = `${date}T00:00:00-05:00`;
  const endDate = new Date(`${date}T00:00:00-05:00`);
  endDate.setDate(endDate.getDate() + 1);
  const end = endDate.toISOString();

  const [summaryResult, ordersResult, businessesResult, sessionsResult] = await Promise.all([
    supabase.from('daily_company_operations_v').select('*').eq('operation_date', date).maybeSingle(),
    supabase
      .from('orders')
      .select(
        'id,business_id,status,subtotal,delivery_fee,service_fee,business_earnings,courier_earnings,platform_earnings,total_amount,created_at,updated_at',
      )
      .gte('created_at', start)
      .lt('created_at', end)
      .is('deleted_at', null),
    supabase.from('businesses').select('id,name').is('deleted_at', null),
    supabase
      .from('operation_sessions')
      .select('session_type,status,online_seconds,opened_at,closed_at')
      .gte('opened_at', start)
      .lt('opened_at', end),
  ]);

  if (summaryResult.error || ordersResult.error || businessesResult.error || sessionsResult.error) {
    return NextResponse.json(
      {
        error:
          summaryResult.error?.message ||
          ordersResult.error?.message ||
          businessesResult.error?.message ||
          sessionsResult.error?.message ||
          'No se pudo generar el reporte',
      },
      { status: 500 },
    );
  }

  const summary = summaryResult.data ?? {};
  const businessNames = new Map(
    (businessesResult.data ?? []).map((business) => [String(business.id), String(business.name)]),
  );
  const businessTotals = new Map<
    string,
    { orders: number; delivered: number; cancelled: number; sales: number; domiu: number }
  >();
  for (const order of ordersResult.data ?? []) {
    const id = String(order.business_id || 'sin-negocio');
    const current = businessTotals.get(id) ?? {
      orders: 0,
      delivered: 0,
      cancelled: 0,
      sales: 0,
      domiu: 0,
    };
    current.orders += 1;
    if (order.status === 'delivered') {
      current.delivered += 1;
      current.sales += Number(order.business_earnings ?? order.subtotal ?? 0);
      current.domiu += Number(order.platform_earnings ?? 0);
    }
    if (order.status === 'cancelled') current.cancelled += 1;
    businessTotals.set(id, current);
  }

  const summaryRows = [
    ['Fecha', date],
    ['Pedidos creados', summary.orders_created ?? ordersResult.data?.length ?? 0],
    ['Pedidos entregados', summary.orders_delivered ?? 0],
    ['Pedidos cancelados', summary.orders_cancelled ?? 0],
    ['Ventas de productos COP', cop(summary.product_sales_cop)],
    ['Tarifas de domicilio COP', cop(summary.delivery_fees_cop)],
    ['Tarifas de servicio COP', cop(summary.service_fees_cop)],
    ['Ganancias de comercios COP', cop(summary.business_earnings_cop)],
    ['Ganancias de repartidores COP', cop(summary.courier_earnings_cop)],
    ['Ganancia DomiU COP', cop(summary.domiu_earnings_cop)],
    ['Usuarios registrados', summary.users_registered ?? 0],
    ['Comercios registrados', summary.businesses_registered ?? 0],
    ['Jornadas de comercios', summary.business_shifts_opened ?? 0],
    ['Jornadas de repartidores', summary.courier_shifts_opened ?? 0],
    ['Generado', new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })],
  ];

  const businessRows = [...businessTotals.entries()]
    .sort((a, b) => b[1].sales - a[1].sales)
    .map(
      ([businessId, values]) =>
        `<Row>${cell(businessNames.get(businessId) || 'Comercio')}${cell(values.orders)}${cell(
          values.delivered,
        )}${cell(values.cancelled)}${cell(cop(values.sales))}${cell(cop(values.domiu))}</Row>`,
    )
    .join('');

  const sessionRows = (sessionsResult.data ?? [])
    .map(
      (session) =>
        `<Row>${cell(session.session_type)}${cell(session.status)}${cell(
          `${Math.floor(Number(session.online_seconds ?? 0) / 3600)} h ${Math.floor(
            (Number(session.online_seconds ?? 0) % 3600) / 60,
          )} min`,
        )}${cell(session.opened_at)}${cell(session.closed_at || '')}</Row>`,
    )
    .join('');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default"><Font ss:FontName="Arial" ss:Size="10"/></Style>
  <Style ss:ID="Title"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Arial" ss:Size="18" ss:Bold="1" ss:Color="#F5A900"/><Interior ss:Color="#111827" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Header"><Font ss:FontName="Arial" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#F59E0B" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Label"><Font ss:FontName="Arial" ss:Bold="1"/><Interior ss:Color="#FFF7E6" ss:Pattern="Solid"/></Style>
 </Styles>
 <Worksheet ss:Name="Resumen diario"><Table><Column ss:Width="230"/><Column ss:Width="220"/>
  <Row ss:Height="32"><Cell ss:MergeAcross="1" ss:StyleID="Title"><Data ss:Type="String">DomiU Magdalena — Reporte diario</Data></Cell></Row>
  ${summaryRows.map(([label, value]) => `<Row>${cell(label, 'Label')}${cell(value)}</Row>`).join('')}
 </Table></Worksheet>
 <Worksheet ss:Name="Comercios"><Table><Column ss:Width="220"/><Column ss:Width="90"/><Column ss:Width="90"/><Column ss:Width="90"/><Column ss:Width="130"/><Column ss:Width="130"/>
  <Row>${['Comercio','Pedidos','Entregados','Cancelados','Venta productos COP','Ingreso DomiU COP'].map((value) => cell(value, 'Header')).join('')}</Row>
  ${businessRows || `<Row>${cell('Sin datos')}</Row>`}
 </Table></Worksheet>
 <Worksheet ss:Name="Jornadas"><Table><Column ss:Width="120"/><Column ss:Width="100"/><Column ss:Width="120"/><Column ss:Width="180"/><Column ss:Width="180"/>
  <Row>${['Tipo','Estado','Tiempo en línea','Apertura','Cierre'].map((value) => cell(value, 'Header')).join('')}</Row>
  ${sessionRows || `<Row>${cell('Sin jornadas')}</Row>`}
 </Table></Worksheet>
</Workbook>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
      'Content-Disposition': `attachment; filename="DomiU-Reporte-Diario-${date}.xls"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
