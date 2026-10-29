# Albion Command OS — Plan Maestro

Versión del 27 de octubre de 2026

> Copia del plan maestro hecho en claude.ai. Si hay diferencias con CLAUDE.md, manda CLAUDE.md para reglas de trabajo y este documento para el detalle del producto.

## Visión y principios

Albion Command OS es la web app económica del gremio en Albion Online (servidor Américas/West): precios reales, cálculos correctos y coordinación entre miembros, desplegada en Cloudflare con acceso por Discord.

**Para quién:** primero el creador; después todo el gremio, cada uno con su ciudad base, especialización y estilo.

**Reglas no negociables:**

1. **Cero datos inventados.** Ningún precio, receta, peso o mecánica escrita a mano. Todo sale de la API del Albion Online Data Project o de los datos del juego (ao-bin-dumps). Si falta un dato, la app lo dice; nunca muestra un número de respaldo como si fuera real.
2. **Frescura visible.** Cada precio muestra su antigüedad. Un precio de más de 6 horas se marca como dudoso.
3. **Matemática completa.** Impuesto, comisión de orden, tasa de retorno de recursos (RRR), foco, tarifa de estación, volumen y riesgo entran en cada cálculo de ganancia.
4. **Mecánicas verificadas.** Una función entra al producto solo si la mecánica del juego está confirmada.
5. **Hecha para jugar.** Carga instantánea, usable en celular o segundo monitor, decisiones en una pantalla.
6. **Gremio primero.** Lo que un miembro registra (especialización, pedidos, bitácora) ayuda a los demás.

## Diagnóstico del código anterior (Streamlit, hecho con Gemini)

El `app.py` anterior no recibía ningún dato real: las URLs de la API estaban mal formadas, un `except` vacío ocultaba el error y la app mostraba siempre valores de respaldo escritos a mano (4,500, 150, 6,000, oro en 5,350). **No se reutiliza ese código; solo las ideas.**

| Problema | Efecto | Corrección |
| --- | --- | --- |
| URL sin host regional ni ruta `/api/v2/stats/prices/` | Nunca llegaban precios | `https://west.albion-online-data.com/api/v2/stats/prices/{ids}.json` |
| URL del oro apuntaba a la página principal | Oro fijo en 5,350 | `/api/v2/stats/gold.json?count=N` |
| `except: pass` y valores de respaldo | El error se veía como dato real | Mostrar "sin datos" y la antigüedad |
| "Black Market" no se pedía en `locations` | El Mercado Negro nunca aparecía | Agregar `Black Market` (y `Brecilien`) |
| "FortSterling" sin espacio | Ciudad sin resultados | Usar el nombre exacto que devuelve la API |
| IDs de ítems incorrectos (`T4_LONGBOW`, capucha de cazador como `SET1`, `T4_HEART`) | Ítems que no existen | Validar contra ao-bin-dumps (p. ej. `T4_2H_LONGBOW`) |
| Recetas, pesos y cargas de montura escritos a mano e iguales en todos los tiers | Costos y cargas falsos | Leer recetas y pesos de ao-bin-dumps |
| Impuesto fijo de 4% | Ignoraba la comisión de 2.5% por orden | Modelo instantáneo vs. orden |
| Sin RRR, foco ni tarifa de estación | Crafteo mal calculado | Motor de cálculo |
| Anti-cartel con umbral fijo de 45,000 | Alertas sin sentido | Comparar contra la mediana histórica |
| Bitácora en `st.session_state` | Se borraba al refrescar | Base de datos D1 |

**Qué se rescata:** la lista de módulos, el enfoque de bajo riesgo, la bitácora y la forma de la fórmula de riesgo del Mercado Negro.

**Mecánicas descartadas hasta verificar:** cotizador de "auto-respec" a 0.72 de plata por fama; intercambio de 12 corazones por 16 en transporte de facción; "flip desnudo" con ítems de peso cero; impuesto "del consorcio" de la serrería.

## Arquitectura en Cloudflare

La app vive completa en Cloudflare: el frontend en Pages (o archivos estáticos de Workers), la lógica en un Worker y los datos en KV y D1. **La API comunitaria solo la consulta el Cron, nunca el navegador de un miembro.**

