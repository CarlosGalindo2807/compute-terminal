# Three Product Lines — Operational Detail

> Este documento expande la sección 5 de REFRAME_v2.md con detalle operativo por trimestre: KPIs concretos, plan de contratación, métricas a vigilar y triggers de decisión.

Ubicación final en el repo: `docs/three-product-lines.md`.

---

## Visión integrada

Tres productos secuenciados que comparten datos y clientes:

```
Línea 1 (mes 0-9)          Línea 2 (mes 6-18)         Línea 3 (mes 12-24)
Compute Index Terminal  →  Hedging-as-a-Service  →  Marketplace OTC
↓                          ↓                          ↓
Da: usuarios + data         Da: clientes premium       Da: liquidez bilateral
spot pricing + behavioral   con compute gestionado     y monetización marketplace
```

Cada línea no se lanza hasta que la anterior haya validado tracción mínima. Los criterios de "go" para lanzar L2 y L3 están al final de cada sección.

---

## LÍNEA 1 — Compute Index Terminal

### Trimestre 1 (mes 1-3) — Fundamentos

**Objetivo:** datos fluyendo y producto demoable.

**KPIs trimestrales:**
- Scrapers en producción: 7+ proveedores (Vast, RunPod, Lambda, Hyperbolic, Prime Intellect, Together, CoreWeave)
- Snapshots ingestados/día: 15.000+
- Uptime de pipeline: >98%
- Free signups: 200-500 totales acumulados
- Pro pagos: 3-10 clientes
- MRR: 300-1.000€

**Plan de hiring:** ninguno. Solo Carlos full o part-time con Claude Code.

**Stack costs estimados:**
- Vercel Pro: 20€/mes
- Supabase Pro: 25€/mes
- Railway (scrapers): 30-60€/mes
- Inngest: 0€ (free tier suficiente)
- Anthropic API (clasificación, parsing): 50-150€/mes
- Total infra: 125-255€/mes

**Métricas a vigilar:**
- Dispersión spot por GPU (coeficiente de variación entre proveedores)
- Snapshots fallidos por scraper (ratio de retry)
- Time-to-first-value de un usuario nuevo (signup → primer insight visto)

**Trigger de "todo va bien":** al cerrar mes 3, tener ≥5 clientes Pro pagando y ≥150 free signups orgánicos.

### Trimestre 2 (mes 4-6) — Activación de la diferenciación

**Objetivo:** las tres variables metodológicas vivas y demoables.

**KPIs trimestrales:**
- Variable 1 (tokens-equivalentes): publicada para 5 modelos × 4 GPUs principales
- Variable 3 (EU-compliance): sub-índice CTI-H100-EU en producción con 8+ proveedores europeos catalogados
- Variable 8 (behavioral pricing): primeros 50 invoices anonimizados procesados
- Free signups: 600-1.500 totales acumulados
- Pro pagos: 25-50 clientes
- Team pagos: 4-10 clientes
- Enterprise: 1 piloto pagando 2.000-3.000€/mes
- MRR: 6.500-13.000€

**Plan de hiring:** un freelance senior backend ~25h/semana o un becario técnico full-time para mantenimiento de scrapers y resolución de incidencias.

**Stack costs estimados:**
- Total infra: 350-600€/mes (más scrapers, más storage)
- Freelance/becario: 1.200-2.500€/mes

**Métricas a vigilar:**
- Ratio Pro→Team conversión a 60 días
- NPS post-onboarding (objetivo >40)
- Cobertura del catálogo de proveedores europeos (objetivo >90% del mercado relevante)
- Trust signals: cuántos usuarios suben facturas (variable 8)

**Trigger de "todo va bien":** MRR ≥6.500€ al cerrar mes 6 y churn mensual Pro <6%.

### Trimestre 3 (mes 7-9) — Contenido, autoridad, Enterprise

**Objetivo:** posicionamiento público y primeros contratos enterprise reales.

**KPIs trimestrales:**
- Newsletter "GPU Weekly EU": 1.500-3.000 suscriptores
- Posts LinkedIn de Carlos con tracción: 4+ por mes con >5k impresiones
- Pro: 80-150 activos
- Team: 15-30 activos
- Enterprise: 3-6 contratos a 2.500-5.000€/mes
- MRR: 18.000-35.000€

**Plan de hiring:** considerar un primer comercial junior part-time si hay 5+ leads Enterprise en pipeline. Coste estimado: 1.500-2.500€/mes + 5-10% de comisión sobre Enterprise cerrado.

**Stack costs estimados:**
- Total infra: 600-1.000€/mes
- Personal: 2.500-4.500€/mes

