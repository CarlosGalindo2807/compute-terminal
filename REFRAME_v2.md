# REENFOQUE ESTRATÉGICO v2 — Compute Index Terminal + roadmap de tres líneas de producto

> Pega este documento en la raíz del repo, sustituyendo el REFRAME.md anterior si lo tienes. Stack sin cambios (Turborepo + Next 15 + Supabase + TimescaleDB + Inngest + Anthropic SDK). Lo que cambia es: tesis pública, metodología del índice, plan de monetización y secuencia de tres líneas de producto.

---

## 1. CONTEXTO QUE FALTABA — Silicon Data como referencia institucional

Existe ya un competidor institucional relevante: **Silicon Data** (Carmen Li ex-Bloomberg). Tienen los índices SDH100RT, SDA100RT, SDB200RT distribuidos vía Bloomberg/Refinitiv. Están respaldados por DRW y Jump Trading (4,7M$). Procesan 150.000 registros diarios desde 40-50 países y 50-100 plataformas, con histórico desde septiembre 2024. Su tesis pública: ser el "Brent del compute" sobre el que se liquidarán los futuros que Larry Fink anunció en Milken (mayo 2026).

**Lo que esto cambia y lo que no:**

- **Cambia:** la posición "vamos a crear el índice del compute". Ese espacio ya tiene a alguien con respaldo institucional pesado.
- **No cambia:** la oportunidad. Silicon Data sirve a hedge funds, exchanges y mesas de commodities. NO sirve a CTOs/Heads of Infra/CFOs de scaleups que pagan 50-500k€/mes en GPU cloud y necesitan saber si pagan bien. Esos son nuestros clientes y siguen sin tener herramienta.

**Analogía mental que debe quedar fija:** Silicon Data es NYMEX/ticker WTI. Nosotros somos Bloomberg Terminal. Bloomberg no compite con NYMEX, los muestra. Bloomberg le vende al trader, NYMEX al exchange.

**Decisión sobre licencia de feed de Silicon Data: NO licenciamos.** Coste prohibitivo para nuestra fase. Plan B: replicar metodología pública (su propio blog "Building a Robust GPU Index" la describe en abstracto), construir nuestras propias fuentes desde marketplaces, y desarrollar dimensiones que ellos no cubren (ver sección 3).

**Disclaimer legal a incluir en el sitio:** "Nuestros índices son cálculos independientes elaborados con metodología propia y fuentes propias. No están afiliados ni derivados de los índices SDH100RT, SDA100RT, SDB200RT publicados por Silicon Data Inc."

---

## 2. NUEVA TESIS DEL PRODUCTO

**Compute Index Terminal NO es el índice del compute. Es la capa de aplicación, observabilidad y decisión encima del mercado de compute para quien lo compra, no para quien negocia derivados.**

Frase de posicionamiento única:

> "La terminal de procurement y observabilidad para equipos que compran cómputo de IA — el Bloomberg del comprador, no del trader."

Esto debe propagarse a README.md, landing page (apps/web/app/page.tsx), metadatos SEO/Open Graph y todo el copy. Buscar y reemplazar:

- `"índice de referencia"` → `"intelligence layer de procurement"`
- `"WTI de las GPUs"` → `"Bloomberg Terminal del compute para compradores"`
- `"benchmark de liquidación"` → eliminar
- `"el índice del compute"` → `"la terminal de procurement de compute"`

---

## 3. METODOLOGÍA — Las tres variables que nos diferencian de Silicon Data

Silicon Data publica precio normalizado por GPU-hora con criterios diseñados para ser referencia financiera neutral. Nosotros publicamos tres dimensiones que ellos no cubren por diseño (porque romperían la fungibilidad necesaria para derivados):

### Variable 1 — Tokens-equivalentes en lugar de GPU-hora

**Por qué importa:** el comprador real no quiere saber el precio de una H100-hora, quiere saber cuánto le cuesta una conversación de su agente, un fine-tuning de su modelo, un millón de tokens de inferencia.

**Implementación:**
- Mantener benchmarks internos de throughput por modelo (Claude Sonnet, GPT-4o, Llama 3 70B, Mistral Large) sobre cada GPU principal (H100 SXM/PCIe, A100, B200, MI300X) bajo cargas representativas.
- Calcular automáticamente "$/millón-tokens-Claude-Sonnet-equivalente" como índice principal mostrado al usuario.
- Mostrar "$/conversación-tipo" (3 minutos, 500 tokens entrada, 1500 salida) como métrica para casos de uso conversacionales.

**Endpoint nuevo:** `GET /api/v1/cost-per-workload?model=claude-sonnet&workload=voice_agent_3min&volume=10000`

### Variable 3 — EU-compliance-adjusted sub-index

