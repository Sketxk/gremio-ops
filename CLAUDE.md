# CLAUDE.md — Albion Command OS

Este archivo lo lees al iniciar cada sesión. El detalle completo del producto está en `docs/PLAN.md`; léelo completo en la primera sesión y cada vez que empieces una fase nueva.

## Con quién trabajas

- Trabajas con el dueño del proyecto. No es programador de oficio: sabe moverse en tecnología pero no escribe código a diario. Su nombre, cuentas y perfil de juego están en `CLAUDE.local.md` (solo local).
- **El repo es público.** Ningún dato personal del dueño (nombre, correos, zona horaria, dónde o cómo juega) va en archivos versionados, commits ni textos de la app. Ante la duda, va en `CLAUDE.local.md`.
- Háblale siempre en español mexicano, de tú, claro y sin tecnicismos innecesarios. Si usas un término técnico, explícalo en una frase.
- Antes de instalar software, crear recursos en la nube o hacer algo difícil de revertir, explica en una o dos frases qué vas a hacer y por qué, y espera su "sí".
- Cuando termines un paso, dile qué quedó listo y qué sigue. Nada de reportes largos.
- Nunca le pidas contraseñas, tokens ni llaves en el chat. Los inicios de sesión los hace él en el navegador (`gh auth login`, `wrangler login`). Los secretos se guardan con `wrangler secret put`, nunca en el repositorio.

## Estado actual (actualízalo al cerrar cada paso)

- **Arranque: completo** (2026-10-28). Windows 11, Node 24 LTS, `gh` con la cuenta **Sketxk**; git firma como Sketxk solo en este repo. Cloudflare: cuenta del dueño (ver `CLAUDE.local.md`).
- **Repo:** https://github.com/Sketxk/gremio-ops (**público** desde 2026-10-29, rama `main`, historial limpio). El historial anterior está en el repo privado `gremio-ops-privado`; nunca lo subas al público.
- **Worker:** `gremio-ops` en https://gremio-ops.gremio-api.workers.dev (subdominio `gremio-api` lo asignó Wrangler; el dueño puede cambiarlo). Sirve `apps/web/dist` como estáticos y `/api/*` con Hono (`/api/precios` devuelve el snapshot de KV como flujo, sin parsear). **Sin Cron.**
- **Descarga de precios:** GitHub Actions (`.github/workflows/precios.yml`) cada 15 min corre `npm run precios -w @gremio/api`: baja los 2,063 ítems de la lista en ~12 lotes con 5 s de pausa y escribe un solo snapshot en KV por la API de Cloudflare (secretos del repo: `CLOUDFLARE_API_TOKEN` con permiso solo de Workers KV, `CLOUDFLARE_ACCOUNT_ID`). Se movió del Cron del Worker porque no cupo en 10 ms de CPU (medido: 13 ms con 2 lotes; 5–11 ms por porción de 60). Los workflows programados de repos públicos se pausan tras 60 días sin actividad en el repo.
- **KV:** `gremio-ops-precios` (binding `PRECIOS`), clave `snapshot`.
- **Despliegue:** Workers Builds conectado al repo. Cada push a `main` corre `npm run build` y `npx wrangler deploy --config apps/api/wrangler.jsonc`. A mano: `npm run deploy`.
- **Comandos:** `npm run check` (tipos, lint, formato, pruebas) · `npm run generar -w @gremio/catalog` (catálogo y bonos tras un parche) · `npm run lista -w @gremio/api` y `npm run items -w @gremio/web` (tras cambiar la lista de seguimiento) · `npm run precios -w @gremio/api` (descarga a mano; requiere las variables de entorno del workflow).
- **API del Data Project:** bloquea por minutos si recibe consultas seguidas (cabecera `ratelimit-reset`). No la consultes en ráfaga desde esta PC mientras pruebas.
- **Fase 0: completa** (2026-10-29). Puerta: el dueño aceptó verificar las fórmulas con ejemplos publicados en guías de 2026 + constantes de ao-bin-dumps en lugar de casos propios (`packages/core/test/casos-publicados.test.ts`); capturas de su juego quedan como revisión opcional. Sin confirmar: tarifa de estación (la captura el usuario) y bono diario +10/+20% (solo en guías).
- **Fase 1: en curso.** Lista de seguimiento (decidida con el dueño): arcos T4+, todos los recursos, armaduras de cuero T4+, capas y bolsas T4+, comida y pociones (2,063 ítems). Orden propuesto: base de la app + buscador → radar del Mercado Negro → calculadora de crafteo → D1 + login con Discord → bitácora.

## Primera sesión: arranque (haz esto en orden)

Esta es una computadora nueva. Antes de escribir código de la app, deja el entorno listo. Revisa qué ya existe y salta lo que ya esté hecho.

### Paso 1 — Herramientas

