"use client";
// ## ==========================================================================
// ## components/AnalisisEstadistico.tsx — el mismo panel de análisis (barras,
// ## mapa de calor, velas japonesas, ojiva, Markowitz, síntesis) que ve el
// ## cliente en /propuesta, reutilizado también en el Panel Operativo para
// ## que el asesor tenga la MISMA evidencia estadística — y, si se pide,
// ## el detalle completo de las 10 respuestas — antes de decidir.
// ## Componente 100% de presentación: no calcula nada, solo redibuja datos
// ## que el backend ya entregó (mismos endpoints que /propuesta).
// ## ==========================================================================
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import { AllocationItem, CorrelationMatrix, FanChartPoint, MarkowitzResult, Proyeccion } from "@/lib/api";

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const COLORES = ["#5B18D9", "#8A2BE2", "#A855F7", "#C4B5FD", "#E9D5FF"];

interface Influencia {
  pregunta: string;
  respuesta: string;
  puntos: number;
  explicacion: string;
}

export interface AnalisisEstadisticoProps {
  perfil: string;
  score?: number | null;
  influencias?: Influencia[];
  distribucion: AllocationItem[];
  proyeccion: Proyeccion;
  markowitz: MarkowitzResult | null;
  correlacion: CorrelationMatrix | null;
  explicacion: string;
  guardrailActivado?: boolean;
  /** Vista del asesor: agrega el detalle completo de las 10 respuestas antes
   * de los gráficos, para una decisión más rigurosa que la vista del cliente. */
  panelCompleto?: boolean;
}

// ## ---------- Velas japonesas: reinterpreta el fan chart (p05/p25/p50/p75/p95) ----------
function VelasJaponesas({ datos }: { datos: FanChartPoint[] }) {
  const paso = Math.max(1, Math.ceil(datos.length / 14));
  const muestra = datos.filter((_, i) => i % paso === 0);
  const min = Math.min(...muestra.map((d) => d.p05));
  const max = Math.max(...muestra.map((d) => d.p95));
  const rango = max - min || 1;
  const W = 700;
  const H = 260;
  const padY = 20;
  const anchoVela = W / muestra.length;
  const y = (v: number) => H - padY - ((v - min) / rango) * (H - 2 * padY);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-64">
      {muestra.map((d, i) => {
        const cx = i * anchoVela + anchoVela / 2;
        const prevP50 = i > 0 ? muestra[i - 1].p50 : d.p50;
        const sube = d.p50 >= prevP50;
        const color = sube ? "#10B981" : "#E11D48";
        const bodyTop = y(Math.max(d.p25, d.p75));
        const bodyBottom = y(Math.min(d.p25, d.p75));
        return (
          <g key={d.mes}>
            <line x1={cx} x2={cx} y1={y(d.p05)} y2={y(d.p95)} stroke={color} strokeWidth={1.5} />
            <rect
              x={cx - anchoVela * 0.28}
              y={bodyTop}
              width={anchoVela * 0.56}
              height={Math.max(2, bodyBottom - bodyTop)}
              fill={color}
              opacity={0.85}
              rx={1.5}
            />
            <line x1={cx - anchoVela * 0.28} x2={cx + anchoVela * 0.28} y1={y(d.p50)} y2={y(d.p50)} stroke="#1A0836" strokeWidth={1} />
          </g>
        );
      })}
    </svg>
  );
}