**Por qué importa:** Silicon Data cubre 40-50 países pero su lente es global. Empresas europeas bajo GDPR y CSRD necesitan saber el precio EN proveedores con datacenter en suelo UE, sin transferencia internacional. AWS Frankfurt y AWS US-East no son sustituibles para estos clientes.

**Implementación:**
- Tag cada snapshot con país del datacenter, jurisdicción regulatoria, certificaciones (ISO 27001, SOC 2, EU Cloud Code of Conduct).
- Publicar índice paralelo `CTI-H100-EU` que solo incluye proveedores que cumplen el filtro de compliance europeo configurable.
- Sub-índices adicionales: `CTI-H100-Spain` (sólo España, latencia <30ms a Madrid), `CTI-H100-Sovereign` (sólo proveedores europeos sin matriz USA bajo Cloud Act).

### Variable 8 — Behavioral pricing (precio real vs publicado)

**Por qué importa:** las grandes empresas no pagan los precios publicados. Pagan precios negociados con commitments, descuentos por volumen, créditos de migración. Esa información hoy NO existe públicamente. Esto es el foso defensivo real.

**Implementación:**
- Permitir a usuarios subir facturas/invoices anonimizadas de AWS, GCP, Azure, Lambda, CoreWeave, etc.
- Pipeline de parsing automático (PDF/CSV → estructura) con redacción de datos personales.
- Construir índice "precio publicado vs precio real pagado" segmentado por banda de gasto mensual del cliente (<5k, 5-25k, 25-100k, >100k$/mes).
- Cada cliente ve el ahorro potencial de su nivel: "tu nivel de gasto suele pagar 23% menos del rate público; estás pagando rate público en AWS — pide tu account manager".
- Efecto red: cuantos más usuarios suben facturas, más precisa la métrica, más valor para los siguientes. Foso por efecto red, no por capital.

**Crítico legal y de UX:** el proceso de subida de facturas debe ser opt-in explícito, con redacción automática de datos identificables (nombre cuenta, account ID, números de pedido) ANTES de que entren al pipeline. Solo se almacena: proveedor, GPU model, precio efectivo, volumen, fecha, banda de gasto.

---

## 4. CAMBIOS EN ESQUEMA DE DATOS

Añadir migración correlativa en `packages/db/migrations/`:

```sql
-- Catálogo de jurisdicciones y compliance
CREATE TABLE provider_compliance (
  provider_id TEXT PRIMARY KEY,
  datacenter_country TEXT NOT NULL,
  parent_company_country TEXT,
  certifications TEXT[],          -- ['iso27001', 'soc2', 'eu_ccc']
  subject_to_cloud_act BOOLEAN,
  notes TEXT
);

-- Throughput benchmarks por GPU x modelo
CREATE TABLE throughput_benchmarks (
  id BIGSERIAL PRIMARY KEY,
  gpu_model TEXT NOT NULL,
  llm_model TEXT NOT NULL,        -- 'claude-sonnet-4', 'llama-3-70b', etc
  precision TEXT NOT NULL,        -- 'fp16', 'fp8', 'int4'
  tokens_per_second NUMERIC NOT NULL,
  batch_size INT,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL,           -- 'internal' | 'mlperf' | 'vendor'
  UNIQUE(gpu_model, llm_model, precision, batch_size)
);

-- Behavioral pricing — facturas anonimizadas
CREATE TABLE invoice_observations (
  id BIGSERIAL PRIMARY KEY,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  provider TEXT NOT NULL,
  gpu_model TEXT NOT NULL,
  effective_price_usd_hour NUMERIC NOT NULL,
  monthly_volume_gpu_hours NUMERIC,
  customer_spend_band TEXT NOT NULL,  -- 'under_5k' | '5k_to_25k' | '25k_to_100k' | 'over_100k'
  contract_type TEXT,                  -- 'on_demand' | 'reserved_1m' | 'reserved_12m' | 'enterprise_agreement'
  observation_date DATE NOT NULL,
  -- NO almacenar: account_id, customer_name, invoice_number, contact_emails
  metadata JSONB
);
SELECT create_hypertable('invoice_observations', 'observation_date');

-- Forward curves (interno solo, no licenciado externo)
CREATE TABLE forward_curves (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'internal',
  gpu_model TEXT NOT NULL,
  curve_date DATE NOT NULL,
  tenor_days INT NOT NULL,
  forward_rate NUMERIC(10,4) NOT NULL,
  methodology TEXT,                    -- 'no-arbitrage' | 'vwap-derived'
  metadata JSONB,
  UNIQUE(source, gpu_model, curve_date, tenor_days)
);
```

---

## 5. SECUENCIA DE TRES LÍNEAS DE PRODUCTO

Ya no es solo "el dashboard". Son tres productos secuenciados que se apalancan unos en otros. El orden importa: cada producto da datos al siguiente.

### Línea 1 — Compute Index Terminal (meses 0-9)

