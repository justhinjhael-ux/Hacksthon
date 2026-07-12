# DOCUMENTO EXPLICATIVO — Odds Ratio

**Hackathon Agentic Scale · Ecuador Tech Week 2026 · Club TAWS — ESPOL**
**Equipo:** Odds Ratio (Dataclub, ESPOL)
**Track asignado:** Track 3 — Robo-Advisory y Automatización de Estrategias de Inversión

---

## 1. Diagrama de arquitectura (agente, canales, integraciones externas)

```
                        ┌──────────────────────────────────────────────────────────┐
                        │                    CANALES (interfaz)                    │
                        │   Next.js 14 (onboarding · propuesta · panel asesor)     │
                        │   Streamlit admin_panel.py (pruebas internas)            │
                        └────────────────────────┬─────────────────────────────────┘
                                                 │ REST (FastAPI, JSON)
                        ┌────────────────────────▼─────────────────────────────────┐
                        │              BACKEND — AGENTE (LangGraph)                │
                        │                                                          │
   reglas YAML v1.0.0   │  START                                                   │
   (versionadas) ──────►│    └► [1] perfilamiento          (determinístico)        │
                        │    └► [2] posterior_bayesiano    (Beta-Binomial v1)      │
   catálogo ficticio ──►│    └► [3] generar_propuesta      (determinístico)        │
   retornos ficticios ─►│    └► [4] proyectar_series_tiempo(Normal-Normal v1)      │
                        │    └► [5] cumplimiento           (workflow dept. #2)     │
   Google Gemini API ══►│    └► [6] explicacion_llm  + GUARDRAIL antialucinación   │
                        │    ─────────── ⏸ INTERRUPT (checkpoint SQLite) ───────── │
                        │    └► [7] revision_humana        (decisión del asesor)   │
                        │    └► [8] auditoria (append-only + feedback bayesiano)   │
                        │  END                                                     │
                        └────────────┬─────────────────────────────────────────────┘
                                     │ SQLAlchemy
                        ┌────────────▼────────────┐
                        │  SQLite (volumen Docker)│  clients · proposals ·
                        │  + checkpoints LangGraph│  advisor_decisions (append-only)
                        └─────────────────────────┘  · risk_posteriors

   ─── INTEGRACIONES FUTURAS (roadmap, NO implementadas — líneas punteadas) ───
   ┄┄► Core bancario (posiciones/órdenes reales)     ┄┄► CRM (Salesforce)
   ┄┄► Proveedor KYC/AML (dept. Onboarding/Comercial)┄┄► Bus de eventos →
       Reporting/Backoffice (exportación contable de la auditoría)
```

**Puntos arquitectónicos clave:**

- **Lógica separada de la interfaz:** el frontend solo consume JSON; toda la
  lógica vive en el grafo LangGraph y módulos versionados.
- **Continuidad conversacional:** cada propuesta es un `thread_id` de LangGraph
  con checkpoint en SQLite — el flujo puede reanudarse horas después, incluso
  tras reiniciar el servidor.
- **Confiabilidad verificable:** 30 tests automatizados (pytest), datos con
  semillas fijas (demo reproducible) y bitácora de auditoría inmutable.

## 2. Track asignado

**Track 3 — Robo-Advisory y Automatización de Estrategias de Inversión.**

Cumplimiento de las reglas obligatorias del track:

| Regla | Cómo se cumple |
|---|---|
| Nunca ejecuta órdenes reales ni promete rentabilidad | El grafo se **interrumpe** antes de finalizar; solo un asesor humano decide. El estado final es una decisión registrada, jamás una orden ejecutada. El workflow de Cumplimiento solo genera alertas. |
| Datos ficticios / integraciones simuladas permitidas, flujo de extremo a extremo | Catálogo e históricos ficticios versionados con semilla fija; el flujo completo (perfil → propuesta → explicación → revisión → auditoría) se demuestra E2E en la web. |
| Disclaimer visible en toda proyección | Banner de advertencia en la UI (componente `DisclaimerBanner`, no letra pequeña), en el texto del LLM, en la respuesta JSON de la API y en el pie de página permanente. |

## 3. Tipo de negocio al que aplica

**Instituciones financieras y fintechs con servicio de asesoría de inversión:**
casas de valores, administradoras de fondos, banca privada / wealth management
(desde bancos locales hasta actores internacionales como Bank of America,
JPMorgan Chase o Santander) y fintechs de inversión digital en LATAM.