```
Miembros del gremio (navegador o celular)
        │
        ▼
┌──────────────────────────── Cloudflare ────────────────────────────┐
│  Frontend (React + Vite + Tailwind)   ◄── catálogo de ítems ─── ao-bin-dumps
│        │
│        ▼
│  API en Workers (Hono) ── OAuth, webhooks ──────────────────────► Discord
│     │ lee            │ guarda
│     ▼                ▼
│  KV: caché de      D1: base de datos
│  precios           (usuarios, bitácoras, gremio, histórico)
│     ▲                ▲
│     │                │ resumen cada 6 horas
│  GitHub Actions 15 min ┘
│     │
│     └──── pide precios ─────────────────────────────────────► API del Data Project
└─────────────────────────────────────────────────────────────────────┘
```

Flujo: GitHub Actions descarga precios cada 15 minutos a KV y guarda un resumen cada 6 horas en D1; la API sirve precios ya calculados desde KV y guarda bitácoras y datos del gremio en D1; Discord da el login y recibe las alertas; ao-bin-dumps alimenta el catálogo de ítems al construir el frontend.

## Stack tecnológico

Todo en TypeScript y todo dentro de Cloudflare, dentro del plan gratuito (ver Costo cero).

| Capa | Tecnología | Para qué |
| --- | --- | --- |
| Frontend | React + Vite + TypeScript | La interfaz |
| Componentes y estilo | Tailwind CSS + shadcn/ui | Interfaz limpia, modo oscuro nativo |
| Datos en el cliente | TanStack Query | Caché, recarga automática de precios, estados de carga |
| Tablas | TanStack Table | Ordenar y filtrar cientos de ítems |
| Gráficas | Apache ECharts | Históricos con zoom, comparativas por ciudad |
| API | Hono en Cloudflare Workers | Endpoints propios: precios, cálculos, bitácora, gremio |
| Base de datos | Cloudflare D1 + Drizzle ORM | Usuarios, bitácoras, pedidos, tesorería, histórico propio |
| Caché de precios | Cloudflare KV | Último snapshot de precios |
| Tareas programadas | GitHub Actions y Cron Triggers | Descargar precios cada 15 minutos (Actions); resumir cada 6 horas |
| Login | Discord OAuth2 | Solo entran miembros del servidor de Discord del gremio |
| Alertas | Webhooks de Discord | Oportunidades publicadas en un canal |
| Validación | Zod | Mismas reglas de datos en frontend y API |
| Pruebas | Vitest | Fórmulas probadas con casos conocidos |
| Repositorio y despliegue | GitHub + Cloudflare | Despliegue automático en cada cambio |

**Por qué no Streamlit:** necesita un servidor de Python siempre encendido y Cloudflare ejecuta código por petición; además su diseño es limitado y el estado se pierde al refrescar. **Por qué no Next.js:** añade complejidad de servidor innecesaria.

## Costo cero

La app completa cuesta 0 pesos al mes: plan gratuito de Cloudflare (sin tarjeta), GitHub, Discord y fuentes públicas. Sin dominio de paga: se usa el subdominio gratuito de Cloudflare.

| Recurso | Límite gratuito | Regla de diseño |
| --- | --- | --- |
| Archivos del frontend | Ilimitados | La interfaz se sirve como estáticos, no consume peticiones |
| Peticiones a Workers | 100,000 al día | Solo la API cuenta |
| CPU por invocación (incluye Cron) | 10 ms | Cálculos pesados en el navegador; Cron en lotes pequeños |
| Subpeticiones por invocación | 50 | Cada corrida del Cron descarga pocos lotes |
| Cron Triggers | 5 por cuenta | Se usan 2 o 3 |
| Escrituras en KV | 1,000 al día | Un solo snapshot por corrida: 96 escrituras al día |
| Lecturas en KV | 100,000 al día | Una lectura trae todos los precios |
| Escrituras en D1 | 100,000 filas al día | Histórico: una fila por ítem cada 6 horas, todas las ciudades en JSON |
| Lecturas en D1 | 5 millones de filas al día | Índices en toda consulta |
| Almacenamiento D1 | 5 GB | Resúmenes; el detalle viejo se compacta |
| Despliegues | 500 al mes | Sobra |

