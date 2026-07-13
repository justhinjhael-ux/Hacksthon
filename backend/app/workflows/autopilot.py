"""AUTOPILOTO — motor de RECOMENDACIÓN (`autopilot-v1`), nunca de ejecución.

REGLA DEL TRACK (obligatoria, no negociable): toda acción sensible queda como
propuesta sujeta a aprobación de un asesor humano. Por eso el Autopiloto
JAMÁS cambia el estado de una propuesta ni llama a resume_advisory() — solo
calcula si el caso CALIFICA para una recomendación (confianza bayesiana >=
umbral configurado y sin alertas de Cumplimiento) y deja esa recomendación
visible para el asesor en el Panel Operativo. La propuesta permanece
"pendiente" hasta que un humano hace clic en Aprobar, Editar o Rechazar.

Es soporte técnico y de priorización (qué casos son rutinarios y cuáles
requieren más atención) — nunca un sustituto de la decisión humana.
"""
from sqlalchemy.orm import Session

from app.models import Proposal, SystemSetting

AUTOPILOT_VERSION = "autopilot-v1"
SETTING_KEY = "autopilot"
DEFAULT_CONFIG = {"enabled": False, "umbral": 0.75}


def get_config(db: Session) -> dict:
    setting = db.query(SystemSetting).filter_by(key=SETTING_KEY).one_or_none()
    if setting is None:
        return dict(DEFAULT_CONFIG)
    return {**DEFAULT_CONFIG, **setting.value}


def set_config(db: Session, enabled: bool, umbral: float) -> dict:
    if not (0.0 <= umbral <= 1.0):
        raise ValueError("El umbral debe estar entre 0.0 y 1.0")
    setting = db.query(SystemSetting).filter_by(key=SETTING_KEY).one_or_none()
    valor = {"enabled": enabled, "umbral": umbral}
    if setting is None:
        setting = SystemSetting(key=SETTING_KEY, value=valor)
        db.add(setting)
    else:
        setting.value = valor
    db.commit()
    return valor


def evaluar_recomendacion(db: Session, proposal: Proposal) -> dict:
    """Calcula si esta propuesta CALIFICA para una recomendación de aprobación
    rápida — NO aprueba nada. Guarda el resultado en Proposal.autopilot (solo
    metadata informativa) y lo devuelve para mostrarlo en la UI del asesor.
    """
    config = get_config(db)
    alertas = (proposal.alerta_cumplimiento or {}).get("alertas", [])

    if not config["enabled"]:
        resultado = {"recomendado": False, "motivo": "Autopiloto desactivado por el operador."}
    elif alertas:
        resultado = {"recomendado": False, "motivo": "Hay alertas de Cumplimiento: requiere revisión humana prioritaria."}
    elif proposal.confianza < config["umbral"]:
        resultado = {
            "recomendado": False,
            "motivo": f"Confianza {proposal.confianza:.0%} por debajo del umbral ({config['umbral']:.0%}).",
        }
    else:
        resultado = {
            "recomendado": True,
            "motivo": (
                f"Confianza {proposal.confianza:.0%} >= umbral {config['umbral']:.0%} y sin alertas de "
                "Cumplimiento — el sistema sugiere que es un caso rutinario, apto para aprobación rápida."
            ),
        }

    resultado["umbral"] = config["umbral"]
    resultado["confianza"] = proposal.confianza
    resultado["version"] = AUTOPILOT_VERSION
    proposal.autopilot = resultado
    db.flush()
    return resultado


def stats(db: Session) -> dict:
    config = get_config(db)
    propuestas = db.query(Proposal).all()
    recomendadas_pendientes = sum(
        1 for p in propuestas if (p.autopilot or {}).get("recomendado") and p.estado == "pendiente"
    )
    return {
        "version": AUTOPILOT_VERSION,
        "config": config,
        "total_propuestas": len(propuestas),
        "recomendadas_pendientes_de_revision": recomendadas_pendientes,
    }
