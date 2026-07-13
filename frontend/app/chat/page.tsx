"use client";
// ## ==========================================================================
// ## app/chat/page.tsx — ORAI: asistente de atención general (call center).
// ## Guardrails duros: nunca cifras, escala a humano si detecta solicitud de
// ## inversión, y siempre recuerda el horario de atención humana (dato fijo,
// ## no lo redacta el LLM — mismo principio antialucinación del proyecto).
// ## ==========================================================================
import { useEffect, useState } from "react";
import { getChatSugerencias, sendChatMessage } from "@/lib/api";
import { asset } from "@/lib/assetPath";

interface Mensaje {
  role: "user" | "assistant";
  content: string;
  escalado?: boolean;
}

const SESSION_ID = `sess-${Math.random().toString(36).slice(2, 10)}`;

export default function ChatPage() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    { role: "assistant", content: "¡Hola! Soy ORAI, el asistente de Odds Ratio. ¿En qué puedo ayudarte hoy?" },
  ]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sugerencias, setSugerencias] = useState<string[]>([]);
  const [horario, setHorario] = useState("");

  useEffect(() => {
    getChatSugerencias()
      .then((s) => {
        setSugerencias(s.mensajes);
        setHorario(s.horario_atencion);
      })
      .catch(() => {});
  }, []);

  async function enviarTexto(mensajeUsuario: string) {
    if (!mensajeUsuario.trim()) return;
    setMensajes((prev) => [...prev, { role: "user", content: mensajeUsuario }]);
    setTexto("");
    setEnviando(true);
    try {
      const r = await sendChatMessage(SESSION_ID, mensajeUsuario);
      setMensajes((prev) => [...prev, { role: "assistant", content: r.respuesta, escalado: r.escalado }]);
    } catch {
      setMensajes((prev) => [
        ...prev,
        { role: "assistant", content: "No pude conectarme al servidor. Intenta de nuevo en un momento." },
      ]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[75vh] card-premium p-5">
      <div className="flex items-center gap-3 pb-3 border-b border-white/60">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset("/orai-avatar.png")}
          alt="ORAI"
          className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-lift"
        />
        <div>
          <p className="font-bold text-brand-900">ORAI</p>
          <p className="text-xs text-slate-400">Asistente de atención general — sin cifras, con guardrails</p>
        </div>
      </div>

      {/* ## Aviso permanente de atención humana — siempre visible, no depende del LLM */}
      {horario && (
        <p className="text-[11px] text-brand-600 bg-brand-50 border border-brand-100 rounded-xl px-3 py-2 mt-3">
          📞 ¿Necesitas un asesor humano? Atendemos {horario}. Escríbelo aquí cuando quieras.
        </p>
      )}

      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {mensajes.map((m, i) => (
          <div key={i} className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={asset("/orai-avatar.png")} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
            )}
            <div
              className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-line ${
                m.role === "user"
                  ? "bg-gradient-to-b from-brand-500 to-brand-700 text-white"
                  : "bg-white/70 backdrop-blur-sm text-brand-900 border border-white/70"
              }`}
            >
              {m.content}
              {m.escalado && (
                <p className="text-[10px] mt-1 uppercase tracking-wide font-bold text-amber-500">
                  Escalado a asesor humano
                </p>
              )}
            </div>
          </div>
        ))}
        {enviando && (
          <div className="flex items-end gap-2 justify-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset("/orai-avatar.png")} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
            <div className="px-4 py-2.5 rounded-2xl bg-white/70 border border-white/70 flex gap-1 items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-bounce" />
            </div>
          </div>
        )}
      </div>

      {/* ## Mensajes predeterminados (accesos rápidos) */}
      {sugerencias.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-3">
          {sugerencias.map((s) => (
            <button
              key={s}
              onClick={() => enviarTexto(s)}
              disabled={enviando}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-pill bg-white/60 border border-brand-100 text-brand-700 hover:bg-brand-50 hover:-translate-y-0.5 transition-all disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-3 border-t border-white/60">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviarTexto(texto)}
          placeholder="Escribe tu mensaje…"
          className="flex-1 rounded-xl border border-brand-100 bg-white/70 px-3.5 py-2.5 text-sm"
        />
        <button onClick={() => enviarTexto(texto)} disabled={enviando} className="btn-primary disabled:opacity-50">
          Enviar
        </button>
      </div>
    </div>
  );
}
