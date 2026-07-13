"use client";
// ## ==========================================================================
// ## app/asesor/page.tsx — Panel Operativo (solo funcionarios autenticados).
// ## Las 3 Historias por cliente, calidad del cuestionario, Modo Autopiloto,
// ## Modo Piloto, ranking bayesiano y auditoría append-only.
// ## ==========================================================================
import { useEffect, useState } from "react";
import {
  AutopilotConfig,
  ClientRankingRow,
  HistoryItem,
  PilotConfig,
  QualityReport,
  getAudit,
  getAutopilot,
  getHistory,
  getPilotMode,
  getQualityReport,
  getRanking,
  login,
  normalizarDistribucion,
  sendDecision,
  setAutopilot,
  setPilotMode,
} from "@/lib/api";

type Tab = "historia" | "calidad" | "autopiloto" | "piloto" | "ranking" | "auditoria";

export default function AsesorPage() {
  const [token, setToken] = useState<string | null>(null);
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [errorLogin, setErrorLogin] = useState("");
  const [tab, setTab] = useState<Tab>("historia");

  const [historia, setHistoria] = useState<HistoryItem[]>([]);
  const [calidad, setCalidad] = useState<QualityReport | null>(null);
  const [autopilotCfg, setAutopilotCfg] = useState<AutopilotConfig | null>(null);
  const [pilotCfg, setPilotCfg] = useState<PilotConfig | null>(null);
  const [ranking, setRanking] = useState<ClientRankingRow[]>([]);
  const [auditoria, setAuditoria] = useState<any[]>([]);

  async function recargar(t: string) {
    const [h, c, a, p, r, au] = await Promise.all([
      getHistory(t),
      getQualityReport(t),
      getAutopilot(t),
      getPilotMode(t),
      getRanking(t),
      getAudit(t),
    ]);
    setHistoria(h);
    setCalidad(c);
    setAutopilotCfg(a);
    setPilotCfg(p);
    setRanking(r);
    setAuditoria(au);
  }

  useEffect(() => {
    if (token) recargar(token).catch(() => {});
  }, [token]);

  async function handleLogin() {
    setErrorLogin("");
    try {
      const r = await login(usuario, clave);
      setToken(r.token);
    } catch {
      setErrorLogin("Usuario o clave incorrectos.");
    }
  }

  async function decidir(proposalId: number, decision: "approve" | "edit" | "reject") {
    if (!token) return;
    await sendDecision(token, proposalId, { decision, asesor: usuario || "operador", comentario: "" });
    recargar(token);
  }

  if (!token) {
    return (
      <div className="max-w-sm mx-auto card-premium p-7 mt-16">
        <div className="flex items-center gap-2.5 mb-5">
          <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-600 to-accent flex items-center justify-center text-white text-base">
            🔐
          </span>
          <h1 className="font-extrabold text-brand-900 text-lg">Panel Operativo</h1>
        </div>
        <input
          placeholder="Usuario"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          className="w-full rounded-xl border border-brand-100 bg-white/70 px-3 py-2.5 text-sm mb-2.5"
        />
        <input
          placeholder="Clave"
          type="password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          className="w-full rounded-xl border border-brand-100 bg-white/70 px-3 py-2.5 text-sm mb-3"
        />
        {errorLogin && <p className="text-xs text-red-600 mb-2">{errorLogin}</p>}
        <button onClick={handleLogin} className="btn-primary w-full">Entrar</button>
      </div>
    );
  }

  const pendientes = historia.filter((h) => h.revision.estado === "pendiente").length;

  const tabs: { id: Tab; label: string }[] = [
    { id: "historia", label: `⏸ Revisión (${pendientes})` },
    { id: "ranking", label: "📊 Ranking clientes" },
    { id: "calidad", label: "📐 Calidad" },
    { id: "autopiloto", label: "🤖 Autopiloto" },
    { id: "piloto", label: "🧪 Modo Piloto" },
    { id: "auditoria", label: "🔒 Auditoría" },
  ];

  const ESTADO_ESTILO: Record<string, string> = {
    pendiente: "bg-amber-100 text-amber-700",
    aprobada: "bg-success-400/20 text-success-600",
    rechazada: "bg-red-100 text-red-600",
    editada: "bg-accent/15 text-accent",
  };

  return (
    <div className="space-y-6">
      {/* ## Encabezado del panel */}
      <header>
        <div className="flex items-center gap-2.5">
          <span className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-600 to-accent flex items-center justify-center text-white text-lg shrink-0">
            🧑‍💼
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-brand-900 tracking-tight">Panel Operativo</h1>
            <p className="text-sm text-slate-500">
              Gestión manual: nada avanza ni se prioriza sin criterio humano.
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`text-sm font-semibold px-3.5 py-1.5 rounded-pill border transition-all ${
              tab === t.id
                ? "bg-gradient-to-b from-brand-500 to-brand-700 text-white border-brand-600 shadow-lift"
                : "border-white/70 bg-white/50 backdrop-blur-md text-brand-700 hover:-translate-y-0.5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "historia" && (
        <div className="space-y-5">
          <p className="text-xs text-slate-400 bg-white/50 backdrop-blur-sm border border-white/70 rounded-xl px-4 py-2.5">
            📌 Cada caso muestra <b>Historia 1</b> (perfil transparente), <b>Historia 2</b> (propuesta
            explicable) e <b>Historia 3</b> (revisión) — toda la información que necesitas para decidir,
            en un solo lugar.
          </p>

          {historia.map((h, i) => {
            const nombre = h.cliente_nombre?.trim() || `Cliente Demo ${h.client_id}`;
            const fecha = h.propuesta?.created_at ? new Date(h.propuesta.created_at).toLocaleDateString("es-EC") : "";
            const confianzaPct = h.propuesta ? Math.round(h.propuesta.confianza * 100) : null;
            return (
              <div key={h.propuesta?.proposal_id ?? h.client_id} className="card-premium p-6 animate-rise" style={{ animationDelay: `${i * 40}ms` }}>
                {/* ## Encabezado del caso */}
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="font-extrabold text-brand-900">
                      {nombre} {h.propuesta && <span className="text-slate-400 font-semibold">· propuesta #{h.propuesta.proposal_id}</span>}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 capitalize">
                      Perfil {h.perfil.perfil} · Confianza {confianzaPct ?? "—"}% {fecha && `· ${fecha}`}
                      {h.perfil.es_muestra_piloto && <span className="ml-1.5 text-brand-500">(piloto)</span>}
                    </p>
                  </div>
                  <span className={`text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-pill shrink-0 ${ESTADO_ESTILO[h.revision.estado] ?? "bg-slate-100 text-slate-500"}`}>
                    {h.revision.estado === "pendiente" ? "Pendiente revisión" : h.revision.estado}
                  </span>
                </div>

                {/* ## Historia 1 — Perfil financiero transparente */}
                <div className="rounded-2xl bg-brand-50/70 border border-brand-100 p-4 mb-3">
                  <p className="text-xs font-extrabold text-brand-700 uppercase tracking-wide mb-2">
                    📋 Historia 1 — Perfil financiero transparente
                  </p>
                  <p className="text-sm font-bold text-brand-900 capitalize mb-2.5">
                    {h.perfil.perfil} <span className="font-semibold text-slate-500">· Score: {h.perfil.score}</span>{" "}
                    <span className="font-semibold text-slate-500">· Confianza: {confianzaPct ?? "—"}%</span>
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {h.perfil.influencias.map((inf, idx) => (
                      <li key={idx}>
                        <span className="font-semibold text-brand-800">{inf.pregunta}</span>
                        {" → "}
                        <span className="font-semibold">{inf.respuesta}</span>
                        {" "}
                        <span className="text-brand-500">({inf.puntos} pts)</span>
                        {" — "}
                        {inf.explicacion}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* ## Historia 2 — Propuesta explicable */}
                {h.propuesta && (
                  <div className="rounded-2xl bg-white/60 border border-white/70 p-4 mb-3">
                    <p className="text-xs font-extrabold text-brand-700 uppercase tracking-wide mb-2">
                      📈 Historia 2 — Propuesta explicable
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {normalizarDistribucion(h.propuesta.distribucion).map((d) => (
                        <span key={d.clase} className="text-[11px] font-semibold px-2.5 py-1 rounded-pill bg-brand-100 text-brand-700">
                          {d.nombre}: {d.porcentaje}%
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{h.propuesta.explicacion}</p>
                  </div>
                )}

                {/* ## Historia 3 — Revisión */}
                <div className="rounded-2xl bg-white/40 border border-white/60 p-4">
                  <p className="text-xs font-extrabold text-brand-700 uppercase tracking-wide mb-2">
                    ⏸ Historia 3 — Revisión
                  </p>
                  <p className="text-xs text-slate-500">
                    Estado: <b className="text-brand-900">{h.revision.estado}</b>
                    {h.revision.asesor && ` · asesor: ${h.revision.asesor}`}
                  </p>
                  {h.revision.estado === "pendiente" && h.propuesta && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => decidir(h.propuesta!.proposal_id, "approve")}
                        className="text-xs font-bold px-4 py-2 rounded-xl bg-success-400/20 text-success-600 hover:-translate-y-0.5 transition-transform"
                      >
                        ✓ Aprobar
                      </button>
                      <button
                        onClick={() => decidir(h.propuesta!.proposal_id, "reject")}
                        className="text-xs font-bold px-4 py-2 rounded-xl bg-red-100 text-red-600 hover:-translate-y-0.5 transition-transform"
                      >
                        ✕ Rechazar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {historia.length === 0 && <p className="text-slate-400 text-sm">Aún no hay propuestas.</p>}
        </div>
      )}

      {tab === "calidad" && calidad && (
        <div className="space-y-4">
          <div className="card-premium p-5">
            <p className="font-bold text-brand-900">Alfa de Cronbach</p>
            <p className="text-2xl font-extrabold text-brand-700">
              {calidad.cronbach.alfa ?? "—"}
            </p>
            <p className="text-xs text-slate-400">
              {calidad.cronbach.interpretacion ?? calidad.cronbach.nota}
            </p>
          </div>
          <div className="card-premium p-5">
            <p className="font-bold text-brand-900 mb-2">Estratos (n={calidad.estratos.n_total})</p>
            <div className="grid sm:grid-cols-3 gap-3 text-xs">
              {Object.entries(calidad.estratos.distribucion).map(([grupo, valores]) => (
                <div key={grupo}>
                  <p className="font-semibold text-brand-700">{grupo}</p>
                  {Object.entries(valores).map(([k, v]) => (
                    <p key={k} className="text-slate-500">{k}: {v}</p>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="card-premium p-5">
            <p className="font-bold text-brand-900 mb-2">Tiempos por pregunta (Modo Piloto)</p>
            {calidad.tiempos_por_pregunta.map((t) => (
              <p key={t.question_id} className="text-xs text-slate-500">
                {t.question_id}: {t.tiempo_promedio_seg}s promedio, {t.casos_criticos.length} casos críticos
              </p>
            ))}
          </div>
        </div>
      )}

      {tab === "autopiloto" && autopilotCfg && (
        <div className="card-premium p-5 max-w-md">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={autopilotCfg.enabled}
              onChange={(e) => setAutopilot(token, { ...autopilotCfg, enabled: e.target.checked }).then(() => recargar(token))}
            />
            Activar Modo Autopiloto
          </label>
          <label className="block mt-3 text-sm">
            Umbral de confianza: {autopilotCfg.umbral}
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={autopilotCfg.umbral}
              onChange={(e) => setAutopilot(token, { ...autopilotCfg, umbral: Number(e.target.value) }).then(() => recargar(token))}
              className="w-full"
            />
          </label>
        </div>
      )}

      {tab === "piloto" && pilotCfg && (
        <div className="card-premium p-5 max-w-md">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={pilotCfg.enabled}
              onChange={(e) => setPilotMode(token, { ...pilotCfg, enabled: e.target.checked }).then(() => recargar(token))}
            />
            Activar Modo Piloto (muestreo intencional)
          </label>
          <label className="block mt-3 text-sm">
            Fracción de sesiones: {pilotCfg.sample_fraction}
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={pilotCfg.sample_fraction}
              onChange={(e) => setPilotMode(token, { ...pilotCfg, sample_fraction: Number(e.target.value) }).then(() => recargar(token))}
              className="w-full"
            />
          </label>
        </div>
      )}

      {tab === "ranking" && (
        <div className="card-premium p-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-brand-700">
                <th className="pr-4">Cliente</th>
                <th className="pr-4">Perfil</th>
                <th className="pr-4">Confianza</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r) => (
                <tr key={r.client_id} className="border-t border-brand-50">
                  <td className="py-1.5 pr-4">{r.nombre || `#${r.client_id}`}</td>
                  <td className="pr-4 capitalize">{r.perfil}</td>
                  <td className="pr-4">{Math.round(r.confianza_media * 100)}%</td>
                  <td>{r.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "auditoria" && (
        <div className="space-y-2">
          {auditoria.map((a) => (
            <div key={a.id} className="card-premium p-4 text-sm">
              <p className="font-semibold text-brand-900">
                Propuesta #{a.proposal_id} — {a.decision} por {a.asesor}
              </p>
              <p className="text-xs text-slate-400">
                reglas {a.rules_version} · posterior {a.posterior_version} · {a.created_at}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
