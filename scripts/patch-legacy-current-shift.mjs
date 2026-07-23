import { readFileSync, writeFileSync } from 'node:fs';

function read(path) {
  return readFileSync(path, 'utf8');
}

function write(path, content) {
  writeFileSync(path, content, 'utf8');
}

function replaceRequired(source, search, replacement, label) {
  if (typeof search === 'string') {
    if (!source.includes(search)) {
      throw new Error(`No se encontró el bloque requerido: ${label}`);
    }
    return source.replace(search, replacement);
  }

  if (!search.test(source)) {
    throw new Error(`No se encontró el patrón requerido: ${label}`);
  }
  return source.replace(search, replacement);
}

function patchRiderPage() {
  const path = 'src/app/repartidor/page.tsx';
  let source = read(path);

  if (!source.includes('activeTurnoStartedAt')) {
    source = replaceRequired(
      source,
      '  const [activeTurnoId, setActiveTurnoId] = useState<string | null>(null);',
      '  const [activeTurnoId, setActiveTurnoId] = useState<string | null>(null);\n  const [activeTurnoStartedAt, setActiveTurnoStartedAt] = useState<string | null>(null);',
      'estado de inicio del turno',
    );
  }

  if (!source.includes('Sin turno activo, el panel operativo debe quedar completamente vacío.')) {
    const loadBlock = /        \/\/ Obtener turno activo[\s\S]*?        setPcPedidos\(pc \|\| \[\]\);/;
    const replacement = `        // Sin turno activo, el panel operativo debe quedar completamente vacío.
        const { data: turnosActivos, error: turnoError } = await sb
          .from("turnos")
          .select("id, created_at")
          .eq("activo", true)
          .order("created_at", { ascending: false })
          .limit(1);
        if (turnoError) throw turnoError;

        const turnoActivo = turnosActivos?.[0] || null;
        const turnoId = turnoActivo?.id || null;
        const turnoStartedAt = turnoActivo?.created_at || null;
        setActiveTurnoId(turnoId);
        setActiveTurnoStartedAt(turnoStartedAt);

        if (!turnoId || !turnoStartedAt) {
          setPedidos([]);
          setPcPedidos([]);
        } else {
          // Pedidos manuales vinculados exclusivamente al turno actual.
          const { data: peds, error: pedidosError } = await sb
            .from("pedidos")
            .select("*")
            .eq("repartidor_id", rider.id)
            .eq("turno_id", turnoId)
            .order("created_at", { ascending: false });
          if (pedidosError) throw pedidosError;
          setPedidos(peds || []);

          // pedidos_cliente no posee turno_id en esta versión. Se aísla por la
          // fecha exacta de apertura del turno actual para impedir historial viejo.
          const { data: pc, error: pedidosClienteError } = await sb
            .from("pedidos_cliente")
            .select("id, codigo, cliente_nombre, cliente_telefono, cliente_direccion, total, domicilio, estado, created_at, nota")
            .eq("repartidor_id", rider.id)
            .gte("created_at", turnoStartedAt)
            .order("created_at", { ascending: false });
          if (pedidosClienteError) throw pedidosClienteError;
          setPcPedidos(pc || []);
        }`;
    source = replaceRequired(source, loadBlock, replacement, 'carga de pedidos del repartidor');
  }

  if (!source.includes('turnoStartedAt={activeTurnoStartedAt}')) {
    const marketplaceCall = /<RiderMarketplace\s+riderId=\{riderData\.id\}\s+riderName=\{riderData\.nombre\}\s*\/>/;
    source = replaceRequired(
      source,
      marketplaceCall,
      '<RiderMarketplace riderId={riderData.id} riderName={riderData.nombre} turnoStartedAt={activeTurnoStartedAt} />',
      'propiedades de RiderMarketplace',
    );
  }

  write(path, source);
}

function patchMarketplace() {
  const path = 'src/components/RiderMarketplace.tsx';
  let source = read(path);

  if (!source.includes('turnoStartedAt: string | null;')) {
    source = replaceRequired(
      source,
      /interface Props \{\s*riderId: string;\s*riderName: string;\s*\}/,
      `interface Props {
  riderId: string;
  riderName: string;
  turnoStartedAt: string | null;
}`,
      'interfaz de RiderMarketplace',
    );

    source = replaceRequired(
      source,
      'export default function RiderMarketplace({ riderId, riderName }: Props) {',
      'export default function RiderMarketplace({ riderId, riderName, turnoStartedAt }: Props) {',
      'firma de RiderMarketplace',
    );
  }

  if (!source.includes('.gte("created_at", turnoStartedAt)')) {
    const fetchBlock = /  const fetchPedidos = useCallback\(async \(\) => \{[\s\S]*?  \}, \[sb, riderId\]\);/;
    const replacement = `  const fetchPedidos = useCallback(async () => {
    if (!sb || !riderId || !turnoStartedAt) {
      setPedidos([]);
      setLoading(false);
      return;
    }

    const { data, error } = await sb
      .from("pedidos_cliente")
      .select("*, negocios(nombre)")
      .eq("repartidor_id", riderId)
      .gte("created_at", turnoStartedAt)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando pedidos del turno actual:", error);
      setPedidos([]);
    } else {
      setPedidos(data || []);
    }
    setLoading(false);
  }, [sb, riderId, turnoStartedAt]);`;
    source = replaceRequired(source, fetchBlock, replacement, 'fetchPedidos de RiderMarketplace');
  }

  source = source.replace(
    '    if (!sb || !riderId) return;\n    const channel = sb',
    '    if (!sb || !riderId || !turnoStartedAt) return;\n    const channel = sb',
  );
  source = source.replace(
    '  }, [sb, riderId, fetchPedidos]);',
    '  }, [sb, riderId, turnoStartedAt, fetchPedidos]);',
  );

  write(path, source);
}

function patchAvailableDeliveriesRoute() {
  const path = 'src/app/api/domicilios/disponibles/route.ts';
  const content = `import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdmin() {
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurada");
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function noStore(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}

export async function GET(req: Request) {
  try {
    const supabase = getAdmin();
    const { searchParams } = new URL(req.url);
    const repartidorId = searchParams.get("repartidor_id");
    const onlyMine = searchParams.get("mis_aceptados") === "true";

    const { data: turnosActivos, error: turnoError } = await supabase
      .from("turnos")
      .select("id, created_at")
      .eq("activo", true)
      .order("created_at", { ascending: false })
      .limit(1);
    if (turnoError) throw turnoError;

    const turnoActivo = turnosActivos?.[0] || null;
    if (!turnoActivo?.created_at) return noStore([]);

    if (onlyMine && repartidorId) {
      const { data, error } = await supabase
        .from("domicilios_disponibles")
        .select("*")
        .eq("repartidor_id", repartidorId)
        .neq("estado", "cancelado")
        .gte("created_at", turnoActivo.created_at)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return noStore(data || []);
    }

    const { data, error } = await supabase
      .from("domicilios_disponibles")
      .select("*")
      .eq("estado", "disponible")
      .gte("created_at", turnoActivo.created_at)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return noStore(data || []);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return noStore({ error: message }, 500);
  }
}
`;
  write(path, content);
}

patchRiderPage();
patchMarketplace();
patchAvailableDeliveriesRoute();
console.log('Aislamiento de pedidos por turno aplicado a la aplicación legacy.');
