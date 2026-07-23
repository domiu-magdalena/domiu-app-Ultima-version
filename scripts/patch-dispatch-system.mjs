import { readFileSync, writeFileSync } from 'node:fs';

function read(path) {
  return readFileSync(path, 'utf8');
}

function write(path, content) {
  writeFileSync(path, content, 'utf8');
}

function replaceRequired(source, search, replacement, label) {
  if (typeof search === 'string') {
    if (!source.includes(search)) throw new Error(`No se encontró el bloque requerido: ${label}`);
    return source.replace(search, replacement);
  }
  if (!search.test(source)) throw new Error(`No se encontró el patrón requerido: ${label}`);
  return source.replace(search, replacement);
}

function patchRiderPage() {
  const path = 'src/app/repartidor/page.tsx';
  let source = read(path);

  if (!source.includes('DomicilioOfferModal')) {
    source = replaceRequired(
      source,
      'import MapView from "@/components/repartidor/MapView";',
      'import MapView from "@/components/repartidor/MapView";\nimport DomicilioOfferModal from "@/components/repartidor/DomicilioOfferModal";',
      'importación de la oferta flotante',
    );
  }

  if (!source.includes('function urlBase64ToUint8Array')) {
    source = replaceRequired(
      source,
      'const EMPRESA_PHONE = "3113748405";',
      `const EMPRESA_PHONE = "3113748405";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}`,
      'conversión de clave VAPID',
    );
  }

  const pushEffect = /  \/\/ Registrar Service Worker, suscribir push, solicitar permisos[\s\S]*?  \}, \[riderData\?\.id\]\);/;
  source = replaceRequired(
    source,
    pushEffect,
    `  // Registrar Service Worker y mantener una única suscripción push por repartidor.
  useEffect(() => {
    if (!riderData?.id || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      console.warn("NEXT_PUBLIC_VAPID_PUBLIC_KEY no configurada");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const permission = Notification.permission === "default"
          ? await Notification.requestPermission()
          : Notification.permission;
        if (permission !== "granted" || cancelled) return;

        const registration = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
        await registration.update().catch(() => {});
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        }

        const response = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: subscription.toJSON(), repartidor_id: riderData.id }),
        });
        if (!response.ok) console.error("No se pudo registrar la suscripción push", await response.text());
      } catch (error) {
        console.error("Error registrando Web Push:", error);
      }
    })();

    return () => { cancelled = true; };
  }, [riderData?.id]);`,
    'registro Web Push',
  );

  source = source.replace(
    '        fetch("/api/domicilios/disponibles"),',
    '        riderData?.id ? fetch(`/api/domicilios/disponibles?repartidor_id=${riderData.id}`) : Promise.resolve(null),',
  );
  source = source.replace(
    '      const disponibles = await dispRes.json();',
    '      const disponibles = dispRes ? await dispRes.json() : [];',
  );

  source = source.replaceAll('setTab("domicilios")', 'setTab("inicio")');
  source = source.replace('    }, 60000);', '    }, 5000);');

  const realtimeInsert = /      \.on\("postgres_changes", \{ event: "INSERT", schema: "public", table: "domicilios_disponibles" \}, \(payload: any\) => \{[\s\S]*?      \}\)/;
  source = replaceRequired(
    source,
    realtimeInsert,
    `      .on("postgres_changes", { event: "INSERT", schema: "public", table: "domicilios_disponibles" }, () => {
        // La API decide si este repartidor pertenece al grupo más cercano.
        // Solo después de esa validación se muestra la oferta y se activa la alarma.
        alarmaSilenciadaRef.current = false;
        loadDomicilios();
      })`,
    'realtime priorizado',
  );

  source = source.replace(
    '        ok("Domicilio aceptado");\n        loadDomicilios();',
    '        detenerAlarma();\n        setDomiNotif(null);\n        navigator.serviceWorker?.controller?.postMessage({ type: "CLOSE_DOMICILIO_NOTIFICATIONS" });\n        ok("Domicilio aceptado");\n        loadDomicilios();',
  );

  if (!source.includes('unlockDomiAudio')) {
    source = replaceRequired(
      source,
      '  const alarmaSilenciadaRef = useRef(false);',
      `  const alarmaSilenciadaRef = useRef(false);

  useEffect(() => {
    const unlockDomiAudio = async () => {
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioCtxRef.current.state === "suspended") await audioCtxRef.current.resume();
      } catch {}
    };
    window.addEventListener("pointerdown", unlockDomiAudio, { once: true });
    window.addEventListener("touchstart", unlockDomiAudio, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlockDomiAudio);
      window.removeEventListener("touchstart", unlockDomiAudio);
    };
  }, []);`,
      'desbloqueo de audio',
    );
  }

  const oldNotification = /      \{\/\* NOTIFICACION PERSISTENTE DE DOMICILIO \*\/\}[\s\S]*?\n      \{tab === "inicio"/;
  source = replaceRequired(
    source,
    oldNotification,
    `      <DomicilioOfferModal
        offer={domiNotif}
        accepting={Boolean(aceptandoId)}
        onAccept={(id) => aceptarDomicilio(id)}
        onReject={(id) => rechazarDomicilio(id)}
      />

      {tab === "inicio"`,
    'modal flotante de oferta',
  );

  source = source.replace(
    `                   estado: d.estado,
               })),`,
    `                   estado: d.estado,
                   pickupLat: d.origen_lat ? Number(d.origen_lat) : undefined,
                   pickupLng: d.origen_lng ? Number(d.origen_lng) : undefined,
               })),`,
  );
  source = source.replace(
    `                  nombre: riderData?.nombre || "",
                }}`,
    `                  nombre: riderData?.nombre || "",
                  latitud: gpsLat ?? undefined,
                  longitud: gpsLng ?? undefined,
                }}`,
  );

  write(path, source);
}

