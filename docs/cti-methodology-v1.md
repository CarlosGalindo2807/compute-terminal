# Compute Index Terminal — Metodología v1.0

**Versión:** 1.0
**Vigente desde:** 2026-05-09
**Última revisión:** 2026-05-11
**Aprobado por:** Index Committee — founding charter
**Frecuencia de revisión:** trimestral, con preaviso público de 30 días para cualquier cambio

---

## Aviso de independencia

Compute Index Terminal (en adelante, **CTI**) es un proyecto independiente. Los índices CTI-H100, CTI-Tokens-Equivalent y CTI-H100-EU son cálculos elaborados con metodología propia y fuentes de datos propias.

**No están afiliados ni derivados de los índices SDH100RT, SDA100RT ni SDB200RT publicados por Silicon Data Inc.**

CTI no es licenciatario, distribuidor ni socio comercial de Silicon Data Inc. Cualquier comparación entre los valores de CTI y los publicados por Silicon Data debe hacerse entendiendo que las metodologías, las fuentes y los criterios de inclusión son distintos por diseño. CTI no garantiza la equivalencia entre sus índices y ningún índice de tercero.

---

## 1. Resumen ejecutivo

CTI publica tres índices de referencia sobre el precio de cómputo GPU disponible para compra desde Europa:

| Índice | Qué mide | Para quién |
|---|---|---|
| **CTI-H100** | Precio efectivo de la GPU NVIDIA H100 (SXM5 + PCIe) en `$/hora`, normalizado por proveedor y agregado en una ventana móvil de 24 horas | Compradores de capacidad spot que comparan proveedores |
| **CTI-Tokens-Equivalent** | Coste estimado en `$ por millón de tokens` para un modelo LLM concreto sobre cada GPU principal | Equipos que dimensionan workloads conversacionales o de inferencia |
| **CTI-H100-EU** | Sub-índice de CTI-H100 restringido a proveedores con datacenter en jurisdicción UE y certificaciones aplicables | Empresas europeas bajo GDPR / CSRD / DORA / Cloud Act |

Los tres índices comparten la misma base de datos de `price_snapshots` y la misma fórmula nuclear (`filtered_vwap`, descrita en la sección 6). Lo que cambia entre ellos es el conjunto de observaciones admitidas en el cálculo y la métrica de salida.

La metodología está versionada. El cambio a v1.x o v2.0 sólo puede ocurrir por decisión del Index Committee y con preaviso público de 30 días en la página `/methodology` y en este documento.

## 2. Alcance y propósito

CTI no es un *settlement benchmark* para derivados financieros. CTI es una capa de información operativa: pretende que un comprador de cómputo pueda responder, en cualquier momento, las preguntas:

1. ¿Estoy pagando un precio razonable por mi capacidad H100 actual, comparado con el resto del mercado?
2. ¿Qué GPU me sale más barata para servir mi workload concreto, medido en la unidad que me factura mi propio negocio (tokens, conversaciones, jobs)?
3. Si tengo restricciones de soberanía de datos europea, ¿qué precio efectivo encuentro dentro de mi conjunto admisible de proveedores?

Esto es deliberadamente distinto del propósito de un índice institucional como SDH100RT (Silicon Data), cuyo objetivo es ser una referencia neutra y fungible sobre la que liquidar contratos de derivados. CTI no aspira a esa fungibilidad y por eso puede incorporar dimensiones (workload, jurisdicción, precio efectivo pagado) que un índice de liquidación tendría que excluir.

## 3. Fuentes de datos

### 3.1 Proveedores cubiertos

A fecha de vigencia de v1.0, el sistema captura datos de los siguientes proveedores en producción:

| Proveedor | Tipo | Mecanismo de captura | Frecuencia |
|---|---|---|---|
| Vast.ai | Marketplace | API REST | Cada 5 minutos |
| RunPod | Marketplace | API GraphQL | Cada 5 minutos |
| Lambda Labs | Cloud | Scrape HTML (`lambda.ai`) — pendiente de revivir vía worker Railway | Diario |

El catálogo de proveedores onboardeables es más amplio (CoreWeave, Hyperbolic, Together, Prime Intellect, AWS, GCP, Azure) pero su scraper no está activo en producción al momento de publicación de v1.0. Cualquier proveedor incluido en cálculo posteriormente se documentará con la fecha de incorporación en `methodology_changes`.

