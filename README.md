# 📊 Odds Ratio — Robo-Advisory Agéntico

**Track 3: Robo-Advisory y Automatización de Estrategias de Inversión**
Hackathon Agentic Scale · Ecuador Tech Week 2026 · Equipo Odds Ratio (Dataclub, ESPOL)

> ⚠️ Proyecto demostrativo con **datos ficticios y simulaciones ilustrativas**.
> El sistema **nunca ejecuta órdenes reales ni promete rentabilidad**: toda
> acción sensible queda como propuesta sujeta a aprobación de un asesor humano.

## ¿Qué hace?

Un robo-advisor con arquitectura agéntica (LangGraph) que:

1. **Perfila al inversionista** con reglas transparentes y versionadas (YAML v1.0.0) — cada respuesta explica su influencia.
2. **Actualiza un posterior bayesiano** (Beta-Binomial) del perfil con cada decisión del asesor: el sistema aprende de sus supervisores humanos.
3. **Genera una propuesta de portafolio** desde un catálogo ficticio + **fan chart** de proyección (modelo Normal-Normal, percentiles 5/25/50/75/95 — nunca una línea determinística).
4. **Explica todo con Google Gemini**, bajo un **guardrail antialucinación activo**: si el LLM inventa una cifra, su salida se descarta automáticamente.
5. **Se detiene en un checkpoint humano** (interrupt de LangGraph): un asesor autorizado aprueba/edita/rechaza, y su decisión queda en una **auditoría append-only** con versiones de reglas y modelos.
6. **Chat IA de atención al cliente** (call center virtual): consultas generales 24/7 con guardrails duros — nunca da cifras (se filtran automáticamente) y escala a asesor humano cuando detecta solicitudes de inversión.
7. **Panel Operativo con login** (solo funcionarios): revisión de propuestas, **ranking bayesiano de clientes** autoalimentado (Thompson sampling sobre el posterior Beta), auditoría y supervisión del chat.
8. **Priors bancarios**: el modelo de proyección ancla sus priors a cómo la banca reinvierte los depósitos (encaje ~5%, reinversión ~75%, tasas activa/pasiva referenciales) — ver `backend/app/data/bank_priors_v1.json`.
9. **🤖 MODO AUTOPILOTO (autonomía por excepción)** — el diferenciador comercial: el sistema **se gana la autonomía estadísticamente**. Cuando la confianza bayesiana de un cliente supera el umbral configurado y no hay alertas de Cumplimiento, el Autopiloto aprueba solo — firmando la auditoría como `ODDS-Autopilot v1` con el criterio usado. Los casos de excepción siguen yendo al humano. **Caso de negocio: 1 supervisor humano reemplaza el trabajo rutinario de N asesores.** Apagado por defecto (opt-in del operador, configurable por jurisdicción); nunca ejecuta órdenes reales.

### 🔐 Credenciales demo del Panel Operativo

| Usuario | Clave | Configurable vía |
|---|---|---|
| `operador` | `oddsratio2026` | env `OPERATOR_USER` / `OPERATOR_PASS` |

## Stack

| Capa | Tecnología |
|---|---|
| Orquestación agéntica | LangGraph (StateGraph + checkpoint SQLite + interrupt humano) |
| LLM | Google Gemini API (`gemini-2.5-flash`) vía interfaz intercambiable `LLMProvider` |
| Backend | Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy + SQLite, PyYAML, NumPy |
| Estadística | Beta-Binomial (perfil) + Normal-Normal conjugado (proyecciones Monte Carlo) |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts |
| Despliegue | Docker Compose (backend + frontend + volumen SQLite) |
| Panel auxiliar | Streamlit (`backend/admin_panel.py`) |

## 🚀 Cómo correr

### Opción A — Docker (recomendada para la VM en la nube)

