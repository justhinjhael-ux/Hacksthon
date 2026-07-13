// ## ==========================================================================
// ## app/layout.tsx — Layout raíz: header con navegación + footer con
// ## disclaimer permanente (regla obligatoria del track: nunca letra pequeña).
// ## ==========================================================================
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Odds Ratio — Robo-Advisory Agéntico",
  description: "Track 3: Robo-Advisory · Agentic Scale 2026 · Dataclub ESPOL",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-white/60 shadow-[0_1px_0_rgba(91,24,217,0.06)]">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mark.png" alt="Odds Ratio" className="h-9 w-auto" />
              <span className="font-extrabold text-brand-900 tracking-tight">Odds Ratio</span>
            </Link>
            <nav className="flex items-center gap-5 text-sm font-semibold text-brand-700">
              <Link href="/onboarding" className="hover:text-brand-900">Crear perfil</Link>
              <Link href="/chat" className="hover:text-brand-900">Chat ORAI</Link>
              <Link href="/asesor" className="hover:text-brand-900">Panel Operativo</Link>
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">{children}</main>

        <footer className="border-t border-white/60 bg-white/50 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <p className="disclaimer-banner">
              Proyecto demostrativo con datos ficticios y simulaciones ilustrativas. El
              sistema nunca ejecuta órdenes reales ni promete rentabilidad: toda acción
              sensible queda como propuesta sujeta a aprobación de un asesor humano.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