**Contexto regulatorio ecuatoriano:** la normativa del mercado de valores
(Superintendencia de Compañías, Valores y Seguros; Ley de Mercado de Valores)
exige que las recomendaciones de inversión mantengan responsabilidad humana
profesional. Odds Ratio está diseñado alrededor de ese requisito: la IA
**prepara y explica**, pero el **asesor humano autorizado es siempre el
responsable final** — cada decisión queda auditada con la versión exacta de
reglas y modelos usados (trazabilidad regulatoria). Este enfoque
human-in-the-loop hace el producto **comercializable hoy**, sin esperar cambios
normativos que permitan asesoría 100 % automatizada.

**Diferenciadores técnicos del producto:**
1. **Enfoque bayesiano con retroalimentación:** la confianza del sistema en su
   clasificación de perfil se actualiza con cada decisión del asesor
   (Beta-Binomial). El sistema *aprende de sus supervisores humanos* de forma
   estadísticamente rigurosa, y las proyecciones son distribuciones (fan chart
   Normal-Normal), nunca promesas puntuales.
2. **Antialucinación verificada, no prometida:** el LLM (Gemini) solo redacta
   números ya calculados; un validador de consistencia numérica descarta
   cualquier salida con cifras inventadas y cae a una plantilla determinística.
   El evento queda registrado en auditoría.
3. **Priors informados por la práctica bancaria** (`bank_priors_v1.json`): los
   bancos no dejan los depósitos estancados — mantienen un encaje (~5%) y
   reinvierten ~75% en cartera de crédito, ganando el spread entre tasa activa
   (~9.5%) y pasiva (~5.5%). Cada clase de activo ancla su prior μ₀ a esas
   tasas: renta fija → tasa pasiva; acciones → tasa activa. Versionado y
   justificado clase por clase.
4. **Ranking bayesiano de clientes autoalimentado** (`client-ranking-v1`):
   Thompson sampling sobre el posterior Beta de cada cliente × retorno esperado
   de su perfil. Cada decisión del asesor lo actualiza automáticamente. Es
   **priorización informativa** para la gestión comercial: el sistema jamás
   excluye ni discrimina clientes de forma automática.
5. **Canal conversacional supervisado (chat IA):** atención de consultas
   generales 24/7 con Gemini bajo guardrails duros — cualquier cifra financiera
   en la respuesta se bloquea (en este canal no hay datos calculados, toda
   cifra sería alucinada) y las solicitudes de asesoría escalan a un humano.
   Los operadores supervisan todas las conversaciones desde el panel.
6. **Panel Operativo con control de acceso:** login de funcionarios (token;
   en producción OAuth2/SAML corporativo) que protege decisión de propuestas,
   ranking, auditoría y logs del chat — el resto de la API pública no expone
   información de gestión.
7. **🤖 MODO AUTOPILOTO — autonomía por excepción (`autopilot-v1`):** el
   sistema se gana la autonomía estadísticamente. Al inicio todo pasa por
   humanos; cada aprobación sube el posterior Beta; cuando la confianza supera
   el umbral configurado y no hay alertas de Cumplimiento, el sistema aprueba
   solo (firma transparente `ODDS-Autopilot v1` en la auditoría append-only,
   con el umbral y la confianza usados). **Propuesta de valor ejecutiva: un
   supervisor humano + el sistema absorben el trabajo rutinario de N asesores
   — reducción de costo operativo de hasta ~80% en asesoría de rutina** (ver
   calculadora ROI en la landing). Límites de seguridad: apagado por defecto,
   nunca ejecuta órdenes reales, alertas de Cumplimiento revocan la autonomía
   y el nivel es configurable por jurisdicción regulatoria.

## 4. Cómo se integraría a un sistema empresarial existente

Presentado como **evolución natural del MVP** (nada de esto está implementado —
es el patrón de integración):

1. **API REST como contrato:** el backend ya expone endpoints limpios
   (`/profiling`, `/proposals`, `/review`, `/forecast`). Un core bancario
   (Temenos, Cobis, etc.) los consumiría igual que hoy lo hace el frontend.
2. **CRM (ej. Salesforce):** las propuestas y decisiones se sincronizan como
   actividades del cliente vía webhooks/REST; el asesor decide desde el CRM y
   la decisión reanuda el mismo grafo LangGraph.