// ## ---------- Mapa de calor: correlación real entre clases de activo ----------
function MapaCalor({ datos }: { datos: CorrelationMatrix }) {
  const color = (v: number) => {
    if (v >= 0) return `rgba(91, 24, 217, ${0.12 + v * 0.75})`;
    return `rgba(225, 29, 72, ${0.12 + Math.abs(v) * 0.75})`;
  };
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-xs mx-auto">
        <thead>
          <tr>
            <th className="p-1.5" />
            {datos.clases.map((c) => (
              <th key={c} className="p-1.5 font-semibold text-brand-700 text-[10px] max-w-[70px]">
                {c.replaceAll("_", " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {datos.matriz.map((fila, i) => (
            <tr key={datos.clases[i]}>
              <td className="p-1.5 font-semibold text-brand-700 text-[10px] text-right whitespace-nowrap">
                {datos.clases[i].replaceAll("_", " ")}
              </td>
              {fila.map((v, j) => (
                <td key={j} className="p-0">
                  <div
                    className="h-11 w-14 flex items-center justify-center font-bold rounded-sm m-0.5"
                    style={{ background: color(v), color: Math.abs(v) > 0.5 ? "white" : "#1A0836" }}
                    title={`ρ(${datos.clases[i]}, ${datos.clases[j]}) = ${v}`}
                  >
                    {v.toFixed(2)}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalisisEstadistico({
  perfil,
  score,
  influencias = [],
  distribucion,
  proyeccion,
  markowitz,
  correlacion,
  explicacion,
  guardrailActivado,
  panelCompleto,
}: AnalisisEstadisticoProps) {
  const histograma = proyeccion.histograma_valor_final ?? [];
  const probPerdida = proyeccion.prob_perdida_capital_pct;

  const factorDominante = influencias.length
    ? influencias.reduce((max, i) => (i.puntos > max.puntos ? i : max), influencias[0])
    : null;
  const factorConservador = influencias.length
    ? influencias.reduce((min, i) => (i.puntos < min.puntos ? i : min), influencias[0])
    : null;
  const desviacionMarkowitz = markowitz
    ? distribucion.reduce((sum, d) => sum + Math.abs(d.porcentaje - (markowitz.pesos[d.clase] ?? 0)), 0) / distribucion.length
    : null;

  return (
    <div className="space-y-5">
      {/* ## Detalle completo de las 10 respuestas — SOLO en el panel del asesor */}
      {panelCompleto && influencias.length > 0 && (
        <div className="card-premium p-6">
          <h2 className="font-bold text-brand-900 mb-1">Detalle completo del cuestionario</h2>
          <p className="text-xs text-slate-400 mb-4">
            Las {influencias.length} respuestas que determinaron el score y el perfil — reglas versionadas,
            transparentes, sin caja negra.
          </p>
          <ul className="space-y-2 text-xs text-slate-600">
            {influencias.map((inf, idx) => (
              <li key={idx} className="border-b border-brand-50 pb-2 last:border-0">
                <span className="font-semibold text-brand-800">{inf.pregunta}</span>
                {" → "}
                <span className="font-semibold">{inf.respuesta}</span> <span className="text-brand-500">({inf.puntos} pts)</span>
                {" — "}
                {inf.explicacion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ## Fila de estadísticas clave */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-premium p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Horizonte</p>
          <p className="text-lg font-extrabold text-brand-900 mt-1">
            {proyeccion.horizonte_meses}
            <span className="text-xs font-semibold text-slate-400 ml-1">meses</span>
          </p>
        </div>
        <div className="card-premium p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Riesgo esperado</p>
          <p className="text-lg font-extrabold text-brand-900 mt-1">
            {(proyeccion.volatilidad_mensual * 100).toFixed(1)}
            <span className="text-xs font-semibold text-slate-400 ml-1">% mensual</span>
          </p>
        </div>
        <div className="card-premium p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Diversificación</p>
          <p className="text-lg font-extrabold text-brand-900 mt-1">
            {distribucion.length}
            <span className="text-xs font-semibold text-slate-400 ml-1">clases de activo</span>
          </p>
        </div>
      </div>

      {/* ## Distribución propuesta — BARRAS (nunca torta) */}
      <div className="card-premium p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-brand-900">Distribución propuesta</h2>
          <span className="text-xs font-semibold text-slate-400">% por clase de activo</span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={distribucion} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EDE7FB" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
            <YAxis type="category" dataKey="nombre" width={150} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => `${v}%`} />
            <Bar dataKey="porcentaje" radius={[0, 8, 8, 0]}>
              {distribucion.map((_, i) => (
                <Cell key={i} fill={COLORES[i % COLORES.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ## Mapa de calor — correlación empírica real entre clases riesgosas */}
      {correlacion && (
        <div className="card-premium p-6">
          <h2 className="font-bold text-brand-900 mb-1">Mapa de calor — correlación entre activos</h2>
          <p className="text-xs text-slate-400 mb-4">
            Correlación de Pearson empírica (ρ), calculada de los mismos retornos históricos que usa Markowitz.
          </p>
          <MapaCalor datos={correlacion} />
        </div>
      )}

      {/* ## Velas japonesas — reinterpretación del fan chart Normal-Normal */}
      <div className="card-premium p-6">
        <h2 className="font-bold text-brand-900 mb-1">Proyección — velas japonesas</h2>
        <p className="text-xs text-slate-400 mb-3">
          Cada vela = un mes simulado: mecha p05–p95, cuerpo p25–p75, línea = mediana (p50). Verde si la
          mediana sube vs. el mes anterior, roja si baja. Mismo Monte Carlo del modelo {proyeccion.modelo}.
        </p>
        <VelasJaponesas datos={proyeccion.fan_chart} />
        <DisclaimerBanner texto={proyeccion.disclaimer} />
      </div>

      {/* ## Ojiva — histograma + frecuencia acumulada del valor final simulado */}
      <div className="card-premium p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-brand-900">Distribución del resultado final — ojiva</h2>
          <span className="text-xs font-bold text-brand-600">{probPerdida}% prob. de pérdida</span>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Histograma (barras, {proyeccion.n_simulaciones ?? "4000"} simulaciones) + polígono de frecuencia
          acumulada (línea, %) del valor del portafolio al mes {proyeccion.horizonte_meses}.
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={histograma}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EDE7FB" />
            <XAxis dataKey="bin_fin" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${fmt(v)}`} />
            <YAxis yAxisId="izq" tick={{ fontSize: 11 }} label={{ value: "frecuencia", angle: -90, fontSize: 10, position: "insideLeft" }} />
            <YAxis yAxisId="der" orientation="right" tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
            <Tooltip labelFormatter={(v) => `≤ $${fmt(Number(v))}`} />
            <Legend />
            <Bar yAxisId="izq" dataKey="frecuencia" name="Frecuencia" fill="#A855F7" radius={[4, 4, 0, 0]} />
            <Line yAxisId="der" type="monotone" dataKey="frecuencia_acumulada_pct" name="Acumulada %" stroke="#5B18D9" strokeWidth={2.5} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {markowitz && (
        <div className="card-premium p-6">
          <h2 className="font-bold text-brand-900 mb-1">Comparación con Markowitz</h2>
          <p className="text-xs text-slate-400 mb-3">{markowitz.nota}</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={distribucion.map((d) => ({
                clase: d.nombre,
                Reglas: d.porcentaje,
                Markowitz: markowitz.pesos[d.clase] ?? 0,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE7FB" />
              <XAxis dataKey="clase" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Reglas" fill="#5B18D9" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Markowitz" fill="#A855F7" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ## Análisis estadístico ÚNICO de este formulario */}
      {(factorDominante || desviacionMarkowitz !== null) && (
        <div className="card-premium p-6 bg-gradient-to-br from-brand-50 to-white">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="h-8 w-8 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white text-sm">
              📐
            </span>
            <h2 className="font-bold text-brand-900">Análisis estadístico {panelCompleto ? "del caso" : "de tu propuesta"}</h2>
          </div>
          <ul className="space-y-2 text-sm text-slate-600 leading-relaxed">
            {score != null && (
              <li>
                • {panelCompleto ? "El" : "Tu"} puntaje total fue <b className="text-brand-900">{score}</b>, lo que{" "}
                {panelCompleto ? "ubicó al cliente" : "te ubicó"} en el perfil{" "}
                <b className="capitalize text-brand-900">{perfil}</b> según los umbrales versionados del cuestionario.
              </li>
            )}
            {factorDominante && (
              <li>
                • La respuesta con <b>mayor peso en el score</b> fue "{factorDominante.pregunta}" →{" "}
                <b>{factorDominante.respuesta}</b> ({factorDominante.puntos} pts): {factorDominante.explicacion}
              </li>
            )}
            {factorConservador && factorConservador !== factorDominante && (
              <li>
                • La respuesta <b>más conservadora</b> fue "{factorConservador.pregunta}" →{" "}
                <b>{factorConservador.respuesta}</b> ({factorConservador.puntos} pts): {factorConservador.explicacion}
              </li>
            )}
            <li>
              • Según la simulación Monte Carlo, hay un <b className="text-brand-900">{probPerdida}%</b> de
              probabilidad de terminar con menos capital del invertido (${fmt(proyeccion.monto_inicial)}) al
              cabo de {proyeccion.horizonte_meses} meses.
            </li>
            {desviacionMarkowitz !== null && (
              <li>
                • La asignación por reglas difiere en promedio{" "}
                <b className="text-brand-900">{desviacionMarkowitz.toFixed(1)} puntos porcentuales</b> por clase
                respecto a la cartera óptima de Markowitz —{" "}
                {desviacionMarkowitz < 5
                  ? "una coincidencia alta"
                  : "una diferencia esperable, ya que las reglas priorizan simplicidad y transparencia sobre optimización pura"}
                .
              </li>
            )}
          </ul>
        </div>
      )}

      {/* ## Explicación IA */}
      <div className="card-premium p-6">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="h-8 w-8 rounded-xl bg-gradient-to-br from-brand-500 to-accent flex items-center justify-center text-white text-sm">
            ✨
          </span>
          <h2 className="font-bold text-brand-900">Explicación</h2>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">{explicacion}</p>
        {guardrailActivado && (
          <p className="text-xs text-amber-600 mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Nota: se activó el guardrail antialucinación en la redacción de esta explicación.
          </p>
        )}
      </div>
    </div>
  );
}
