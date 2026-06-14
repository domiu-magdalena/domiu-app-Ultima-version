import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { origen, destino } = await req.json();
    if (!origen || !destino) {
      return NextResponse.json({ error: "origen y destino son requeridos" }, { status: 400 });
    }

    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "AIzaSyBaQOa_K2AFz1v5R3f778DNK-MnVhEMCXY";

    async function geocodificar(dir: string) {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(dir)}&key=${key}`
      );
      const data = await res.json();
      if (data.status !== "OK" || !data.results?.[0]?.geometry?.location) {
        throw new Error(`No se pudo geocodificar: ${dir}`);
      }
      return data.results[0].geometry.location as { lat: number; lng: number };
    }

    const [origLoc, destLoc] = await Promise.all([geocodificar(origen), geocodificar(destino)]);

    // Haversine
    const R = 6371;
    const dLat = ((destLoc.lat - origLoc.lat) * Math.PI) / 180;
    const dLng = ((destLoc.lng - origLoc.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((origLoc.lat * Math.PI) / 180) *
        Math.cos((destLoc.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const km = Math.round(R * c * 10) / 10;

    return NextResponse.json({ km, origen: origLoc, destino: destLoc });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error calculando distancia" }, { status: 500 });
  }
}