function writeAvailableRoute() {
  const path = 'src/app/api/domicilios/disponibles/route.ts';
  const content = `import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { asCoordinate, eligibleRiderIdsForOffer, haversineDistanceKm, isFreshLocation } from "@/lib/dispatch";

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
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate", Pragma: "no-cache" },
  });
}

export async function GET(req: Request) {
  try {
    const supabase = getAdmin();
    const { searchParams } = new URL(req.url);
    const repartidorId = searchParams.get("repartidor_id");
    const onlyMine = searchParams.get("mis_aceptados") === "true";
    if (!repartidorId) return noStore([]);

    const { data: turnosActivos, error: turnoError } = await supabase
      .from("turnos")
      .select("id, created_at")
      .eq("activo", true)
      .order("created_at", { ascending: false })
      .limit(1);
    if (turnoError) throw turnoError;
    const turnoActivo = turnosActivos?.[0];
    if (!turnoActivo?.created_at) return noStore([]);

    if (onlyMine) {
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

    const { data: rider, error: riderError } = await supabase
      .from("repartidores")
      .select("id, estado, activo")
      .eq("id", repartidorId)
      .maybeSingle();
    if (riderError) throw riderError;
    if (!rider || rider.activo === false || rider.estado !== "Disponible") return noStore([]);

    const { data: activeDelivery, error: activeDeliveryError } = await supabase
      .from("domicilios_disponibles")
      .select("id")
      .eq("repartidor_id", repartidorId)
      .eq("estado", "aceptado")
      .limit(1);
    if (activeDeliveryError) throw activeDeliveryError;
    if (activeDelivery?.length) return noStore([]);

    const { data: offers, error: offersError } = await supabase
      .from("domicilios_disponibles")
      .select("*")
      .eq("estado", "disponible")
      .is("repartidor_id", null)
      .gte("created_at", turnoActivo.created_at)
      .order("created_at", { ascending: true });
    if (offersError) throw offersError;
    if (!offers?.length) return noStore([]);

    const { data: availableRiders, error: ridersError } = await supabase
      .from("repartidores")
      .select("id")
      .eq("estado", "Disponible")
      .neq("activo", false);
    if (ridersError) throw ridersError;
    const availableIds = new Set((availableRiders || []).map((item: any) => item.id));

    const { data: rawLocations, error: locationsError } = await supabase
      .from("ubicaciones_repartidores")
      .select("repartidor_id, latitud, longitud, estado, ultima_actualizacion")
      .in("repartidor_id", [...availableIds]);
    if (locationsError) throw locationsError;

    const locations = (rawLocations || []).filter((location: any) =>
      availableIds.has(location.repartidor_id) &&
      location.estado === "disponible" &&
      isFreshLocation(location.ultima_actualizacion, 15)
    );
    const myLocation = locations.find((location: any) => location.repartidor_id === repartidorId);
    const myCoords = myLocation ? asCoordinate(myLocation.latitud, myLocation.longitud) : null;
    if (!myCoords) return noStore([]);

    const eligible = (offers || []).flatMap((offer: any) => {
      const origin = asCoordinate(offer.origen_lat, offer.origen_lng);
      const eligibleIds = eligibleRiderIdsForOffer(origin, locations, offer.created_at);
      if (!eligibleIds.includes(repartidorId)) return [];
      const distanceKm = origin ? haversineDistanceKm(origin, myCoords) : null;
      return [{ ...offer, distancia_repartidor_km: distanceKm }];
    });

    return noStore(eligible);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error priorizando domicilios:", error);
    return noStore({ error: message }, 500);
  }
}
`;
  write(path, content);
}

patchRiderPage();
writeAvailableRoute();
console.log('Despacho cercano, oferta flotante y Web Push aplicados.');