3. **KYC/AML:** el departamento Onboarding/Comercial (roadmap) reemplaza el
   alta simple de cliente por un proveedor de verificación de identidad; el
   nodo de perfilamiento consume ese resultado sin cambiar el grafo.
4. **Bus de eventos (Kafka/RabbitMQ):** cada transición del grafo emite eventos
   (`propuesta.creada`, `decision.registrada`, `alerta.cumplimiento`) que los
   workflows departamentales consumen: Cumplimiento (ya implementado como nodo
   simulado), Reporting/Backoffice (roadmap: exportación de la tabla
   append-only a sistemas contables).
5. **Datos de mercado reales:** la interfaz `DataProvider` está diseñada para
   sustituir el proveedor ficticio por Bloomberg/Refinitiv o las bolsas de
   valores de Quito/Guayaquil **sin tocar la lógica de negocio**.
6. **Identidad y permisos:** el rol "asesor autorizado" se conectaría al
   directorio corporativo (OAuth2/SAML) para que solo personal certificado
   pueda resolver el checkpoint humano.

## 5. Uso de Google Gemini API y enfoque bayesiano (premio del patrocinador)

**Este proyecto usa la API de Google Gemini** (modelo `gemini-2.5-flash`, SDK
oficial `google-genai`) como proveedor LLM principal — candidato al premio
**"Best Use of Google Gemini"**.

- **Dónde:** nodo `explicacion_llm` del grafo (`backend/app/llm/gemini_provider.py`).
- **Cómo (uso responsable en dominio financiero):** Gemini recibe un JSON de
  solo lectura con cifras ya calculadas por los modelos estadísticos y un
  prompt con restricciones explícitas ("no inventes cifras, no agregues
  instrumentos fuera del catálogo, no prometas rentabilidad"). Su única función
  es la redacción en lenguaje natural.
- **Guardrail activo:** la salida de Gemini pasa por un validador de
  consistencia numérica (`validar_consistencia_numerica`); si contiene números
  ausentes del JSON de entrada, se descarta y se usa una plantilla
  determinística. Hay un test automatizado que lo verifica con un "LLM
  alucinador" simulado.
- **Intercambiabilidad:** la interfaz `LLMProvider` permite cambiar de
  proveedor (Gemini/mock, y extensible a Claude/OpenAI) vía la variable de
  entorno `LLM_PROVIDER`, sin tocar la lógica de negocio.

**Enfoque bayesiano como diferenciador técnico:**

| Modelo | Versión | Uso |
|---|---|---|
| Beta-Binomial | `beta-binomial-v1` | Posterior de la probabilidad de que la clasificación de perfil sea correcta. Prior Beta(2,2); approve → α+1, reject → β+1, edit → α+0.5, β+0.5. Confianza = E[θ] = α/(α+β), con intervalo de credibilidad al 90 %. |
| Normal-Normal conjugado | `normal-normal-v1` | Posterior de la media de retornos mensuales por clase de activo (prior μ₀=0.4 %, τ₀=0.02) + distribución predictiva. Proyección del portafolio por Monte Carlo (4 000 trayectorias, semilla fija) → fan chart con percentiles 5/25/50/75/95. |

---

## Evidencia de pruebas automatizadas (nivel intermedio de la rúbrica)

`backend/tests/` — **41 tests, todos pasando** (`python -m pytest tests/`):

- `test_rules_engine.py` (9): tests unitarios de la función crítica de
  perfilamiento — perfiles por score, influencia por respuesta, versionado,
  validación de entradas, asignaciones que suman 100 %.
- `test_bayes_posterior.py` (11): prior correcto, actualización por decisión,
  intervalo de credibilidad, fan chart con bandas ordenadas, disclaimer
  obligatorio, reproducibilidad por semilla.
- `test_graph_nodes.py` (10): tests de los **nodos del grafo LangGraph con la
  API del LLM mockeada**, incluyendo: el guardrail que descarta salidas con
  números inventados (validación de consistencia numérica), flujo E2E con
  interrupt/reanudación, y protección contra doble decisión.
- `test_chat_ranking_auth.py` (11): guardrail de cifras del chat (bot
  "alucinador" bloqueado), escalamiento a humano, continuidad de sesión,
  login/401 de operadores, ranking bayesiano ordenado y autoalimentado, y
  priors bancarios correctamente anclados (acciones > renta fija).
