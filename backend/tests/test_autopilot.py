"""Tests del Autopiloto como RECOMENDADOR (nunca ejecutor): apagado por
defecto, umbral, recomendación marcada sin cambiar el estado, alertas de
Cumplimiento descartan la recomendación. Regla del track: toda propuesta
sigue "pendiente" hasta que un humano decide — el Autopiloto jamás llama a
resume_advisory()."""
import pytest

from app.workflows import autopilot
from app.workflows.asesoria_workflow import start_advisory
from tests.conftest import RESPUESTAS_MODERADO


def test_apagado_por_defecto(db):
    config = autopilot.get_config(db)
    assert config["enabled"] is False


def test_desactivado_no_recomienda(db):
    resultado = start_advisory(
        db, cliente={"nombre": "X", "email": "x@t.com"}, respuestas=RESPUESTAS_MODERADO
    )
    assert resultado["estado"] == "pendiente"
    assert resultado["autopilot"]["recomendado"] is False


def test_confianza_bajo_umbral_no_recomienda(db):
    autopilot.set_config(db, enabled=True, umbral=0.95)
    resultado = start_advisory(
        db, cliente={"nombre": "X", "email": "x@t.com"}, respuestas=RESPUESTAS_MODERADO
    )
    assert resultado["estado"] == "pendiente"  # confianza inicial (0.5) < 0.95
    assert resultado["autopilot"]["recomendado"] is False


def test_recomienda_pero_nunca_aprueba_solo(db):
    """El caso califica (confianza >= umbral, sin alertas) — el Autopiloto lo
    marca como recomendado, pero la propuesta DEBE seguir pendiente: la
    decisión final siempre es del asesor humano (requisito del track)."""
    autopilot.set_config(db, enabled=True, umbral=0.4)  # confianza inicial 0.5 >= 0.4
    resultado = start_advisory(
        db, cliente={"nombre": "Y", "email": "y@t.com"}, respuestas=RESPUESTAS_MODERADO
    )
    assert resultado["estado"] == "pendiente"  # NUNCA se auto-aprueba
    assert resultado["autopilot"]["recomendado"] is True

    from app.models import AdvisorDecision

    # No debe existir NINGÚN registro de auditoría todavía: nadie decidió.
    assert db.query(AdvisorDecision).filter_by(proposal_id=resultado["proposal_id"]).count() == 0


def test_recomendacion_no_bloquea_decision_humana_posterior(db):
    """Aunque el Autopiloto recomiende, el asesor humano debe poder aprobar,
    editar o rechazar con total libertad — la recomendación es solo un dato
    informativo más en la propuesta."""
    autopilot.set_config(db, enabled=True, umbral=0.4)
    resultado = start_advisory(
        db, cliente={"nombre": "Y2", "email": "y2@t.com"}, respuestas=RESPUESTAS_MODERADO
    )
    assert resultado["autopilot"]["recomendado"] is True

    from app.models import Proposal
    from app.workflows.asesoria_workflow import resume_advisory

    proposal = db.get(Proposal, resultado["proposal_id"])
    final = resume_advisory(db, proposal, {"decision": "reject", "asesor": "un_humano", "comentario": ""})
    assert final["estado"] == "rechazada"  # el humano puede ir en contra de la recomendación


def test_alerta_cumplimiento_descarta_recomendacion(db, monkeypatch):
    autopilot.set_config(db, enabled=True, umbral=0.1)

    from app.workflows import cumplimiento_workflow

    def _alerta_falsa(pesos):
        return {"version": "test", "ok": False, "alertas": [{"clase": "acciones", "mensaje": "test"}]}

    monkeypatch.setattr(cumplimiento_workflow, "check_concentration", _alerta_falsa)
    # nodo_cumplimiento importa check_concentration directamente -> parchear ahí también
    from app.graph import nodes as graph_nodes

    monkeypatch.setattr(graph_nodes, "check_concentration", _alerta_falsa)

    resultado = start_advisory(
        db, cliente={"nombre": "Z", "email": "z@t.com"}, respuestas=RESPUESTAS_MODERADO
    )
    assert resultado["estado"] == "pendiente"
    assert resultado["autopilot"]["recomendado"] is False


def test_validacion_umbral_fuera_de_rango(db):
    with pytest.raises(ValueError):
        autopilot.set_config(db, enabled=True, umbral=1.5)


def test_stats_cuenta_recomendadas_pendientes(db):
    autopilot.set_config(db, enabled=True, umbral=0.4)
    start_advisory(db, cliente={"nombre": "S1", "email": "s1@t.com"}, respuestas=RESPUESTAS_MODERADO)
    start_advisory(db, cliente={"nombre": "S2", "email": "s2@t.com"}, respuestas=RESPUESTAS_MODERADO)
    resumen = autopilot.stats(db)
    assert resumen["recomendadas_pendientes_de_revision"] == 2
