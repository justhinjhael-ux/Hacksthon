"""Router /chat — asistente ORAI de atención general (call center virtual).

GUARDRAILS DUROS: este canal NO tiene datos calculados por los modelos
estadísticos (no hay JSON de solo lectura como en explicacion_llm), así que
CUALQUIER cifra en la respuesta sería alucinada por definición — se filtra
automáticamente. Las solicitudes de asesoría de inversión (comprar, invertir,
cuánto debo poner) escalan a un asesor humano en vez de responderse.
"""
import re

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import require_operator
from app.database import get_db
from app.llm.provider import get_llm_provider
from app.models import ChatMessage
from app.schemas import ChatIn

router = APIRouter(prefix="/chat", tags=["chat"])

PALABRAS_ESCALAMIENTO = (
    "invertir", "inversión", "comprar", "vender", "portafolio", "cuánto debo",
    "cuanto debo", "recomiéndame", "recomiendame", "qué acciones", "que acciones",
    "hablar con alguien", "asesor humano", "persona real", "quiero un asesor",
)

# Horario de atención humana — DATO FIJO, no lo redacta el LLM (mismo
# principio antialucinación que el resto del proyecto: información sensible
# nunca sale de un modelo generativo).
HORARIO_ATENCION = "lunes a viernes, 8:00 a. m. – 6:00 p. m. (hora Ecuador)"
RECORDATORIO_HUMANO = (
    f"📞 Si prefieres hablar con un asesor humano, nuestro equipo atiende "
    f"{HORARIO_ATENCION}. Puedes pedirlo aquí mismo cuando quieras."
)

MENSAJE_ESCALAMIENTO = (
    "Esa es una consulta de asesoría de inversión — para responderte con "
    "responsabilidad, un asesor humano autorizado la revisará y te contactará. "
    f"Nuestro equipo atiende {HORARIO_ATENCION}. Mientras tanto, puedo ayudarte "
    "con preguntas generales sobre Odds Ratio."
)

# ## Mensajes predeterminados (accesos rápidos) — el frontend los muestra como
# ## botones; al hacer clic se envían como un mensaje normal por este mismo
# ## endpoint, pasando por los mismos guardrails.
MENSAJES_PREDETERMINADOS = [
    "¿Qué es Odds Ratio y cómo funciona?",
    "¿Mis datos están seguros?",
    "¿Cómo se genera mi propuesta de inversión?",
    "Quiero hablar con un asesor humano",
]

PROMPT_CHAT = """Eres ORAI, el asistente virtual de atención al cliente de un
robo-advisor regulado (Odds Ratio). Respondes preguntas GENERALES sobre el
servicio y puedes sostener una conversación natural y cercana (saludos,
agradecimientos, small talk), siempre en español y en máximo 80 palabras.
NUNCA menciones cifras, porcentajes ni montos (no tienes datos financieros
calculados en este canal). Si la pregunta pide una recomendación de inversión,
responde que un asesor humano se pondrá en contacto.

Pregunta del usuario: {mensaje}
"""

_NUMERO_RE = re.compile(r"-?\d[\d,]*\.?\d*\s*%?")


def _contiene_solicitud_inversion(mensaje: str) -> bool:
    m = mensaje.lower()
    return any(p in m for p in PALABRAS_ESCALAMIENTO)


def _filtrar_cifras(texto: str) -> tuple[str, bool]:
    """Elimina cualquier número de la respuesta (guardrail duro de este
    canal): aquí no hay datos calculados, así que ninguna cifra es legítima."""
    filtrado = _NUMERO_RE.sub("[cifra omitida — consulta con tu asesor]", texto)
    return filtrado, filtrado != texto


@router.get("/sugerencias")
def sugerencias():
    """Mensajes predeterminados (accesos rápidos) que muestra el frontend."""
    return {"mensajes": MENSAJES_PREDETERMINADOS, "horario_atencion": HORARIO_ATENCION}


@router.post("")
def chat(payload: ChatIn, db: Session = Depends(get_db)):
    escalado = _contiene_solicitud_inversion(payload.mensaje)
    guardrail_activado = False

    if escalado:
        respuesta = MENSAJE_ESCALAMIENTO
    else:
        provider = get_llm_provider()
        texto = provider.generate(PROMPT_CHAT.format(mensaje=payload.mensaje))
        respuesta, guardrail_activado = _filtrar_cifras(texto)
        # Recuerda SIEMPRE la opción de hablar con un humano y el horario —
        # dato fijo, no lo redacta el LLM (mismo principio antialucinación).
        respuesta = f"{respuesta}\n\n{RECORDATORIO_HUMANO}"

    db.add(ChatMessage(session_id=payload.session_id, role="user", content=payload.mensaje))
    db.add(
        ChatMessage(
            session_id=payload.session_id,
            role="assistant",
            content=respuesta,
            escalado=escalado,
            guardrail_activado=guardrail_activado,
        )
    )
    db.commit()

    return {"respuesta": respuesta, "escalado": escalado, "guardrail_activado": guardrail_activado}


@router.get("/logs", dependencies=[Depends(require_operator)])
def logs(db: Session = Depends(get_db)):
    mensajes = db.query(ChatMessage).order_by(ChatMessage.id.desc()).limit(500).all()
    return [
        {
            "id": m.id,
            "session_id": m.session_id,
            "role": m.role,
            "content": m.content,
            "escalado": m.escalado,
            "guardrail_activado": m.guardrail_activado,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in mensajes
    ]
