import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "DomiU Magdalena - Gestion de Domicilios",
  description: "App profesional para gestion de domicilios",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen" style={{ backgroundColor: "#ffffff" }}>{children}<Toaster /></body>
    </html>
  );
}