1. Detecta el sistema operativo.
2. Verifica que existan: `git`, `node` (versión LTS actual) y `npm`. Muestra las versiones.
3. Verifica también la CLI de GitHub (`gh`).
4. Si algo falta, explícale al dueño qué es y para qué sirve, y con su permiso instálalo con el gestor del sistema (`winget` en Windows, `brew` en Mac, el gestor de paquetes en Linux). Si algún instalador requiere hacer clic, guíalo paso a paso.
5. Configura git con su nombre y correo si no está configurado (pregúntale cuáles usar).
6. Wrangler (CLI de Cloudflare) se usará con `npx wrangler`, no hace falta instalarlo global.

### Paso 2 — Cuentas (las crea el dueño)

1. Pregúntale si ya tiene cuenta de **GitHub** y de **Cloudflare**.
2. Si no, guíalo para crearlas en el navegador. Ambas son gratis; Cloudflare no pide tarjeta para el plan gratuito. Tú no creas cuentas ni escribes datos personales en formularios.
3. Espera a que confirme que ya entró a ambas.

### Paso 3 — Repositorio

1. Pídele el nombre de la app (decisión pendiente). Si no lo tiene, propone 3 opciones cortas y deja que elija. Por defecto: `albion-command-os`.
2. Inicializa git en esta carpeta (si no existe) con un `.gitignore` adecuado para Node (incluye `node_modules`, `.wrangler`, `.dev.vars`, `.env*`).
3. Ejecuta `gh auth login` para que el dueño inicie sesión en el navegador.
4. Crea el repositorio privado con `gh repo create <nombre> --private --source . --remote origin` y haz el primer commit con `CLAUDE.md`, `LEEME.md` y `docs/PLAN.md`.

### Paso 4 — Cloudflare

1. Ejecuta `npx wrangler login` para que el dueño autorice en el navegador.
2. Verifica con `npx wrangler whoami`.
3. No crees todavía KV ni D1: se crean durante la Fase 0 cuando el código los necesite, avisándole antes.
4. El despliegue automático (conectar el repo de GitHub con Cloudflare) se configura al final de la Fase 0, guiando al dueño en el panel de Cloudflare.

Cuando estos cuatro pasos estén listos, dile al dueño que el entorno quedó listo y empieza la Fase 0.

## Reglas no negociables del producto

1. **Cero datos inventados.** Ningún precio, receta, peso, carga de montura ni mecánica escrita a mano. Todo sale de la API del Albion Online Data Project o de ao-bin-dumps. Si falta un dato, la app lo dice. Prohibido usar valores de respaldo que parezcan reales y prohibido `catch` vacío que oculte errores.
2. **Frescura visible.** Cada precio muestra su antigüedad: verde < 1 h, amarillo 1–6 h, rojo > 6 h.
3. **Matemática completa.** Impuesto, comisión de orden, RRR, foco, tarifa de estación, volumen y riesgo en cada cálculo de ganancia.
4. **Solo mecánicas verificadas.** No implementar: "auto-respec" a 0.72 de plata por fama, intercambio de 12 corazones por 16, "flip desnudo" con peso cero, impuesto "del consorcio". Si una mecánica no está confirmada, pregúntale al dueño antes de programarla.
5. **Costo cero.** Solo plan gratuito de Cloudflare, GitHub y servicios gratuitos. Nada que pida tarjeta, ningún servicio de pago, ninguna IA de pago, ningún dominio de paga.
6. **Respetar los términos de Albion.** Nada que lea la memoria del juego, overlays sobre el cliente ni automatización de acciones dentro del juego.
7. **Respetar la API comunitaria.** Solo la descarga programada (GitHub Actions) consulta la API del Data Project, nunca el navegador del usuario. User-Agent propio, lotes de URL menores a 4,096 caracteres y espera progresiva ante errores.
8. **No saltar fases.** Cada fase tiene una puerta (ver `docs/PLAN.md`). No se empieza la siguiente sin cumplirla.

## Stack (fijo; no cambiarlo sin preguntar)

- TypeScript en todo.
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + TanStack Query + TanStack Table + Apache ECharts.
- API: Hono en Cloudflare Workers.
- Datos: Cloudflare D1 + Drizzle ORM; Cloudflare KV para el snapshot de precios.
- Tareas programadas: Cron Triggers.
- Login: Discord OAuth2. Alertas: webhooks de Discord.
- Validación: Zod. Pruebas: Vitest.
- Monorepo con npm workspaces:

```
apps/web        → frontend
apps/api        → Worker (API + Cron)
packages/core   → fórmulas puras sin dependencias, con pruebas
packages/catalog→ script que genera catalogo.json desde ao-bin-dumps
docs/           → PLAN.md y notas
```

## Límites del plan gratuito (diseña siempre debajo de esto)

| Recurso | Límite | Regla |
| --- | --- | --- |
| Peticiones a Workers | 100,000/día | Frontend como estáticos (no cuentan) |
| CPU por invocación, Cron incluido | 10 ms | Cálculos pesados en el navegador; Cron en porciones pequeñas |
| Subpeticiones por invocación | 50 | Pocos lotes por corrida |
| Cron Triggers | 5 por cuenta | Usar 2 o 3 |
| Escrituras KV | 1,000/día | Un solo snapshot por corrida (96/día: GitHub Actions cada 15 min) |
| Lecturas KV | 100,000/día | Una lectura trae todos los precios |
| Escrituras D1 | 100,000 filas/día | Histórico: una fila por ítem cada 6 h con todas las ciudades en JSON; cuidado, cada índice suma escrituras |
| Lecturas D1 | 5 millones de filas/día | Índices en toda consulta |
| Almacenamiento D1 | 5 GB | Compactar detalle viejo |