### 3.2 Resolución temporal y volumen

Cada captura genera entre 500 y 5.000 observaciones individuales (`price_snapshots`), dependiendo del proveedor. El volumen agregado actual es de aproximadamente **15.000-20.000 observaciones por día** entre los proveedores activos. Cada observación contiene, como mínimo:

- Identificador del proveedor (`provider_id`)
- Modelo de GPU normalizado al catálogo (`gpu_model_id`) o, si no se reconoce, la cadena bruta para resolución posterior (`raw_gpu_string`)
- Precio en moneda del proveedor (`price_per_hour`, `currency`)
- Número de GPUs del listado (`num_gpus`)
- Región declarada (`region`)
- Fecha y hora exacta de captura (`captured_at`)
- Payload bruto completo del listado (`raw_payload`) para reproducibilidad y auditoría

Las observaciones en monedas distintas de USD se descartan del cálculo de los tres índices publicados; sólo se incluyen aquellas con `currency = 'USD'`. Conversiones FX se evitan deliberadamente para no introducir riesgo de tipo de cambio en el índice.

### 3.3 Datos de throughput (variable 1)

Para CTI-Tokens-Equivalent, además de los precios necesitamos throughput por par `(GPU × LLM)`. La tabla `throughput_benchmarks` admite cuatro fuentes con jerarquía de confianza:

1. `internal` — medido por CTI bajo carga representativa
2. `mlperf` — extraído de la última ronda pública de MLPerf Inference
3. `vendor` — declarado por el fabricante de la GPU o del modelo
4. `community` — reportado por usuarios verificados

En ausencia de un valor en la tabla para una combinación dada, el endpoint público utiliza un benchmark *inline* etiquetado como `inline_default`. Estos defaults son aproximaciones públicas y **se sustituyen automáticamente en cuanto haya un valor de DB para la misma combinación**. El campo `throughput_source` en la respuesta de API permite a cualquier consumidor auditar qué tipo de dato sustenta cada estimación.

## 4. Proceso de normalización

El reto operativo principal es que cada proveedor escribe los nombres de las GPUs distinto. *"NVIDIA H100 80GB SXM5"*, *"H100-SXM"*, *"h100sxm5"*, *"H100 SXM5 80GB"* y *"NVIDIA H100 SXM 80GB"* son la misma máquina. La normalización ocurre en dos pasos:

### 4.1 Fast-path determinista (Python)

Cada string se intenta resolver inline contra:

1. **Reglas exactas** en la tabla `normalization_rules` (`pattern_type = 'exact'`)
2. **Aliases** declarados en `gpu_models.aliases` (array de strings exactos)
3. **Coincidencia difusa** vía `pg_trgm` con umbral de similitud configurado

Si alguna de estas tres rutas resuelve, la observación entra en `price_snapshots` con `gpu_model_id` poblado y `is_normalized = true`.

### 4.2 Slow-path con LLM (TypeScript)

Si el fast-path no resuelve, la observación entra en `unmatched_listings`. Cada hora un worker batchea las pendientes y consulta a Claude (`claude-sonnet-4-5`) con un prompt estructurado pidiendo que identifique el `gpu_model_id` correcto, con un nivel de confianza. Las resoluciones de alta confianza generan automáticamente nuevas reglas en `normalization_rules`, alimentando el fast-path para futuras capturas. Las de baja confianza esperan revisión manual en `/admin/unmatched`.

Esta arquitectura está descrita en detalle en `docs/decisions.md` ("Synchronous fast-path normalization in Python, async LLM in TS").

## 5. Tratamiento de outliers

Las observaciones de spot pricing tienen una distribución con cola pesada — un proveedor concreto puede listar puntualmente una H100 a `$0.20/h` o a `$15/h` por errores de inventario, ofertas promocionales o mala captura. El índice no debe ser sensible a estos casos.

CTI usa el filtro **MAD-3σ** sobre la mediana, calculado independientemente para cada `gpu_model_id` dentro de la ventana de cálculo (24 horas):

```
median       = mediana(price_per_hour para gpu en ventana)
mad          = mediana(|price - median|)
sigma_robust = mad * 1.4826                 # consistencia con normal
limite_inf   = median - 3 * sigma_robust
limite_sup   = median + 3 * sigma_robust

is_outlier = (price < limite_inf) OR (price > limite_sup)
```