**Trigger crítico de decisión — Lanzamiento de Línea 2:**
Si al cerrar mes 9 se cumple:
- MRR ≥20.000€
- ≥3 clientes Enterprise activos
- ≥10 clientes pidiendo features de "predicción/recomendación de compra" en encuestas o conversaciones de soporte
→ **Lanzar L2 en mes 10.** Si no se cumple, posponer L2 hasta validar tracción.

---

## LÍNEA 2 — Hedging-as-a-Service

### Trimestre 4 (mes 10-12) — MVP de hedging con clientes Enterprise existentes

**Objetivo:** validar el modelo con clientes ya conocidos antes de salir al mercado abierto.

**KPIs trimestrales:**
- 2-3 clientes Enterprise de L1 migran a piloto de L2 (free durante 2 meses)
- Predicción de gasto a 6 meses con error <15% en los pilotos
- Ahorro generado documentado: >10% del baseline de cada cliente
- Primer contrato pago de L2 al cerrar mes 12: 3.000-8.000€/mes
- MRR L2: 8.000-18.000€ (1-3 clientes pagando)
- MRR total: 30.000-63.000€

**Producto mínimo viable:**
- Onboarding tipo Plaid: conexión a AWS Cost Explorer, GCP Billing, Azure Cost Management API, CoreWeave invoices
- Dashboard con: gasto histórico, proyección 6/12 meses, recomendación de mix óptimo entre on-demand/reserved/spot
- Modelo Prophet o similar entrenado con los datos del cliente + benchmarks de L1
- Informe mensual ejecutivo para el CFO (PDF generado automáticamente)

**Plan de hiring:**
- Un ingeniero senior con experiencia en cost optimization cloud (puede ser freelance senior 30h/semana al principio, contratación full-time si tracción se confirma)
- Coste: 3.500-5.500€/mes freelance o 4.500-6.500€/mes salario español más SS

**Métricas a vigilar:**
- Precisión predictiva (MAPE — Mean Absolute Percentage Error)
- Ahorro real entregado vs ahorro proyectado
- Tiempo medio de onboarding (objetivo <2 horas para que el cliente vea valor)
- Customer satisfaction al cerrar primer trimestre (objetivo NPS >50)

### Trimestre 5 (mes 13-15) — Apertura comercial y modelo de % sobre ahorro

**Objetivo:** captar clientes nuevos (no de L1) y testear el modelo de "% del ahorro".

**KPIs trimestrales:**
- 8-15 clientes pagando en L2
- Mix de modelo: 60% fijo (500-5.000€/mes), 40% % ahorro (10% del ahorro mensual)
- Ahorro promedio entregado a clientes: 18-28% sobre baseline
- MRR L2: 25.000-45.000€
- MRR total: 56.000-108.000€

**Plan de hiring:**
- Customer success manager part-time (1.500-2.500€/mes) para onboarding y retención
- Mantener ingeniero L2 ya contratado

**Producto evoluciona:**
- Negociación asistida con account managers de hyperscalers (templates de emails, datos de mercado para usar como argumento)
- Alertas automáticas: "tu uso ha caído 30% — renegocia tu reserved"
- Multi-cloud arbitrage: detección automática de oportunidades de migrar workload entre proveedores

**Métricas a vigilar:**
- Logo retention a 6 meses (objetivo >85%)
- Net revenue retention (NRR) objetivo >110%
- Ratio CAC/LTV (objetivo <1:4)

### Trimestre 6 (mes 16-18) — Consolidación L2 y preparación L3

**Objetivo:** L2 contribuye mayoría del crecimiento de MRR, datos acumulados permiten lanzar L3.

**KPIs trimestrales:**
- 18-30 clientes L2 pagando
- MRR L2: 40.000-65.000€
- MRR total: 95.000-182.000€
- Datos acumulados: 200+ facturas reales analizadas, base sólida para precificar matching de L3

**Trigger crítico de decisión — Lanzamiento de Línea 3:**
Si al cerrar mes 18 se cumple:
- ≥15 clientes en L2 con compute reservado por encima de su uso real (detectable desde sus dashboards)
- ≥10 clientes que han preguntado "¿puedo revender mi capacidad sobrante?"
- Validación legal completada (sección Riesgos abajo)
→ **Lanzar L3 en mes 19.** Si no se cumple, posponer.

---

## LÍNEA 3 — Marketplace OTC de capacidad reservada

### Trimestre 7 (mes 19-21) — Lanzamiento beta del marketplace

**Objetivo:** primeros matchings cerrados con clientes existentes de L2.

**KPIs trimestrales:**
- 10-20 listings de sellers (capacidad reservada sobrante)
- 5-15 listings de buyers (necesidad de capacidad)
- 3-8 matchings cerrados, valor medio del contrato 8.000-25.000€
- Fee promedio sobre matching: 5%
- MRR L3: 3.000-8.000€ (matching es revenue irregular, lo modelamos como "MRR equivalente normalizado")
- MRR total: 147.000-260.000€

