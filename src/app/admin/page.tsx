"use client";

import { useAuth } from "@/hooks/useAuth";
import AdminApp from "@/components/AdminApp";

export default function AdminPage() {
  const { profile, initialized, logout } = useAuth();

  if (!initialized) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a" }}>
        <p style={{ color: "#94a3b8", fontSize: 18 }}>Cargando...</p>
      </div>
    );
  }

  if (!profile || (profile.rol !== "admin" && profile.rol !== "financiero") || (profile.rol === "admin" && profile.email !== "leivakevin620@gmail.com")) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0f172a", gap: 16 }}>
        <p style={{ color: "#fca5a5", fontSize: 16 }}>Acceso no autorizado</p>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>Solo el administrador o el financiero pueden acceder.</p>
        <p style={{ color: "#94a3b8", fontSize: 12 }}>Email: {profile?.email}</p>
        <a href="/login" style={{ color: "#facc15", fontSize: 14 }}>Volver al login</a>
      </div>
    );
  }

  return <AdminApp role={profile.rol} />;
}