Las observaciones marcadas como `is_outlier = true` se conservan en `price_snapshots` (jamás se borran datos brutos) pero quedan **excluidas** del cálculo del índice publicado. La columna `outlier_reason` documenta el motivo de exclusión para auditoría.

Justificación de elegir MAD sobre desviación estándar: MAD es robusto a la propia presencia de outliers en la muestra (la desviación estándar es ella misma sensible a los outliers que pretende detectar). El factor `1.4826` mantiene la interpretación equivalente a `3σ` sobre una distribución normal subyacente.

## 6. Fórmula CTI-H100

CTI-H100 es el índice de referencia para el precio spot de la NVIDIA H100 (variantes SXM5 y PCIe consideradas como un mismo activo). Se publica una vez al día y representa el precio efectivo pagado durante las últimas 24 horas en el mercado cubierto.

### 6.1 Definición formal

Sea `S_t` el conjunto de `price_snapshots` cumpliendo todas las condiciones:

- `gpu_model.slug ∈ {'h100-sxm5', 'h100-pcie'}`
- `currency = 'USD'`
- `is_outlier = false`
- `provider.reliability_score >= 0.5` (umbral configurable, ver sección 6.2)
- `captured_at ∈ [t - 24h, t]`

Entonces el valor publicado de CTI-H100 a fecha `t` es:

```
CTI-H100(t) = Σ (price_per_hour_i × num_gpus_i)  /  Σ (num_gpus_i)
              i ∈ S_t                                 i ∈ S_t
```

Es un VWAP (volume-weighted average price) ponderado por el número de GPUs ofertadas en cada listado. La elección de `num_gpus` como peso (en lugar de `availability_count` o peso uniforme) responde a que un listado de un nodo de 8 GPUs es estructuralmente más representativo del mercado real que un listado de una sola GPU.

### 6.2 Parámetros y validez del cálculo

Los parámetros de v1.0 son:

| Parámetro | Valor v1.0 | Significado |
|---|---|---|
| `formula_id` | `filtered_vwap` | Identificador interno de la fórmula |
| `outlier_filter` | `mad_3_sigma` | Política de exclusión de outliers |
| `window_hours` | `24` | Ventana móvil de cálculo |
| `min_observations` | `5` | Mínimo de observaciones para publicar valor |
| `weight` | `num_gpus` | Variable de ponderación |
| `reliability_floor` | `0.5` | Umbral mínimo de fiabilidad del proveedor |

Si `|S_t| < min_observations`, el sistema no publica valor para esa fecha y registra el evento como `index_calculation_skipped` para revisión por el Index Committee.

### 6.3 Trazabilidad

Cada valor publicado en `index_values_daily` incluye:

- `methodology_version` (texto, fijo en `'v1.0'` mientras la metodología no cambie)
- `methodology_locked` (booleano, `true` salvo override humano explícito)
- Conteo `n` de observaciones admitidas en el cálculo
- Lista de `provider_ids` que contribuyeron (campo `metadata`)

Esto permite a cualquier consumidor reconstruir el cálculo y verificar que el valor publicado proviene exactamente del corpus de datos declarado. La página `/index/cti-h100` muestra el watermark `v1.0` en la serie histórica como prueba visual de que el valor no ha sido recalculado retrospectivamente.

## 7. Fórmula CTI-Tokens-Equivalent

CTI-Tokens-Equivalent traduce el precio en `$/GPU-hora` a `$/millón de tokens` para una combinación de GPU y modelo LLM. Es la métrica que el comprador real entiende: un equipo no compra horas de H100, compra capacidad de servir conversaciones, completar prompts o ejecutar agentes.

### 7.1 Definición formal

Para una combinación dada `(gpu, llm, precision)`:

```
tps      = throughput_benchmarks(gpu, llm, precision).tokens_per_second
P_gpu(t) = mediana_24h(price_per_hour para gpu en t, no outliers)

CTI-TE(gpu, llm, precision, t)  =  P_gpu(t) × 10^6  /  (tps × 3600)

  → unidades: $ por millón de tokens generados a la velocidad medida
```