**Lo que ya tenemos planificado.** Dashboard de precios, alertas, screener, calculator, API, plan Enterprise. Ahora con las tres variables de diferenciación de la sección 3.

Pricing tiers actualizados:
- **Free:** datos diferidos 24h, 1 GPU model
- **Pro 99€/mes:** datos en tiempo real, todas las GPUs, alertas, calculator de tokens-equivalentes
- **Team 299€/mes:** API access, exports, sub-índices EU/Spain, multi-usuario
- **Enterprise desde 2.500€/mes:** SLA, datos custom, behavioral pricing access, integraciones bajo demanda

### Línea 2 — Hedging-as-a-Service (meses 6-18)

**Qué es:** SaaS que ayuda a startups de IA con 50k$-5M$/año de gasto en compute a:
- Predecir gasto próximos 6-12 meses con su consumo histórico
- Comparar contratos reservados vs spot vs on-demand
- Negociar/ejecutar contratos a plazo en su nombre
- Eventualmente, cuando existan futuros de compute reales: ejecutar coberturas

**Por qué encaja después de la Línea 1:**
- Los clientes Enterprise de Línea 1 son exactamente este perfil
- Ya tienes su data de uso a través del módulo behavioral pricing
- Tu forward curve interno justifica las recomendaciones

**Modelo de negocio:**
- **% del ahorro generado:** 10% del ahorro mensual demostrado vs su gasto baseline. Cliente solo paga si ahorra.
- **O fee fijo:** 500€-5.000€/mes según volumen de compute gestionado.

**Stack:** onboarding tipo Plaid (conectan AWS/GCP/Azure/CoreWeave), modelo Prophet sobre consumo histórico, recomendaciones de mix óptimo.

**Ventaja:** lock-in brutal. Una vez gestionas el compute de un cliente, no se va.

### Línea 3 — Marketplace OTC de capacidad reservada (meses 12-24)

**Qué es:** matching entre empresas que firmaron contratos de capacidad reservada y NO la usan toda, y otras que la necesitan urgente. Tú cobras fee por matching.

**Es lo del "intermediario entre quien le sobra cómputo y quien quiere":** efectivamente. Sigue el modelo de SF Compute (Evan Conrad), pero europeo y B2B, con foco en revender capacidad EU-compliant.

**Por qué encaja al final:**
- Necesitas la data de Línea 1 para precificar el matching correctamente
- Necesitas la relación de confianza de Línea 2 con clientes que ya gestionan compute contigo
- Necesitas escala de usuarios para que haya liquidez de ambos lados

**Modelo de negocio:**
- Fee de matching: 3-7% sobre el valor del contrato matchado
- Premium "verified seller": 200€/mes para vendedores que quieren mejor ranking

**Riesgos identificados:**
- **Legal:** muchos contratos de hyperscalers prohíben subarriendo. Estructurar como "broker de servicios gestionados", no reventa pura. Consulta jurídica obligatoria antes de lanzar (estimación 2.000-4.000€ con bufete especializado).
- **Verificación:** probar que la capacidad es real. Validación técnica antes de listar.

---

## 6. CHECKLIST DE CAMBIOS DE COPY

Pasada con grep en todo el monorepo cambiando todas las referencias listadas en sección 2. En la landing page:

- H1 debe enfatizar **AHORRO y DECISIÓN**, no AUTORIDAD ni REFERENCIA
- Sub-H1 debe mencionar las tres variables: tokens-equivalentes, EU-compliance, precio real vs publicado
- Sección "metodología" enlazada como página separada con disclaimer de independencia de Silicon Data

---

## 7. TAREA INMEDIATA PARA CLAUDE CODE

Cuando proceses este documento, ejecuta en este orden:

1. **Leer el estado actual del repo** (`git status`, `tree apps/ packages/`, `cat README.md`, `ls docs/`)
2. **Confirmar qué sprints están completados y cuáles en progreso** — pregunta al usuario si no está claro
3. **NO refactorices nada todavía.** Devuelve un plan numerado de cambios concretos:
   - Migraciones a crear (sección 4)
   - Endpoints a añadir (sección 3)
   - Copy a cambiar (sección 6)
   - Docs nuevos a crear (`docs/cti-methodology-v1.md`, `docs/competitive-positioning.md`, `docs/three-product-lines.md`)
4. Esperar aprobación antes de modificar archivos existentes.

Los cambios son aditivos (nuevas tablas, nuevos docs, nuevo copy en landing) o de framing. No se toca lógica de scrapers existente.

---

## 8. RESUMEN EJECUTIVO

Pivotamos de "queremos ser el índice" a "queremos ser la capa de decisión + hedging + marketplace encima del compute para el comprador europeo". Aceptamos que Silicon Data se queda con el lado institucional. Nos diferenciamos con tokens-equivalentes, EU-compliance, behavioral pricing. Y secuenciamos tres líneas de producto que comparten datos y clientes.
