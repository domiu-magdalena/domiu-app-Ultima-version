import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "DomiU Magdalena - Delivery Premium",
  description: "Plataforma profesional de domicilios en Santa Marta y Magdalena",
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect rx='20' width='100' height='100' fill='%230F172A'/><text x='50' y='68' font-size='55' text-anchor='middle' font-weight='900' fill='%2310B981' font-family='Inter,sans-serif'>D</text></svg>" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">{children}<Toaster position="top-center" richColors closeButton /></body>
    </html>
  );
}