El cálculo es directo y reproducible a partir de dos datos públicos: el precio mediano de la GPU (que CTI publica) y el throughput de inferencia para ese par GPU/modelo (que CTI publica en `throughput_benchmarks`).

### 7.2 Variantes derivadas

A partir de la fórmula nuclear se derivan métricas de uso comercial directo:

| Métrica | Cálculo | Para qué se usa |
|---|---|---|
| `$ por conversación voz 3min` | `CTI-TE × (500 + 1500) / 10^6` | Agentes conversacionales en producción |
| `$ por chat corto` | `CTI-TE × (500 + 500) / 10^6` | Asistentes de tipo Q&A |
| `$ por resumen long-form` | `CTI-TE × (8000 + 1000) / 10^6` | Procesamiento documental |
| `$ por loop de agente 10 pasos` | `CTI-TE × (5000 + 5000) / 10^6` | Workflows de agente con tool use |

La definición del workload (tokens de entrada + tokens de salida) se publica junto con la métrica para que cualquier consumidor pueda recalcular para sus propios mixes.

### 7.3 Limitaciones declaradas

CTI-TE es una **estimación**, no un coste real, por tres motivos que el consumidor debe tener presentes:

1. **Throughput real depende del batch**, secuencia y carga concurrente; los valores en `throughput_benchmarks` corresponden a configuraciones representativas pero no exhaustivas.
2. **El precio observado es spot mediano**; un comprador con reservas o EA paga distinto (la variable 8 / behavioral pricing aborda esta brecha).
3. **No incluye coste operativo** de orquestación, almacenamiento, ancho de banda ni serving stack — sólo el coste GPU puro de generar los tokens.

El consumidor debe tratar CTI-TE como una *cota inferior creíble* sobre el coste real de cómputo, no como una factura reproducible.

## 8. Fórmula CTI-H100-EU

CTI-H100-EU es CTI-H100 restringido al subconjunto de proveedores que cumplen los criterios de jurisdicción y compliance europea. Sirve a empresas que, por regulación (GDPR, CSRD, DORA, Schrems II), no pueden contratar capacidad fuera de la UE o que necesitan demostrar control sobre la jurisdicción de sus datos en tránsito y reposo.

### 8.1 Definición formal

Sea `P_EU` el conjunto de `provider_id` tales que en `provider_compliance`:

- `datacenter_country ∈ {ISO países UE}` ∪ `{NO, IS, LI, CH}` (EEE + Suiza)
- `subject_to_cloud_act = false` (sociedad matriz no sujeta al US Cloud Act)
- `'iso27001' ∈ certifications` (línea base mínima)

Entonces:

```
CTI-H100-EU(t) = filtered_vwap aplicado a S_t ∩ {snapshots de proveedores ∈ P_EU}
```

con los mismos parámetros que CTI-H100. Se publica únicamente si `|S_t ∩ P_EU| >= min_observations`.

### 8.2 Sub-índices más restrictivos

A partir del mismo mecanismo se publicarán, condicional a cobertura suficiente del catálogo, los sub-índices:

- **CTI-H100-Sovereign**: añade restricción `parent_company_country ∈ {UE+EEE+CH}` — excluye proveedores europeos que sean filiales de matrices estadounidenses
- **CTI-H100-Spain**: filtra a `datacenter_country = 'ES'` — para casos de uso con requisito de latencia <30ms a Madrid o residencia explícita en territorio español

Estos sub-índices estarán disponibles en cuanto haya `>= 5` proveedores activos en la categoría correspondiente.

### 8.3 Fuente y veracidad de la información de compliance

`provider_compliance` se completa con cuatro tipos de evidencia, declarados en el campo `attested_by`:

- `'self'` — declaración del proveedor en su web pública o documentación
- `'public_filing'` — registro mercantil o SEC filing del proveedor o su matriz
- `'audit'` — informe de auditor independiente con copia archivada
- `'community'` — corrección crowdsourceada verificada por dos editores

CTI no garantiza que la información sea contemporánea: las certificaciones expiran, las matrices cambian, los proveedores son adquiridos. La columna `attested_at` registra la fecha de la última verificación; CTI re-verifica anualmente o cuando un cambio relevante salta en `provider_candidates`.

## 9. Frecuencia de rebalanceo y publicación

