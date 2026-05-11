# Posicionamiento competitivo de Compute Index Terminal

**Audiencia:** inversores y clientes Enterprise. Documento publicable.
**Última actualización:** 2026-05-11

---

## 1. Resumen ejecutivo

El mercado del compute pricing intelligence se está bifurcando en dos categorías que comparten datos pero sirven a clientes radicalmente distintos:

- **Categoría A — Índices institucionales:** referencias neutras y fungibles diseñadas para liquidar derivados financieros. El cliente típico es un trader, un hedge fund o un exchange. El producto se distribuye vía Bloomberg / Refinitiv / ICE y se vende por licencias de feed con tarifas de cinco a seis cifras anuales. **Silicon Data es el actor de referencia en esta categoría.**
- **Categoría B — Terminales operativos para compradores:** herramientas que el responsable de infraestructura usa cada semana para tomar decisiones concretas de procurement, dimensionado, renegociación y migración de workloads entre proveedores. El cliente típico es un Head of Infra, un CTO o un CFO de scaleup IA con gasto mensual en GPUs entre 5.000 y 500.000 €. **Compute Index Terminal opera en esta categoría.**

Las dos categorías no compiten — sirven a clientes con problemas distintos, con productos con dimensiones distintas, y con economías unitarias distintas. Bloomberg Terminal no compite con NYMEX: NYMEX vende al exchange, Bloomberg vende al trader, y la coexistencia genera valor en ambas direcciones (NYMEX se cita en Bloomberg; Bloomberg ayuda a interpretar la cotización de NYMEX).

CTI no aspira a ser un índice de liquidación. Si un futuro de cómputo se lista en CME, ICE o Cboe, se liquidará casi con seguridad sobre un índice de Categoría A — probablemente sobre los publicados por Silicon Data. **CTI mostrará ese índice en la pantalla del comprador junto al resto de la información que el comprador necesita para decidir, exactamente como Bloomberg Terminal muestra el precio de WTI sin haberlo calculado.**

## 2. Mapa del mercado

El espacio de "herramientas que dicen algo sobre el precio del compute" tiene actualmente cuatro tipos de actor:

```
                         Foco institucional / financiero
                                      │
                                      │
              Silicon Data ───────────┼───────────  CME / ICE
              (índices)               │             (futuros, cuando salgan)
                                      │
       Genérico/agregado ─────────────┼─────────────  Específico por proveedor
                                      │
              Vantage                 │
              CloudZero               │             ┌── Compute Index Terminal
              Spot.io                 │             │
              (FinOps)                │             │
                                      │             │
                         Foco operativo / comprador
```

| Eje vertical | Foco institucional vs operativo |
|---|---|
| Eje horizontal | Específico de un mercado (compute) vs genérico (cualquier coste cloud) |

CTI ocupa el cuadrante inferior-derecho: foco operativo y especialización profunda en compute GPU. Es el cuadrante peor servido hoy: las FinOps tools genéricas no entran al detalle del mercado GPU, y los índices institucionales no sirven al comprador final.

## 3. Tabla comparativa de capacidades

