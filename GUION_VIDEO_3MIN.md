# 🎬 Guion del video (3:00) — Odds Ratio

> Graba la pantalla con la app corriendo (`docker compose up` o local).
> Habla claro y sin prisa: el guion está cronometrado con margen.

---

## 0:00 – 0:25 · Gancho + problema (cámara o slide con logo)

> "Hola, somos **Odds Ratio**, del Dataclub de ESPOL — Track 3: Robo-Advisory.
> Las instituciones financieras quieren usar IA para asesorar inversiones,
> pero un LLM que inventa cifras es un riesgo regulatorio inaceptable.
> Nuestra solución: un agente que **calcula con estadística, explica con
> Gemini y jamás actúa sin un humano**."

## 0:25 – 0:55 · Arquitectura (mostrar diagrama del DOCUMENTO_EXPLICATIVO)

> "Todo el flujo es un **grafo de estados LangGraph** de 8 nodos: perfilamiento
> con reglas versionadas, posterior bayesiano Beta-Binomial, propuesta,
> proyección de series de tiempo, workflow de Cumplimiento, explicación con
> **Google Gemini**… y aquí — *(señalar)* — el grafo se **interrumpe** en un
> checkpoint persistido en SQLite hasta que un asesor humano decida.
> La lógica está totalmente separada de la interfaz."

## 0:55 – 1:35 · Demo Historia 1 + 2 (pantalla: /onboarding → /propuesta)

> *(Llenar el cuestionario en vivo)*
> "El cliente responde 6 preguntas. Las reglas son un YAML versionado —
> v1.0.0 — y cada respuesta explica cuánto influyó. Nada de cajas negras."
> *(Enviar y mostrar la propuesta)*
> "En segundos: perfil, **confianza bayesiana**, distribución por clase de
> activo del catálogo, y este **fan chart**: mediana más bandas de credibilidad
> del 50 y 90 por ciento. Mostramos una **distribución de escenarios, nunca una
> promesa** — con el disclaimer siempre visible.
> El texto explicativo lo redacta **Gemini**, pero con un guardrail: si su
> salida contiene un solo número que no esté en el JSON de entrada, se descarta
> automáticamente. Tenemos un test que lo demuestra con un LLM alucinador."

## 1:35 – 2:15 · Demo Historia 3 (pantalla: /asesor)

> "Aquí está el corazón del cumplimiento regulatorio: el **panel del asesor**.
> La propuesta está en pausa — el grafo LangGraph interrumpido.
> *(Click en Aprobar)*
> Al aprobar: uno, el grafo se reanuda y termina; dos, se escribe un registro
> de **auditoría append-only** con snapshot, versión de reglas y del modelo;
> y tres — miren arriba — la **confianza bayesiana se actualiza en vivo**:
> de 50 % a 60 %, alfa 3, beta 2. El sistema aprende de cada decisión humana.
> Si la propuesta excediera umbrales de concentración, el workflow de
> **Cumplimiento** la marcaría con una alerta — que informa, nunca bloquea."

## 2:15 – 2:40 · EL MOMENTO WOW: Modo Autopiloto (pantalla: pestaña Autopiloto)

> *(En el panel, abrir la pestaña 🤖 Autopiloto y ACTIVAR el switch en vivo)*
> "Y aquí está el futuro del producto: el **Modo Autopiloto**. El sistema se
> GANA la autonomía estadísticamente — cuando la confianza bayesiana de un
> cliente supera el umbral, el sistema aprueba solo y firma la auditoría como
> ODDS-Autopilot. *(Crear una propuesta y mostrar que llega ya APROBADA)*
> Un supervisor humano reemplaza el trabajo rutinario de diez asesores:
> hasta 80% menos costo operativo, con trazabilidad regulatoria completa.
> **47 tests automatizados** lo respaldan, y se despliega con un solo
> `docker compose up`."

## 2:40 – 3:00 · Cierre

> "Odds Ratio: inferencia bayesiana con retroalimentación humana, Gemini con
> antialucinación verificada, y arquitectura agéntica lista para producción.
> IA que propone, humanos que deciden, estadística que respalda.
> Gracias."

---

### Checklist antes de grabar
- [ ] Backend y frontend corriendo, BD limpia (borrar `*.db` para empezar de cero)
- [ ] `GEMINI_API_KEY` configurada (o demo con mock — el flujo es idéntico)
- [ ] Zoom del navegador al 110–125 % para legibilidad
- [ ] Cronometrar un ensayo completo antes de la toma final
