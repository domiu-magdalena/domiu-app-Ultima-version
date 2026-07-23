"use client";

import { Bike, Check, MapPin, Navigation, Phone, Store, User, X } from "lucide-react";

interface DomicilioOfferModalProps {
  offer: any | null;
  accepting: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

function money(value: unknown) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function DomicilioOfferModal({
  offer,
  accepting,
  onAccept,
  onReject,
}: DomicilioOfferModalProps) {
  if (!offer) return null;

  const phone = String(offer.cliente_telefono || "").replace(/\D/g, "");
  const distance = Number(offer.distancia_repartidor_km ?? offer.distancia_km);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nuevo domicilio disponible"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(2, 6, 23, 0.82)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 430,
          maxHeight: "92vh",
          overflowY: "auto",
          borderRadius: 28,
          background: "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)",
          border: "1px solid rgba(16,185,129,0.35)",
          boxShadow: "0 28px 90px rgba(0,0,0,0.58), 0 0 0 1px rgba(16,185,129,0.08)",
          color: "#F8FAFC",
        }}
      >
        <div
          style={{
            padding: "18px 20px",
            background: "linear-gradient(135deg, #065F46, #047857)",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                background: "rgba(255,255,255,0.14)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bike size={27} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 900, letterSpacing: 1.1, color: "#A7F3D0" }}>
                NUEVO DOMICILIO CERCANO
              </p>
              <p style={{ margin: "3px 0 0", fontSize: 23, fontWeight: 950 }}>
                #{offer.pedido_codigo || "Pedido"}
              </p>
            </div>
            {Number.isFinite(distance) && (
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 950 }}>{distance.toFixed(1)} km</p>
                <p style={{ margin: 0, fontSize: 10, color: "#A7F3D0" }}>desde tu ubicación</p>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: 20 }}>
          <div
            style={{
              padding: 16,
              borderRadius: 20,
              background: "rgba(16,185,129,0.09)",
              border: "1px solid rgba(16,185,129,0.18)",
              marginBottom: 14,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div>
              <p style={{ margin: 0, color: "#94A3B8", fontSize: 11, fontWeight: 700 }}>PAGO DEL DOMICILIO</p>
              <p style={{ margin: "3px 0 0", color: "#34D399", fontSize: 30, fontWeight: 950 }}>
                {money(offer.valor_domicilio)}
              </p>
            </div>
            <div style={{ color: "#10B981" }}>
              <Navigation size={34} />
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <InfoRow icon={<Store size={17} />} label="Recoger en" value={offer.negocio_nombre || "Negocio"} />
            <InfoRow icon={<MapPin size={17} />} label="Dirección de recogida" value={offer.direccion_origen || "Dirección no disponible"} />
            <InfoRow icon={<User size={17} />} label="Cliente" value={offer.cliente_nombre || "Cliente"} />
            <InfoRow icon={<MapPin size={17} />} label="Entregar en" value={offer.direccion_destino || "Dirección no disponible"} />
            {offer.nota && <InfoRow icon={<X size={17} />} label="Nota del pedido" value={offer.nota} />}
          </div>

          {phone && (
            <a
              href={`tel:${phone}`}
              style={{
                marginTop: 12,
                height: 44,
                borderRadius: 14,
                border: "1px solid rgba(59,130,246,0.25)",
                color: "#60A5FA",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                textDecoration: "none",
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              <Phone size={16} /> Ver teléfono del cliente
            </a>
          )}

          <p style={{ margin: "14px 2px 10px", color: "#FBBF24", fontSize: 11, lineHeight: 1.5, textAlign: "center" }}>
            La alarma continuará hasta que aceptes, rechaces o el domicilio sea tomado por otro repartidor.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 10 }}>
            <button
              type="button"
              disabled={accepting}
              onClick={() => onReject(String(offer.id))}
              style={{
                height: 54,
                borderRadius: 17,
                border: "1px solid rgba(239,68,68,0.36)",
                background: "rgba(239,68,68,0.10)",
                color: "#FCA5A5",
                fontWeight: 900,
                fontSize: 14,
              }}
            >
              Rechazar
            </button>
            <button
              type="button"
              disabled={accepting}
              onClick={() => onAccept(String(offer.id))}
              style={{
                height: 54,
                borderRadius: 17,
                border: "none",
                background: accepting ? "#475569" : "linear-gradient(135deg, #10B981, #059669)",
                color: "white",
                fontWeight: 950,
                fontSize: 15,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 12px 30px rgba(16,185,129,0.25)",
              }}
            >
              <Check size={19} /> {accepting ? "Aceptando..." : "Aceptar domicilio"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 11,
        padding: "11px 12px",
        borderRadius: 15,
        background: "rgba(255,255,255,0.035)",
        border: "1px solid rgba(255,255,255,0.055)",
      }}
    >
      <div style={{ color: "#10B981", marginTop: 2 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 10, color: "#64748B", fontWeight: 800, textTransform: "uppercase" }}>{label}</p>
        <p style={{ margin: "3px 0 0", fontSize: 13, color: "#E2E8F0", fontWeight: 650, lineHeight: 1.4 }}>{value}</p>
      </div>
    </div>
  );
}