| Capacidad | CTI | Silicon Data | Vantage | CloudZero | Spot.io |
|---|---|---|---|---|---|
| Cobertura de marketplaces de GPUs (Vast, RunPod, Lambda, Hyperbolic, Together, Prime Intellect) | ✅ Profunda y creciente | ⚠️ Cobertura existe pero invisible al comprador (sólo en feed institucional) | ❌ No cubre marketplaces | ❌ No cubre marketplaces | ❌ No cubre marketplaces |
| Precio normalizado por GPU-hora con outlier filter | ✅ Publicado, metodología abierta | ✅ Publicado vía Bloomberg/Refinitiv | ❌ Muestra precios brutos del proveedor | ❌ Igual | ❌ Igual |
| **Tokens-equivalentes** (`$ por millón de tokens` para LLM concretos) | ✅ Variable diferenciadora — único en el mercado | ❌ Por diseño no entra (rompe fungibilidad de derivados) | ❌ No tiene benchmarks de inferencia | ❌ Igual | ❌ Igual |
| **Sub-índice EU** con jurisdicción + compliance configurable | ✅ Variable diferenciadora | ❌ Cobertura global indiferenciada | ⚠️ Filtros geográficos básicos, no compliance-aware | ⚠️ Igual | ❌ |
| **Behavioral pricing** (precio real pagado vs publicado, segmentado por banda de gasto, alimentado por facturas anonimizadas de usuarios) | ✅ Variable diferenciadora — foso por efecto red | ❌ No tiene acceso a facturas | ❌ Sólo ve gasto del propio cliente, no segmento de mercado | ⚠️ Tiene ese dato del propio cliente pero no construye índice de mercado | ❌ |
| API pública con plan gratuito | ✅ En diseño | ⚠️ Licencia institucional desde cinco cifras anuales | ✅ Sí | ✅ Sí | ✅ Sí |
| Optimización automática de gasto cloud genérico (RDS, S3, Lambda, etc.) | ❌ Fuera de scope | ❌ Fuera de scope | ✅ Producto principal | ✅ Producto principal | ⚠️ Centrado en spot/reserved de cómputo no-GPU |
| Recomendación de mix on-demand / reserved / spot para workloads GPU | 🟡 Línea 2 (Hedging-as-a-Service, mes 10+) | ❌ | ⚠️ Para servicios cloud genéricos, no GPU | ⚠️ Igual | ⚠️ Spot/reserved sí, no específico GPU AI |
| Marketplace OTC de capacidad reservada sobrante | 🟡 Línea 3 (mes 19+) | ❌ | ❌ | ❌ | ❌ |
| Distribución vía Bloomberg / Refinitiv / Eikon | ❌ No es objetivo | ✅ Diferenciador clave | ❌ | ❌ | ❌ |
| Citado por bancos de inversión y mesas de derivados | ❌ No es objetivo | ✅ | ❌ | ❌ | ❌ |
| Cliente objetivo | Head of Infra / CTO / CFO de scaleup IA | Trader / quant / risk manager | DevOps lead, FinOps team | FinOps team enterprise | DevOps lead |
| Pricing entry tier | 0 € / 99 € / 299 € / desde 2.500 € | Cinco cifras anuales por feed | Free → enterprise | Demo-driven enterprise | Free → enterprise |

Leyenda: ✅ tiene la capacidad / ⚠️ tiene una versión limitada / 🟡 en roadmap declarado / ❌ no la tiene.

## 4. Cómo coexistimos con Silicon Data y por qué no competimos de frente

La pregunta evidente al ver el mapa anterior es: *si Silicon Data tiene los datos, la metodología, la distribución institucional y el respaldo de DRW + Jump, ¿por qué CTI no es redundante?*

La respuesta es que **Silicon Data y CTI optimizan funciones objetivo distintas y por eso construyen artefactos distintos a partir del mismo mercado subyacente**:

### 4.1 Silicon Data optimiza fungibilidad

Un índice que liquida derivados tiene que ser **el mismo número para todos los participantes**, todos los días, sin matices ni dimensiones que rompan la cobertura de la posición. Por eso los índices SDH100RT / SDA100RT / SDB200RT:

- No distinguen proveedores europeos de no europeos
- No incorporan throughput de inferencia
- No incorporan precios negociados (que rompen la replicabilidad)
- Tienen una metodología necesariamente conservadora y poco mutable

Esa rigidez es **el producto**. Un futuro liquidado en SDH100RT funciona porque cualquiera puede reproducir el cálculo y nadie tiene una variante "personalizada". Silicon Data no podría incorporar las dimensiones que CTI incorpora sin destruir la utilidad de su propio producto para su propio cliente.

### 4.2 CTI optimiza decidibilidad

El comprador europeo de cómputo no necesita un único número fungible — necesita **el número que sirve a su decisión concreta**, dado su mix de modelos, sus restricciones jurisdiccionales y la realidad de lo que pagaría tras negociar con su account manager. Por eso CTI publica:

- Tres índices simultáneos (CTI-H100, CTI-Tokens-Equivalent, CTI-H100-EU) cubriendo dimensiones distintas
- Sub-índices opcionales (Sovereign, Spain) para nichos regulatorios
- Estimaciones derivadas (`$ por conversación voz`, `$ por loop de agente`) directamente accionables
- Banda de precio efectivo segmentada por nivel de gasto del cliente, alimentada por behavioral pricing

Estas dimensiones son **valor para el comprador y ruido para el trader**. La asimetría es lo que justifica que dos productos coexistan.

### 4.3 Cómo se ven mutuamente en el producto

CTI muestra (cuando exista licencia o cita pública permitida) los índices de Silicon Data en su pantalla, igual que Bloomberg Terminal muestra el precio de WTI calculado por NYMEX. Para el comprador europeo, ver "el precio que liquida un futuro institucional" junto a "el precio que tú efectivamente pagas con tus restricciones" es información complementaria, no sustitutiva.

