"use client";
// ## ==========================================================================
// ## app/propuesta/page.tsx — Historia 2: propuesta explicable.
// ## Tarjeta de perfil + confianza bayesiana (contenedor visual propio de
// ## esta pantalla) y el resto del análisis vía <AnalisisEstadistico>,
// ## componente COMPARTIDO también con el Panel Operativo del asesor.
// ## ==========================================================================
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AnalisisEstadistico from "@/components/AnalisisEstadistico";
import {
  CorrelationMatrix,
  MarkowitzResult,
  Proposal,
  getCorrelacion,
  getMarkowitz,
  getProposal,
  normalizarDistribucion,
} from "@/lib/api";

// ## Mapa presentacional perfil→estilo (solo color/etiqueta, sin lógica de negocio)
function nivelRiesgo(perfil: string) {
  const p = perfil.toLowerCase();
  if (p.includes("conserv"))
    return { label: "Riesgo Conservador", chip: "bg-success-400/20 text-success-500", accent: "#10B981" };
  if (p.includes("agres"))
    return { label: "Riesgo Agresivo", chip: "bg-accent/15 text-accent", accent: "#A855F7" };
  return { label: "Riesgo Moderado", chip: "bg-brand-100 text-brand-700", accent: "#5B18D9" };
}

function LoadingState() {
  return (
    <div className="max-w-3xl mx-auto flex flex-col items-center justify-center py-28 text-center animate-rise">
      <div className="relative h-14 w-14">
        <div className="absolute inset-0 rounded-full border-4 border-brand-100" />
        <div className="absolute inset-0 rounded-full border-4 border-t-brand-600 border-transparent animate-spin" />
      </div>
      <p className="mt-5 font-semibold text-brand-900">Construyendo tu propuesta…</p>
      <p className="text-sm text-slate-500 mt-1">Perfilando riesgo y proyecciones</p>
    </div>
  );
}

export default function PropuestaPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PropuestaContenido />
    </Suspense>
  );
}

function PropuestaContenido() {
  const params = useSearchParams();
  const id = params.get("id");
  const [propuesta, setPropuesta] = useState<Proposal | null>(null);
  const [markowitz, setMarkowitz] = useState<MarkowitzResult | null>(null);
  const [correlacion, setCorrelacion] = useState<CorrelationMatrix | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    getProposal(Number(id))
      .then((p) => {
        setPropuesta(p);
        return Promise.all([getMarkowitz(p.perfil), getCorrelacion()]);
      })
      .then(([mk, corr]) => {
        setMarkowitz(mk);
        setCorrelacion(corr);
      })
      .catch(() => setError("No se pudo cargar la propuesta."));
  }, [id]);

  if (error)
    return (
      <p className="text-center text-red-600 py-20 max-w-md mx-auto bg-red-50 border border-red-200 rounded-xl">
        {error}
      </p>
    );
  if (!propuesta) return <LoadingState />;

  const confianzaPct = Math.round(propuesta.confianza * 100);
  const distribucion = normalizarDistribucion(propuesta.distribucion);
  const riesgo = nivelRiesgo(propuesta.perfil);
  const ring = 2 * Math.PI * 42; // circunferencia del anillo de confianza (contenedor visual)

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-rise">
      {/* ## Encabezado */}
      <header className="text-center pt-2">
        <span className="inline-flex items-center gap-2 rounded-pill bg-white/60 backdrop-blur-md border border-white/70 px-4 py-1.5 text-xs font-semibold text-brand-700 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse" />
          Tu propuesta personalizada
        </span>
      </header>

      {/* ## Tarjeta premium del PERFIL con anillo circular (contenedor visual) */}
      <div className="relative overflow-hidden rounded-[1.75rem] p-6 text-white shadow-deep bg-gradient-to-br from-brand-700 via-brand-600 to-secondary">
        <div className="pointer-events-none absolute -top-10 -right-8 h-44 w-44 rounded-full bg-white/12 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-brand-950/30 blur-2xl" />
        <div className="relative flex items-center gap-6">
          <div className="relative h-28 w-28 shrink-0">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="9" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#ffffff"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={ring}
                strokeDashoffset={ring * (1 - confianzaPct / 100)}
                style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.25,0.1,0.25,1)" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold">{confianzaPct}%</span>
              <span className="text-[10px] uppercase tracking-widest text-white/70">confianza</span>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-white/70">Tu perfil</p>
            <h1 className="text-3xl font-extrabold capitalize leading-tight">{propuesta.perfil}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="inline-block text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-pill bg-white/20 backdrop-blur-md border border-white/30">
                {riesgo.label}
              </span>
              {propuesta.estado !== "pendiente" && (
                <span className="inline-block text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-pill bg-success-400/30 border border-white/20">
                  {propuesta.estado}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnalisisEstadistico
        perfil={propuesta.perfil}
        score={propuesta.score}
        influencias={propuesta.influencias}
        distribucion={distribucion}
        proyeccion={propuesta.proyeccion}
        markowitz={markowitz}
        correlacion={correlacion}
        explicacion={propuesta.explicacion}
        guardrailActivado={propuesta.guardrail_activado}
      />
    </div>
  );
}