**Estructura legal obligatoria antes de lanzar:**
- Consulta con bufete especializado en derecho cloud y subcontratación (presupuesto 2.000-4.000€)
- Estructura del producto como "broker de servicios gestionados" o "managed compute services", no como "reventa pura" (subarriendo está prohibido por la mayoría de TOS de hyperscalers)
- Términos y condiciones específicos para seller y buyer
- KYC ligero para sellers (verificación de que la capacidad existe realmente)
- Seguros de responsabilidad civil profesional (revisar con corredor especializado)

**Plan de hiring:**
- Operations manager part-time para validar listings, gestionar matching, soporte a sellers/buyers (2.000-3.000€/mes)
- Asesoría legal externa recurrente con iguala mensual (500-1.000€/mes)

**Métricas a vigilar:**
- Tiempo medio de matching (listing → contrato cerrado)
- Ratio sellers/buyers (debe estar ~1:2 para liquidez sana)
- Disputas post-matching (objetivo <5%)
- Volumen total transaccionado (GMV)

### Trimestre 8 (mes 22-24) — Liquidez bilateral y escalado

**Objetivo:** marketplace con liquidez real, no solo entre clientes de L2.

**KPIs trimestrales:**
- 40+ listings activos cada mes
- 15-25 matchings cerrados/mes
- GMV mensual: 200.000-500.000€
- Fee revenue mensual: 10.000-25.000€
- "Verified Seller" premium pagado: 5-15 sellers a 200€/mes
- MRR L3: 35.000-65.000€
- MRR total: 195.000-355.000€

**Producto evoluciona:**
- Auctions automáticas para listings con múltiples interesados
- Escrow de pagos (Stripe Connect)
- Rating bilateral seller/buyer
- API para que sellers integren su OMS

---

## Hiring plan agregado por mes

| Mes | Equipo total | Rol nuevo añadido | Coste mensual total estimado |
|---|---|---|---|
| 1-3 | 1 (Carlos) | — | 0€ (solo infra ~200€) |
| 4-6 | 2 | Freelance backend / becario | 1.500-2.700€ |
| 7-9 | 3 | Comercial junior part-time | 3.500-5.500€ |
| 10-12 | 4 | Ingeniero L2 senior | 7.500-11.500€ |
| 13-15 | 5 | Customer Success part-time | 9.500-14.500€ |
| 16-18 | 6 | Convertir freelance backend en full-time | 12.000-17.500€ |
| 19-21 | 7 | Operations manager L3 + iguala legal | 15.000-22.000€ |
| 22-24 | 8-9 | Segundo comercial o ingeniero ML | 19.000-28.000€ |

A mes 24: equipo de 8-9 personas, coste operativo ~25.000€/mes, MRR conservador 195.000€ → margen operativo bruto ~85% antes de impuestos. Negocio rentable y atractivo sin necesidad de capital externo si la base case se cumple.

---

## Métricas transversales que debes vigilar mensualmente

Hay cinco que son críticas independientemente de la línea de producto:

1. **MRR total y crecimiento mes/mes** — objetivo >15% MoM en los primeros 12 meses, >8% MoM del mes 13 al 24
2. **Churn neto** — objetivo <4% mensual en SMB, <2% en Enterprise
3. **CAC payback** — objetivo <6 meses en SMB, <12 meses en Enterprise
4. **NRR (Net Revenue Retention)** — objetivo >110% (clientes existentes crecen incluso si no captas nuevos)
5. **Concentración de revenue** — ningún cliente debe ser >15% del MRR total (riesgo de dependencia)

---

## Triggers de decisión estratégica

Estas son las señales que deben hacerte cambiar el plan:

**Señal positiva — acelerar:**
- Newsletter llega a 10k suscriptores antes de mes 12 → invertir el doble en contenido
- Un hyperscaler europeo (Scaleway, OVH, IONOS) propone partnership → renegociar todo el roadmap incorporándolo
- Silicon Data publica un blog post citando tu metodología → es momento de press release y captar atención

**Señal negativa — pivotar o pausar:**
- MRR <50% del conservador a mes 9 → revisar fit de producto antes de lanzar L2
- Churn Pro >10% mensual sostenido → problema de retención, no de adquisición — parar de gastar en marketing
- Silicon Data lanza tier self-serve a <500€/mes → reposicionar fuerte con las tres variables o pivotar L1 hacia herramienta complementaria

**Señal de oportunidad lateral:**
- Si L3 (marketplace) crece más rápido que L2 → considerar si el negocio real es el marketplace y no el SaaS
- Si los clientes Enterprise piden auditorías one-off de >10k€ → considerar productizar consultoría como cuarta línea
