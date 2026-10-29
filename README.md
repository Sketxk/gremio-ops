# Gremio Ops

Web app económica para un gremio de **Albion Online** (servidor Américas): precios reales, cálculos de crafteo y comercio con todas las comisiones, y coordinación entre miembros. Corre completa en el plan gratuito de Cloudflare.

Estado: **Fase 0 completa** (catálogo, motor de cálculo, Cron de precios y página de prueba). La Fase 1 (login con Discord, buscador, radar del Mercado Negro, calculadora y bitácora) está en curso.

## Principios

- **Cero datos inventados.** Los precios salen de la API del [Albion Online Data Project](https://www.albion-online-data.com/) y los ítems, recetas y bonos de [ao-bin-dumps](https://github.com/ao-data/ao-bin-dumps). Si falta un dato, la app lo dice.
- **Frescura visible.** Cada precio muestra hace cuánto se vio: verde < 1 h, amarillo 1–6 h, rojo > 6 h.
- **Matemática completa.** Impuesto, comisión de orden, RRR, foco y tarifa de estación en cada cálculo.
- **Respeto a la API comunitaria.** Solo el proceso programado consulta el Data Project (nunca el navegador), con User-Agent propio, URLs de menos de 4,096 caracteres y espera progresiva ante errores.
- **Respeto a los términos de Albion.** Nada que lea la memoria del juego, overlays ni automatización dentro del juego.

## Estructura

```
apps/web          React + Vite + Tailwind (se sirve como archivos estáticos)
apps/api          Cloudflare Worker: API con Hono y Cron de precios a KV
packages/core     Fórmulas puras con pruebas (comisiones, RRR, crafteo, riesgo…)
packages/catalog  Genera catalogo.json y bonos.json desde ao-bin-dumps
docs/PLAN.md      Plan del producto
```

## Comandos

```bash
npm install
npm run check                       # tipos, lint, formato y pruebas
npm run generar -w @gremio/catalog  # regenera el catálogo tras un parche del juego
npm run dev -w @gremio/web          # frontend local (usa la API publicada)
npm run deploy                      # compila y publica (normalmente lo hace Cloudflare en cada push)
```

Requiere Node 24.
