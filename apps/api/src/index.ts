import { Hono } from 'hono';
import { actualizarPrecios, CLAVE_SNAPSHOT, type Entorno } from './cron.js';

const app = new Hono<{ Bindings: Entorno }>();

/** Último snapshot tal cual está en KV: una sola lectura, sin volver a parsearlo. */
app.get('/api/precios', async (c) => {
  const snapshot = await c.env.PRECIOS.get(CLAVE_SNAPSHOT, 'text');
  if (snapshot === null) {
    return c.json({ error: 'Todavía no hay precios: el Cron no ha corrido.' }, 503);
  }
  return c.body(snapshot, 200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=60',
  });
});

export default {
  fetch: app.fetch,
  async scheduled(evento, env, ctx) {
    ctx.waitUntil(
      actualizarPrecios(
        env,
        {
          fetch: (url, init) => fetch(url, init),
          esperar: (ms) => new Promise((r) => setTimeout(r, ms)),
          ahora: () => new Date(),
        },
        new Date(evento.scheduledTime),
      ),
    );
  },
} satisfies ExportedHandler<Entorno>;