Desde septiembre de 2026, D1 rechaza consultas al pasar el tope diario. Si el Cron no cabe en 10 ms de CPU aun rotando porciones, mueve la descarga a GitHub Actions (gratis) que escribe el snapshot en KV, y avísale al dueño.

## Datos

- API de precios (Américas): `https://west.albion-online-data.com/api/v2/stats/prices/{ids}.json?locations=...&qualities=...`
- Históricos: `/api/v2/stats/history/{ids}.json?time-scale=1|6|24`
- Oro: `/api/v2/stats/gold.json?count=N`
- Ubicaciones: Lymhurst, Fort Sterling, Thetford, Martlock, Bridgewatch, Caerleon, Brecilien, Black Market. Verifica en una respuesta real cómo escribe la API cada nombre antes de fijarlo en código.
- Catálogo: repositorio público ao-bin-dumps en GitHub (actualmente `ao-data/ao-bin-dumps`; antes estaba en `broderickhyman/ao-bin-dumps`). Revisa su estructura real antes de escribir el parser; no supongas nombres de archivos ni campos.
- Impuestos: venta 4% con premium / 8% sin premium (también al Mercado Negro); comisión de 2.5% solo al **poner** orden (compra o venta); operaciones instantáneas no pagan comisión.

## Fase 0 — Cimientos (lo primero después del arranque)

1. **Monorepo**: estructura de carpetas, npm workspaces, TypeScript estricto, ESLint/Prettier, Vitest.
2. **Catálogo** (`packages/catalog`): script que descarga ao-bin-dumps y genera `catalogo.json` con ID, nombre en español, tier, encantamiento, categoría, peso, receta (materiales y cantidades). La fama de crafteo y si el Mercado Negro lo compra no vienen en el volcado: ver "Datos del juego y precios" en `docs/PLAN.md` (decidido con el dueño el 2026-10-28). Incluye una validación que confirme IDs clave (por ejemplo `T4_2H_LONGBOW`, `T4_2H_BOW`, `T4_PLANKS`, `T4_CLOTH`).
3. **Motor de cálculo** (`packages/core`) con pruebas: comisiones, RRR, costo de crafteo, valor del foco, riesgo esperado, regla de exposición, precio robusto (mediana), plata por hora y tamaño de posición. Las constantes del juego van en un solo archivo, cada una con un comentario "verificar tras parche".
4. **Cron de precios** (`apps/api`): descarga la lista de seguimiento, guarda un solo snapshot en KV, mide el CPU contra los 10 ms. Crea el namespace KV avisando al dueño.
5. **Prueba de vida** (`apps/web`): una página sencilla que muestre unos 20 ítems con su precio por ciudad y la antigüedad con color. Sin diseño final todavía.
6. **Despliegue**: guía al dueño para conectar el repo con Cloudflare y publicar en el subdominio gratuito.

**Puerta para pasar a la Fase 1:** las pruebas pasan, la página muestra precios reales con su antigüedad, el Cron cabe en los límites, y el dueño confirma las fórmulas con 2 o 3 casos reales del juego (un crafteo con materiales usados y devueltos, una venta al Mercado Negro con precio y plata recibida). Pídele esos casos cuando el motor esté listo.

## Textos de la interfaz

- Todos los textos visibles viven en un solo archivo (por ejemplo `apps/web/src/textos/es.ts`), separados de la lógica.
- Tono de compañero de gremio que sabe de economía: de tú, español mexicano natural, frases cortas, siempre el porqué, honesto cuando un dato es dudoso. Sin "¡Excelente elección!", sin tecnicismos sin explicar, sin emojis en la interfaz.
- Ejemplo: en vez de "Advertencia: riesgo elevado", escribe "Ojo: tres del gremio murieron en esta ruta esta semana, casi todos de noche. Si vas, lleva menos carga o ve acompañado".
- Más ejemplos en la sección "Intuitiva y explicada como persona" de `docs/PLAN.md`.

## Decisiones pendientes (pregúntaselas al dueño cuando hagan falta, no todas de golpe)

- ~~Nombre definitivo de la app.~~ Decidido: **gremio-ops** (repo `Sketxk/gremio-ops`, subdominio gratuito de Cloudflare).
- ID del servidor de Discord del gremio y roles (se necesita en la Fase 1).
- Tamaño del gremio.
- ~~Categorías de ítems a seguir además de arcos.~~ Decidido (ver Estado actual).
- ~~Ciudad de tablas, bono de arcos en Lymhurst y constantes de RRR~~: resueltos con datos del juego (`packages/catalog/bonos.json` y `gamedata.json`): Fort Sterling +40% madera, Lymhurst +15% arcos, base +18%, foco +59%. Fórmulas verificadas con guías publicadas (ver Estado actual).