```bash
# 1. (Opcional) exporta tu API key de Gemini — sin ella usa el proveedor mock
export GEMINI_API_KEY=tu_api_key
# 2. En despliegue remoto, apunta el navegador al backend público:
export NEXT_PUBLIC_API_URL=http://TU_IP_O_DOMINIO:8000

docker compose up -d --build
# Frontend: http://localhost:3000 · API: http://localhost:8000/docs
```

### Opción B — Local sin Docker

```bash
# ---- Backend (puerto 8000) ----
cd backend
pip install -r requirements.txt
cp ../.env.example .env        # pon tu GEMINI_API_KEY (opcional)
uvicorn app.main:app --port 8000

# ---- Frontend (puerto 3000) ----
cd frontend
npm install
npm run dev

# ---- Panel Streamlit (opcional) ----
cd backend
streamlit run admin_panel.py
```

### Flujo de la demo (3 pasos)

1. **http://localhost:3000/onboarding** — responde el cuestionario → el grafo genera la propuesta y se interrumpe.
2. **/propuesta?id=N** — perfil, confianza bayesiana, distribución, fan chart y explicación de Gemini (con disclaimers visibles).
3. **/asesor** — aprueba/edita/rechaza → el grafo se reanuda, registra auditoría y actualiza el posterior (verás α, β y la nueva confianza en pantalla).

## 🧪 Tests (nivel intermedio de la rúbrica)

```bash
cd backend
python -m pytest tests/ -v        # 47 tests
```

| Archivo | Qué prueba |
|---|---|
| `tests/test_rules_engine.py` | Función crítica de perfilamiento: umbrales, influencias, versiones, validación de entradas. |
| `tests/test_bayes_posterior.py` | Actualización Beta-Binomial por decisión, intervalos de credibilidad, fan chart ordenado, disclaimer obligatorio, reproducibilidad. |
| `tests/test_graph_nodes.py` | Nodos LangGraph con **LLM mockeado**: guardrail antialucinación (consistencia numérica), flujo E2E interrupt→resume, doble decisión bloqueada. |
| `tests/test_chat_ranking_auth.py` | Chat con guardrail de cifras y escalamiento a humano, login/token de operadores, endpoints protegidos (401), ranking bayesiano ordenado y autoalimentado, priors bancarios cargados. |
| `tests/test_autopilot.py` | Modo Autopiloto: apagado por defecto, confianza bajo umbral → humano, autonomía ganada tras aprobaciones (auto-aprobación firmada `ODDS-Autopilot v1`), alerta de Cumplimiento revoca la autonomía, validación de umbral. |

## 📁 Estructura

```
odds-ratio/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI (solo capa API)
│   │   ├── graph/                   # grafo LangGraph: state, nodos, build
│   │   ├── bayes/                   # Beta-Binomial + Normal-Normal (fan chart)
│   │   ├── llm/                     # LLMProvider: Gemini / mock intercambiables
│   │   ├── rules/                   # risk_rules_v1.yaml + motor determinístico
│   │   ├── data/                    # DataProvider ficticio (catálogo + retornos)
│   │   ├── workflows/               # Asesoría + Cumplimiento (departamentales)
│   │   └── routers/                 # profiling · proposals · forecast · review
│   ├── admin_panel.py               # Streamlit auxiliar
│   └── tests/                       # 30 tests (pytest)
├── frontend/                        # Next.js 14: onboarding · propuesta · asesor
├── docker-compose.yml
├── DOCUMENTO_EXPLICATIVO.md         # entregable oficial (arquitectura + track)
└── README.md
```

## 🔒 Mitigación de riesgos / antialucinación

- Todo número sale de **reglas determinísticas o modelos estadísticos versionados** — el LLM jamás calcula.
- El nodo `explicacion_llm` recibe un **JSON de solo lectura**; su salida pasa por `validar_consistencia_numerica()` y se **descarta si contiene cifras que no estén en la entrada** (queda registrado en auditoría).
- Disclaimers visibles en UI, API y textos generados.
- Auditoría **append-only**: decisión, asesor, snapshot completo, versión de reglas y del modelo bayesiano.