- Desde septiembre de 2026, D1 rechaza consultas al pasar el tope diario hasta la medianoche UTC (la app la muestra en la hora local de cada quien). La app tiene panel de consumo para el admin y alerta al 70% de cualquier límite.
- **Riesgo principal: los 10 ms de CPU del Cron.** Plan: pedir solo campos y calidades necesarias y rotar la lista en porciones entre corridas. Si no alcanza, la descarga pasa a una tarea programada gratuita de GitHub Actions que escribe el snapshot en KV.
- Fuera para mantener costo cero: IA de pago, servidores siempre encendidos, dominios de paga. Si el gremio crece mucho, el plan de pago de Workers cuesta 5 USD al mes.

Fuentes: [límites de Workers](https://developers.cloudflare.com/workers/platform/limits/), [precios de D1](https://developers.cloudflare.com/d1/platform/pricing/), [aviso de D1 sept. 2026](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/).

## Datos del juego y precios

**1. Catálogo del juego (ao-bin-dumps).** Un script descarga el volcado público de datos del juego y genera `catalogo.json` con, por ítem: ID, nombre en español, tier, encantamiento, categoría, peso, receta (materiales y cantidades, y si el RRR regresa cada material). Se regenera tras cada parche.

- **Mercado Negro:** el volcado no dice qué compra el Mercado Negro; sus órdenes cambian con la demanda del juego. Se detecta con precios reales: si la API muestra orden de compra en `Black Market`, la app dice "sí lo compra" con precio y antigüedad; si no hay dato reciente, dice "sin datos recientes" (nunca "no lo compra").
- **Fama de crafteo:** el volcado solo la trae para cultivos y animales (`@famevalue`). Para lo demás queda fuera hasta tener una fuente verificable.

**2. API del Albion Online Data Project** ([documentación](https://europe.albion-online-data.com/api)):

| Endpoint | Uso |
| --- | --- |
| `/api/v2/stats/prices/{ids}.json?locations=…&qualities=…` | Precios actuales: venta mínima, compra máxima y su fecha por ciudad y calidad |
| `/api/v2/stats/history/{ids}.json?time-scale=1\|6\|24` | Históricos de precio y volumen vendido |
| `/api/v2/stats/gold.json?count=N` | Precio del oro en plata |

Host para Américas: `https://west.albion-online-data.com`. Ubicaciones: Lymhurst, Fort Sterling, Thetford, Martlock, Bridgewatch, Caerleon, Brecilien y Black Market. Encantamientos con sufijo `@1` a `@4`. Límite de 4,096 caracteres por URL.

**3. Estrategia de caché.** GitHub Actions cada 15 minutos → toda la lista de seguimiento en lotes con pausa → un snapshot en KV (el Cron del Worker no cupo en 10 ms de CPU). Cada 6 horas resumen en D1. Si la API falla, se muestra el último snapshot con su antigüedad. Peticiones con User-Agent propio y espera progresiva ante errores.

**4. Calidad del dato.** Cada precio lleva antigüedad (verde < 1 h, amarillo 1–6 h, rojo > 6 h), volumen de 24 h y alerta de anomalía contra la mediana de 7 días.

## Motor de cálculo

Fórmulas en un paquete `core` sin dependencias, con pruebas. Constantes del juego configurables (Sandbox las ajusta en parches).

**1. Comisiones de mercado**

| Operación | Comisión de orden | Impuesto (premium / sin premium) |
| --- | --- | --- |
| Comprar de una orden de venta (instantáneo) | 0% | 0% |
| Poner orden de compra | 2.5% | 0% |
| Vender a orden de compra o al Mercado Negro (instantáneo) | 0% | 4% / 8% |
| Poner orden de venta | 2.5% | 4% / 8% |

**2. RRR:** `RRR = 1 − 1 / (1 + B)`, con B = suma de bonos de producción (base de ciudad real, especialidad de ciudad, foco, bonos diarios). Referencias comunes: ~15% sin bonos, ~37% refinando en ciudad de especialidad, ~54% con foco. Constantes editables, verificar tras cada parche.

**3. Costo real de crafteo:** `C = Σ qᵢ·pᵢ·(1 − RRR) + T_estación − D_diarios`.

**4. Valor del foco:** (ganancia con foco − ganancia sin foco) ÷ foco gastado.

**5. Riesgo de viaje a zona roja:** `EV = (1 − p)·V_neto − I − p·S` (p = probabilidad de morir, V = ingreso neto, I = inversión, S = costo del set). Con varias zonas: `p = 1 − (1 − p1)(1 − p2)…`. Regla de exposición: no cargar más del 10% del banco por viaje (ajustable).

**6. Precio de referencia robusto:** mediana de 7 días con volumen; desviaciones grandes se marcan como posible manipulación.

**7. Plata por hora:** ganancia neta ÷ (compra + transporte + crafteo + tiempo estimado de venta). Criterio de orden por defecto en toda la app.

**8. Tamaño de posición:** mínimo entre capital, carga de la montura, regla de exposición y lo que el mercado absorbe por volumen diario. Si varios miembros apuntan al mismo ítem, la cuota se reparte.

## Módulos por fase

| Módulo | Qué hace | Fase |
| --- | --- | --- |
| Inicio de sesión y perfil | Login con Discord; perfil con personajes, ciudad base, premium, especializaciones y foco | MVP |
| Buscador y comparador de precios | Cualquier ítem en español; precio por ciudad y calidad con antigüedad, volumen y anomalía | MVP |
| Radar del Mercado Negro | Mejores compras en ciudades para vender al Mercado Negro, con riesgo, volumen y carga máxima | MVP |
| Calculadora de crafteo y refinado | Costo real con RRR, foco, tarifa de estación y diarios | MVP |
| Bitácora de sesiones | Plata e inventario inicio/fin, actividad, muertes; plata por hora y tendencia | MVP |
| Optimizador de foco | Qué refinar o craftear hoy por plata por punto de foco | Fase 2 |
| Lista de compras y ruta | Qué comprar en cada ciudad, peso contra montura, qué vender y dónde | Fase 2 |
| Tendencias | Gráficas históricas por ítem y ciudad | Fase 2 |
| Comidas y pociones | Cocina y alquimia con RRR; consumibles como gasto por sesión | Fase 2 |
| Pedidos de crafteo del gremio | Tablero: un miembro pide, el de mejor especialización toma | Fase 2 |
| Alertas en Discord | Avisos cuando un margen supera el umbral con volumen suficiente | Fase 2 |
| Aprende | Estrategias básicas de economía (refinar, transportar, abastecer el Mercado Negro, crafteo con foco…) explicadas como compañero de gremio. Cada guía usa precios en vivo como ejemplo y lleva a la herramienta que la ejecuta. Solo mecánicas verificadas; si un parche cambia algo, la guía se marca como "en revisión" | Fase 2 |
| Caravanas | Viajes en grupo: carga por miembro, riesgo y reparto | Fase 3 |
| Tesorería del gremio | Aportaciones, gastos y valuación del banco del gremio | Fase 3 |
| Ranking | Plata por hora por miembro y actividad | Fase 3 |
| Granja e isla | Cultivos y animales por ciclo | Fase 3 |
| Oro y premium | Precio del oro y si conviene pagar premium con plata | Fase 3 |

## Funciones pro

| Función | Qué hace | Fase |
| --- | --- | --- |
| Plata por hora | Toda oportunidad se ordena por ganancia neta entre tiempo total | MVP |
| Velocidad de venta y tamaño de posición | Días para vender N unidades según volumen; cuántas comprar sin saturar; reparto entre miembros | MVP |
| Registro de muertes | Zona, hora y valor perdido en cada muerte | MVP |
| Varios personajes por usuario | Alts con su especialización, foco y ciudad | MVP |
| Planificador de sesión | Con tiempo, capital y ciudad arma el plan completo, con cronómetro; llena la bitácora | Fase 2 |
| Hacer o comprar | En cada paso de la cadena decide si fabricar o comprar el insumo | Fase 2 |
| Mercado interno del gremio | Venta entre miembros a "precio gremio"; el intercambio directo no paga impuesto ni comisión | Fase 2 |
| Riesgo con datos reales | Probabilidad de morir por ruta y horario desde el registro de muertes | Fase 2 |
| Valor esperado por calidad | Promedio ponderado de calidades según especialización | Fase 2 |
| Arbitraje de encantamiento | Ítem .0 + runas/almas/reliquias vs. ítem encantado | Fase 2 |
| Vigilante de órdenes | Aviso cuando alguien pone un precio menor que tu orden | Fase 2 |
| Panel de capital | Plata líquida, en órdenes, en inventario y viajando | Fase 2 |
| App instalable (PWA) | Se instala en celular, abre al instante, funciona sin conexión, notificaciones push | Fase 2 |
| Metas con proyección | Cuándo llegas a una meta según tu plata por hora real | Fase 2 |
| Reporte semanal del gremio | Resumen automático cada lunes por webhook | Fase 2 |
| Simulador "qué pasa si" | Cambiar premium, ciudad o riesgo y ver el efecto | Fase 2 |
| Índice de inflación | Canasta de ítems básicos medida en el tiempo | Fase 3 |
| Planificador de laboriosos | Qué laborioso conviene según diarios llenos vs. vacíos | Fase 3 |
| Backtesting | Probar una estrategia contra el histórico | Fase 3 |
| Recordatorios de foco y ciclos | Foco lleno, cultivos listos, laboriosos de regreso | Fase 3 |
| ROI de especialización | En cuánto tiempo se paga subir de nivel una rama | Fase 3 |
| Escalera de capital | Qué hacer con 100 mil, 1 millón, 10 millones | Fase 3 |
| Radar de parches | Ítems marcados como volátiles tras cambios de balance | Fase 3 |

**En pausa:** bot de Discord con comandos (`/precio`, `/flip`).

**Límite firme:** nada que lea la memoria del juego, overlays sobre el cliente ni automatización de acciones dentro del juego.

## Modelo de datos (D1)

| Tabla | Campos clave | Fase |
| --- | --- | --- |
| `users` | id, discord_id, nombre, avatar, rol (admin, oficial, miembro), creado | MVP |
| `characters` | id, user_id, nombre, ciudad_base, premium, foco_actual | MVP |
| `user_settings` | user_id, umbral_riesgo, exposicion_max_pct, idioma, modo (simple/experto) | MVP |
| `user_specs` | character_id, categoria, nivel, bono_calidad | MVP |
| `sessions_log` | id, character_id, fecha, minutos, plata_inicio, plata_fin, valor_inventario_inicio, valor_inventario_fin, actividad, murio, notas | MVP |
| `deaths_log` | id, character_id, fecha, hora, zona, ruta, valor_perdido, causa | MVP |
| `price_snapshots` | item_id, fecha_hora, ciudades (JSON con mediana, mínimo, compra máxima y volumen por ciudad) | MVP |
| `watchlist` | item_id, motivo, agregado_por | MVP |
| `craft_orders` | id, pedido_por, item_id, cantidad, precio_ofrecido, tomado_por, estado, fecha_limite | Fase 2 |
| `alerts` | id, user_id o canal, item_id, condicion, umbral, activa | Fase 2 |
| `session_plans` | id, character_id, capital, minutos, ciudad, plan (JSON), resultado | Fase 2 |
| `guild_market` | id, vendedor, item_id, calidad, cantidad, precio_gremio, comprador, estado | Fase 2 |
| `my_orders` | id, user_id, item_id, ciudad, tipo, precio, cantidad, activa | Fase 2 |
| `capital_snapshots` | user_id, fecha, liquida, en_ordenes, inventario, en_transito | Fase 2 |
| `audit_log` | id, user_id, accion, entidad, fecha | Fase 2 |
| `caravans` | id, organizador, ruta, fecha, riesgo_estimado, estado | Fase 3 |
| `caravan_members` | caravan_id, user_id, carga_valor, resultado, ganancia | Fase 3 |
| `treasury_tx` | id, user_id, tipo, monto, concepto, fecha | Fase 3 |
| `strategies` | id, user_id, reglas (JSON), resultado_backtest | Fase 3 |

La fuente de verdad de los ítems es `catalogo.json` (generado de ao-bin-dumps), versionado con el código.

## Diseño de interfaz

Terminal de trading: oscura por defecto, densa pero legible; cada pantalla responde una sola pregunta.

- Barra lateral en escritorio, barra inferior en celular.
- Panel de inicio: 5 mejores oportunidades según tu perfil, plata por hora de la semana, estado de los datos, pedidos del gremio.
- Tablas ordenables con íconos oficiales de ítems, antigüedad con color y margen neto destacado.
- Ficha de ítem: precio por ciudad, histórico, receta y cálculo de crafteo.
- Perfil siempre aplicado a todos los cálculos.
- Cada número con origen y fecha al pasar el cursor.
- Paleta sobria (carbón, dorado para plata, verde/rojo para margen), tipografía tipo Inter, sin emojis en la interfaz.
- Carga inicial menor a 1.5 segundos.

## Intuitiva y explicada como persona

La app se siente como un compañero de gremio que sabe de economía y te explica en la plática. Cualquier miembro entiende qué hacer en menos de un minuto.

1. Primer uso en tres preguntas: ciudad, premium y a qué se dedica más.
2. Una frase arriba de cada pantalla con la recomendación del momento.
3. "¿De dónde sale este número?" en cada cifra: la cuenta paso a paso en palabras normales.
4. Modo simple y modo experto.
5. Términos del juego (RRR, foco, comisión de orden) con ayuda corta al vuelo.
6. Pantallas vacías y errores que dicen qué hacer.
7. Glosario del gremio.

**Tono:** de tú, español mexicano natural, frases cortas, siempre el porqué, honesto con la duda, sin entusiasmo falso, sin tecnicismos sin explicar, sin llenar de emojis, humor ligero cuando cabe.

| Así no (robot) | Así sí (persona) |
| --- | --- |
| Error: datos no disponibles para el ítem seleccionado. | No tenemos precio reciente de este arco en Martlock; nadie lo ha revisado en unas horas. Si pasas por ahí con el cliente de datos abierto, se actualiza solo. |
| Margen neto: 18.4%. | Después de impuestos te quedan unos 18 de cada 100 de plata. Buen trato, y se venden como 40 al día, así que no te vas a quedar con ellos. |
| Advertencia: riesgo elevado en la ruta seleccionada. | Ojo: tres del gremio murieron en esta ruta esta semana, casi todos de noche. Si vas, lleva menos carga o ve acompañado. |
| Sin registros en la bitácora. | Todavía no hay sesiones. Cuando termines de jugar, anota cuánta plata traes y aquí vas a ver si de verdad estás ganando. |
| Tasa de retorno de recursos (RRR): 47.9%. | Cuando crafteas, el juego te regresa parte del material. En tu ciudad con bono y usando foco, te regresa casi la mitad; por eso te sale más barato de lo que parece. |
| Límite diario de consultas alcanzado. | Por hoy ya usamos todo lo que da el plan gratuito. Los precios siguen visibles; lo demás vuelve a la medianoche UTC; aquí te decimos qué hora es eso donde vives. |

Todos los textos de la interfaz viven en un solo archivo separado del código. Antes de cada fase, dos o tres miembros que no conocen la app la prueban sin ayuda; donde se atoren, se reescribe.

## Roadmap

| Fase | Contenido | Puerta para avanzar |
| --- | --- | --- |
| 0: Cimientos | Repo y Cloudflare, catálogo del juego, Cron y caché, fórmulas con pruebas | Fórmulas validadas con casos reales del juego (cumplida el 2026-10-29 con ejemplos publicados, por decisión del dueño) |
| 1: MVP | Login con Discord, precios y buscador, Mercado Negro, crafteo y refinado, bitácora (+ plata por hora, tamaño de posición, registro de muertes, varios personajes) | El gremio usa el MVP a diario |
| 2: Gremio | Foco, compras y ruta, tendencias, comidas y pociones, pedidos, alertas, PWA y funciones pro de fase 2 | Pedidos y alertas en uso |
| 3: Avanzado | Caravanas, tesorería, ranking, granja, oro y premium, y funciones pro de fase 3 | — |

## Decisiones pendientes

- [x] Nombre definitivo de la app: **gremio-ops** (define el subdominio gratuito).
- [ ] ID del servidor de Discord del gremio y roles para admin, oficial y miembro.
- [ ] Cuántos miembros tiene el gremio.
- [ ] Lista de seguimiento inicial: categorías de ítems además de arcos.
- [x] Ciudad de tablas, bono de arcos y constantes de RRR: salen de ao-bin-dumps (Fort Sterling +40% madera, Lymhurst +15% arcos, base +18% en ciudades reales, foco +59%). Se confirman con casos reales en la puerta de la Fase 0.
- [ ] Quiénes del gremio pueden correr el cliente del Data Project.

## Fuentes

- [Albion Online Data Project: API](https://europe.albion-online-data.com/api)
- [Albion Online Grind: Market Flipping Guide](https://albiononlinegrind.com/guides/market-flipping-guide)
- [AlbionMarket.gg: Black Market Flipping](https://albionmarket.gg/guides/black-market-flipping)
- [MMOs.com: comisiones del mercado de oro (Patch 12)](https://mmos.com/news/albion-online-gold-market-purchase-fees)
- [Cloudflare Workers: límites](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare D1: precios](https://developers.cloudflare.com/d1/platform/pricing/)