CTI nunca recalcula, replica ni publica ningún valor derivado del feed de Silicon Data. La cita es informativa y atribuida.

### 4.4 Resumen de la coexistencia

```
                Silicon Data                          CTI
                ────────────                          ───
Cliente:        Trader / quant                        Head of Infra / CTO / CFO
Producto:       1 número fungible                     N números contextualizados
Distribución:   Bloomberg / Refinitiv                 Web + API + Slack
Pricing:        5-6 cifras anuales por feed           99 - 2500+ €/mes self-serve
Foso:           Distribución institucional            Datos behavioral + EU compliance
                + relación con exchanges              + observabilidad operativa
```

Ambos crecen mientras crece el mercado del compute. Ninguno depende de que el otro fracase.

## 5. Riesgo: ¿qué pasa si Silicon Data lanza un producto end-user?

Es la pregunta correcta para el inversor. Lo abordamos directamente.

### 5.1 Probabilidad y plazos

Silicon Data tiene 4,7 M$ de funding y un equipo enfocado en distribución institucional. Lanzar un producto end-user (con marketing, customer success, soporte, billing self-serve, onboarding multi-cloud) significa abrir una segunda línea de producto con una unidad económica completamente distinta. Para una compañía con su perfil de inversor (DRW, Jump — capital de trading), esa expansión es estratégicamente desalineada con la tesis con la que les financian.

El escenario más probable es que Silicon Data permanezca enfocado en la distribución institucional durante al menos 24 meses. El segundo escenario más probable es que adquieran a alguien (no construyan) si deciden ampliarse al lado del comprador.

### 5.2 Plan de respuesta — escenario bajo (Silicon Data lanza un dashboard básico)

Si Silicon Data lanza un dashboard self-serve con sus índices ya existentes a un precio simbólico (≤ 50 €/mes), el impacto sobre CTI es **limitado**: el dashboard no incluiría las tres variables diferenciadoras (tokens-equivalentes, EU compliance, behavioral pricing) por las razones de fungibilidad descritas en 4.1. CTI sigue siendo el único producto que las ofrece.

Acción: amplificar la comunicación de las tres variables. La pivotada de copy ya prepara este mensaje.

### 5.3 Plan de respuesta — escenario medio (Silicon Data lanza producto con dimensión EU o tokens)

Si Silicon Data construye una versión simplificada de uno o dos de los diferenciadores, lo más esperable sería el sub-índice EU (es el más fácil de construir desde su data ya capturada). Esto erosionaría una de nuestras tres patas pero no las otras dos (tokens-equivalentes y behavioral pricing son cualitativamente más caros de construir y requieren bases de datos que CTI sí podría tener primero).

Acción: acelerar L2 (Hedging-as-a-Service) y L3 (Marketplace OTC). El comprador no decide solo por precio publicado — decide por *acción asistida*. CTI puede ser el lugar donde el cliente *ejecuta*, no sólo *consulta*. Silicon Data no puede entrar a ejecución sin reorganizar su modelo de negocio.

### 5.4 Plan de respuesta — escenario alto (Silicon Data adquiere o lanza un Bloomberg-Terminal completo)

Caso de máximo riesgo competitivo. Si Silicon Data adquiere a un competidor de FinOps cloud (por ejemplo, una de las dos o tres compañías más grandes en el espacio Vantage / CloudZero) y lo integra con su feed, el resultado es un producto end-to-end que sí compite directamente con CTI.

Acción en este caso:

1. **Capitalizar la ventaja de timing europeo**: si CTI ya tiene 50-200 clientes Enterprise EU con relación contractual y datos behavioral acumulados, esos clientes son extremadamente difíciles de migrar a un producto americano (preocupaciones GDPR sobre el propio proveedor de la tool, dependencia de la cobertura del catálogo europeo, lock-in de la integración facturas-up).
2. **Pivotar L1 a complementar Silicon Data**: si su producto cubre ya el grueso de los datos básicos, posicionar CTI como **la capa europea de compliance, gobierno y ejecución sobre su feed**. CTI deja de competir con su feed y pasa a venderse junto a su feed para clientes EU. Esto requiere abrir conversaciones tempranas (mucho antes de que el escenario se materialice) sobre licenciamiento o partnership.
3. **Acelerar L3 (Marketplace OTC)**: el marketplace es un negocio con economías propias (network effects, fee sobre transacción, lock-in bilateral) que vive fuera del producto-índice. Si L3 está en marcha, CTI no depende de seguir siendo "la pantalla" para tener un negocio defendible.

