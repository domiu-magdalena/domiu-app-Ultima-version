import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calcularTarifas, geocodificar, haversineKm } from "@/lib/tarifas";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  try {
    const { negocio_id, cliente_direccion } = await request.json();
    if (!negocio_id || !cliente_direccion?.trim()) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: negocio } = await supabase
      .from("negocios")
      .select("direccion, domicilio_cost")
      .eq("id", negocio_id)
      .maybeSingle();

    if (!negocio) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    const costoFijo = negocio.domicilio_cost || 5000;

    let km: number | null = null;
    if (negocio.direccion?.trim()) {
      const [origCoords, destCoords] = await Promise.all([
        geocodificar(negocio.direccion),
        geocodificar(cliente_direccion),
      ]);
      if (origCoords && destCoords) {
        km = haversineKm(origCoords, destCoords);
      }
    }

    // Usar la misma tarifa por rangos que el admin
    if (km !== null && km > 0) {
      const tarifa = calcularTarifas(km);
      return NextResponse.json({
        costo: tarifa.precio,
        distancia_km: km,
        metodo: "distancia",
        pago_repartidor: tarifa.pagoRepartidor,
        empresa_recibe: tarifa.empresaRecibe,
      });
    }

    return NextResponse.json({ costo: costoFijo, distancia_km: null, metodo: "fijo" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
