import { Hono } from 'hono';
import { CLAVE_SNAPSHOT, CLAVE_VOLUMEN } from './config.js';

export interface Entorno {
  PRECIOS: KVNamespace;
}

const app = new Hono<{ Bindings: Entorno }>();

/**
 * Último snapshot tal cual está en KV, como flujo: no se parsea, así casi no gasta CPU. Lo escribe
 * GitHub Actions (apps/api/scripts/actualizar-precios.ts).
 */
app.get('/api/precios', async (c) => {
  const snapshot = await c.env.PRECIOS.get(CLAVE_SNAPSHOT, 'stream');
  if (snapshot === null) {
    return c.json({ error: 'Todavía no hay precios guardados.' }, 503);
  }
  return c.body(snapshot, 200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=60',
  });
});

/** Resumen de ventas por día (apps/api/scripts/actualizar-volumen.ts, una vez al día). */
app.get('/api/volumen', async (c) => {
  const volumen = await c.env.PRECIOS.get(CLAVE_VOLUMEN, 'stream');
  if (volumen === null) {
    return c.json({ error: 'Todavía no hay datos de volumen.' }, 503);
  }
  return c.body(volumen, 200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
  });
});

export default app;