| Acción | Frecuencia | Mecanismo |
|---|---|---|
| Captura de `price_snapshots` | 5 min (Vast, RunPod), diaria (Lambda) | Inngest cron sobre Vercel functions |
| Recalculo de outliers de la ventana | Cada nueva captura | Trigger en `price_snapshots` |
| Cálculo de los tres índices | Diario, 00:05 UTC | `index-calculator` worker (Inngest) |
| Publicación en `index_values_daily` | Inmediata tras cálculo | INSERT atómico con `methodology_version` |
| Backfill de huecos | Manual, sólo por aprobación del Committee | Sin re-cálculo automático de fechas pasadas |

Los valores publicados son **inmutables**. Si una corrección posterior es necesaria (por ejemplo, se descubre que un proveedor reportó precios manifiestamente erróneos en una ventana), el Committee emite un valor corregido bajo una versión nueva de metodología (`v1.1`, `v1.2`, etc.) y mantiene el valor original con una marca de revisión. La página `/index/cti-h100` muestra el watermark de la versión vigente y, si aplica, líneas verticales que marcan transiciones de metodología.

## 10. Versionado y gobernanza

El cambio de cualquier parámetro listado en la sección 6.2, o de la fórmula nuclear, o de los criterios de inclusión, requiere:

1. **Propuesta documentada** del Index Committee con justificación
2. **Preaviso público de 30 días** en la página `/methodology` y en este documento
3. **Acta de decisión** registrada en `methodology_changes` con `decision_date`, `effective_from` y `approved_by`
4. **Continuidad histórica**: los valores publicados bajo una versión nunca se recalculan retroactivamente; la nueva versión publica desde su `effective_from`

El Index Committee mantiene un proceso interno de research permanente — la rutina automatizada Index Architect produce notas semanales sobre brechas frente a estándares IOSCO, MSCI, S&P y FTSE Russell, archivadas en `docs/research/`. Estas notas son input al Committee, no output: ningún cambio entra en producción sin acta humana.

### 10.1 Composición del Committee

A fecha de v1.0 el Committee está compuesto por el equipo fundador. Al alcanzar `>= 3` clientes Enterprise activos o `>= 1` licenciatario institucional, el Committee se ampliará a un mínimo de tres miembros con al menos uno externo a CTI. La actualización de composición se publicará en `methodology_versions.approved_by` para cada versión vigente.

## 11. Apéndice — Definiciones

| Término | Definición |
|---|---|
| **Snapshot** | Una observación individual de precio capturada de un proveedor en un instante dado |
| **Ventana de cálculo** | Período móvil de 24 horas terminando en el momento del cálculo |
| **VWAP** | Volume-Weighted Average Price — promedio ponderado por volumen |
| **MAD** | Median Absolute Deviation — desviación absoluta mediana |
| **`reliability_score`** | Métrica interna entre 0 y 1 que penaliza a proveedores con fallos de scrape recientes; se recupera con éxitos consecutivos |
| **`provider.metadata`** | JSONB con datos heterogéneos de cada proveedor (regiones soportadas, tipos de contrato, etc.) |
| **`price_snapshots.is_normalized`** | `true` si el `gpu_model_id` está poblado vía fast-path o LLM; `false` si el listado sigue pendiente de resolver |

---

## 12. Referencias internas

- Migraciones SQL: `packages/db/migrations/001_*.sql` (catálogos), `002_*.sql` (snapshots), `009_*.sql` (versionado de metodología), `010_*.sql` (RLS), `011_*.sql` (esquema v2)
- Constante de metodología publicada: `packages/shared/src/methodology.ts`
- Página pública: `/methodology` y `/index/[slug]`
- Decisiones técnicas no obvias: `docs/decisions.md`
- Posicionamiento competitivo: `docs/competitive-positioning.md`
- Reframe estratégico v2: `REFRAME_v2.md`

---

## 13. Disclaimer final

Este documento describe la metodología vigente al momento de su publicación. CTI no garantiza la exactitud de cada observación individual ni la completitud del catálogo de proveedores. Los índices publicados son referencias informativas y **no constituyen asesoría financiera, recomendación de compra ni precio cierto** para ningún contrato. Los suscriptores comerciales pueden solicitar términos de servicio específicos con SLA de cobertura y disponibilidad.

Para preguntas sobre la metodología o impugnaciones a un valor publicado: `methodology@computeterminal.io`.