El plan de respuesta no es esperar — es construir capa por capa hasta que CTI tenga al menos un negocio (L2 o L3) que no dependa del producto-índice de superficie.

### 5.5 Indicadores tempranos a vigilar

| Señal | Qué significa | Cuándo activar plan |
|---|---|---|
| Silicon Data publica blog sobre "Pricing intelligence for buyers" | Posiblemente exploran el espacio | Bajo — observar |
| Silicon Data abre una página de pricing self-serve, aunque sea opaca | Probablemente hay producto | Medio — comunicar diferenciadores agresivamente |
| Silicon Data anuncia adquisición de FinOps tool | Escenario alto | Alto — ejecutar plan 5.4 inmediatamente |
| Silicon Data contrata equipo comercial enterprise | Pivote organizacional | Medio — abrir conversaciones partnership |
| Inversor de Silicon Data (DRW, Jump) participa en ronda de FinOps tool | Posible adquisición o consolidación inminente | Alto — preparar 5.4 |

## 6. Posición frente a herramientas FinOps generalistas (Vantage / CloudZero / Spot.io)

Las herramientas FinOps generalistas son **complementarias**, no sustitutivas. Cubren el resto del stack cloud (RDS, S3, Lambda, networking, almacenamiento) que CTI no toca. Un cliente típico de CTI puede tener Vantage para el coste cloud agregado y CTI específicamente para el compute GPU.

La pregunta natural es: *¿no podría una FinOps tool generalista añadir cobertura GPU profunda y desplazar a CTI?*

Respuesta corta: técnicamente sí, comercialmente improbable a corto plazo. El compute GPU es un mercado peculiar (volatilidad de precios spot 10-100×, marketplaces con pocos compradores institucionales, normalización de catálogos extremadamente fragmentada) que requiere una pila de scrapers, normalizadores y benchmarks dedicada. Para una FinOps tool con cinco años de roadmap acumulado en optimización de servicios cloud genéricos, montar esa pila implica una inversión de 12-24 meses sin claro retorno frente a su core product. Históricamente este patrón (especialista vs generalista) se resuelve por integración, no por desplazamiento — la FinOps tool acaba conectándose al feed del especialista.

Plan: cuando CTI tenga API estable y cobertura de catálogo demostrable (estimación: trimestre 2-3), iniciar conversaciones con Vantage / CloudZero / Spot.io sobre integración como data partner. Esto convierte a competidores potenciales en canales de distribución.

## 7. Tres líneas de producto y por qué cada una endurece la posición

La pivotada de tres líneas de producto descrita en `docs/three-product-lines.md` no es solo un plan de monetización: es **defensa estratégica**.

- **L1 — Terminal de procurement**: si el competidor logra alcanzar paridad en alguna de las dimensiones aquí, los clientes ya están integrados, ya consumen los datos a diario y la fricción de migración es alta.
- **L2 — Hedging-as-a-Service**: añade un servicio gestionado encima de los datos. La unidad económica deja de depender de "ver pantalla" y pasa a depender de "ahorro entregado". Esta capa es la más difícil de replicar porque requiere relación de confianza extendida en el tiempo y datos del consumo del propio cliente.
- **L3 — Marketplace OTC**: convierte CTI en un *venue* de transacción, no solo de información. Los marketplaces son negocios de dos lados con efectos de red propios. Una vez la liquidez esté establecida, ni Silicon Data ni una FinOps tool pueden replicar trivialmente la red bilateral.

Cada capa hace que CTI sea menos vulnerable a la competencia en la capa anterior. La secuencia importa: sin L1 los clientes Enterprise no existen para vender L2; sin L2 los datos behavioral no se acumulan para hacer creíble L3; sin L3 CTI no tiene un negocio que sobreviva a una eventual commoditización del lado-índice.

## 8. Conclusión

La oportunidad para Compute Index Terminal **no es desplazar a Silicon Data del lado institucional**. La oportunidad es construir el primer terminal operativo serio para el comprador europeo de cómputo IA, en un mercado que crece a doble dígito mensual y donde hoy ningún producto cubre simultáneamente las tres variables que el comprador necesita: tokens-equivalentes, EU-compliance y precio efectivo realmente pagado.

> **Nuestro cliente es el Head of Infra que firma facturas, no el portfolio manager que firma contratos de derivados.**

Mientras esa frase siga siendo verdad, CTI y Silicon Data no compiten — cada uno construye su mercado al lado del otro y la coexistencia genera valor en ambas direcciones.
