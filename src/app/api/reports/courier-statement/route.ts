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

function cop(value: unknown): string {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? Math.round(amount) : 0);
}

function duration(secondsValue: unknown): string {
  const seconds = Math.max(0, Number(secondsValue ?? 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours} h ${minutes} min`;
}

function cell(value: unknown, type: 'String' | 'Number' = 'String', style = '') {
  const styleAttribute = style ? ` ss:StyleID="${style}"` : '';
  return `<Cell${styleAttribute}><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const courierId = request.nextUrl.searchParams.get('courierId') || auth.session.user.id;
  const date = request.nextUrl.searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const isAdmin = ADMIN_ROLES.includes(auth.session.profile.role);
  if (!isAdmin && courierId !== auth.session.user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const supabase = getServiceClient();
  const [stubResult, profileResult, balanceResult, ledgerResult] = await Promise.all([
    supabase
      .from('courier_daily_payment_stub_v')
      .select('*')
      .eq('courier_id', courierId)
      .eq('work_date', date)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('id,first_name,last_name,email,phone')
      .eq('id', courierId)
      .maybeSingle(),
    supabase
      .from('courier_balance_summary_v')
      .select('*')
      .eq('courier_id', courierId)
      .maybeSingle(),
    supabase
      .from('financial_ledger_entries')
      .select('entry_type,amount_cop,balance_effect_cop,description,reference,created_at,status')
      .eq('account_type', 'courier')
      .eq('account_id', courierId)
      .gte('created_at', `${date}T00:00:00-05:00`)
      .lt('created_at', `${date}T23:59:59.999-05:00`)
      .order('created_at', { ascending: true }),
  ]);

  if (stubResult.error || profileResult.error || balanceResult.error || ledgerResult.error) {
    const message =
      stubResult.error?.message ||
      profileResult.error?.message ||
      balanceResult.error?.message ||
      ledgerResult.error?.message ||
      'No se pudo generar el desprendible';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const profile = profileResult.data;
  if (!profile) return NextResponse.json({ error: 'Repartidor no encontrado' }, { status: 404 });
  const stub = stubResult.data ?? {};
  const balance = balanceResult.data ?? {};
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email;
  const netBalance = Number(balance.net_balance_cop ?? 0);
  const generatedAt = new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(new Date());

  const summaryRows = [
    ['Repartidor', fullName],
    ['Correo', profile.email],
    ['Teléfono', profile.phone || 'No registrado'],
    ['Fecha de trabajo', date],
    ['Jornadas registradas', Number(stub.shifts_count ?? 0)],
    ['Tiempo en línea', duration(stub.online_seconds)],
    ['Domicilios completados', Number(stub.completed_deliveries ?? 0)],
    ['Tarifas de domicilio', cop(stub.delivery_fees_cop)],
    ['Ganancia neta del repartidor', cop(stub.courier_net_earnings_cop)],
    ['Efectivo cobrado a clientes', cop(stub.cash_collected_cop)],
    ['DomiU le debe', cop(balance.company_owes_courier_cop)],
    ['Repartidor debe a DomiU', cop(balance.courier_owes_company_cop)],
    ['Saldo neto', cop(Math.abs(netBalance))],
    ['Lectura del saldo', netBalance > 0 ? 'DomiU debe al repartidor' : netBalance < 0 ? 'El repartidor debe a DomiU' : 'Saldo en cero'],
    ['Generado', generatedAt],
  ];

  const ledgerRows = (ledgerResult.data ?? [])
    .map(
      (entry) => `<Row>${cell(
        new Intl.DateTimeFormat('es-CO', {
          dateStyle: 'short',
          timeStyle: 'short',
          timeZone: 'America/Bogota',
        }).format(new Date(entry.created_at)),
      )}${cell(entry.entry_type)}${cell(cop(entry.amount_cop))}${cell(cop(entry.balance_effect_cop))}${cell(
        entry.status,
      )}${cell(entry.reference || '')}${cell(entry.description || '')}</Row>`,
    )
    .join('');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default"><Alignment ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="10"/></Style>
  <Style ss:ID="Title"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Arial" ss:Size="18" ss:Bold="1" ss:Color="#F5A900"/><Interior ss:Color="#111827" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Subtitle"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Arial" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1F2937" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Header"><Font ss:FontName="Arial" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#F59E0B" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Label"><Font ss:FontName="Arial" ss:Bold="1"/><Interior ss:Color="#FFF7E6" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Money"><NumberFormat ss:Format="#,##0"/></Style>
 </Styles>
 <Worksheet ss:Name="Desprendible">
  <Table>
   <Column ss:Width="210"/><Column ss:Width="250"/>
   <Row ss:Height="32"><Cell ss:MergeAcross="1" ss:StyleID="Title"><Data ss:Type="String">DomiU Magdalena</Data></Cell></Row>
   <Row ss:Height="24"><Cell ss:MergeAcross="1" ss:StyleID="Subtitle"><Data ss:Type="String">Desprendible diario de liquidación del repartidor</Data></Cell></Row>
   ${summaryRows.map(([label, value]) => `<Row>${cell(label, 'String', 'Label')}${cell(value)}</Row>`).join('')}
  </Table>
 </Worksheet>
 <Worksheet ss:Name="Movimientos">
  <Table>
   <Column ss:Width="130"/><Column ss:Width="160"/><Column ss:Width="110"/><Column ss:Width="110"/><Column ss:Width="90"/><Column ss:Width="130"/><Column ss:Width="300"/>
   <Row>${['Fecha','Movimiento','Valor COP','Efecto saldo COP','Estado','Referencia','Descripción'].map((heading) => cell(heading, 'String', 'Header')).join('')}</Row>
   ${ledgerRows || `<Row>${cell('Sin movimientos para la fecha')}</Row>`}
  </Table>
 </Worksheet>
</Workbook>`;

  const filename = `DomiU-Desprendible-${date}-${fullName.replace(/[^a-zA-Z0-9]+/g, '-')}.xls`;
  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
