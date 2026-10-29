import { Hono } from 'hono';
import { CLAVE_SNAPSHOT, CLAVE_VOLUMEN } from './config.js';
import { despertarDescarga } from './despertador.js';

export interface Entorno {
  PRECIOS: KVNamespace;
  /** Token de GitHub (secreto del Worker) para lanzar la descarga; ver src/despertador.ts. */
  GITHUB_TOKEN?: string;
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

export default {
  fetch: app.fetch,
  /** Cron cada 15 minutos: le pide a GitHub Actions que baje los precios. */
  async scheduled(_evento, env) {
    if (!env.GITHUB_TOKEN) {
      throw new Error(
        'Falta el secreto GITHUB_TOKEN del Worker; la descarga depende solo de GitHub',
      );
    }
    await despertarDescarga(env.GITHUB_TOKEN, (url, init) => fetch(url, init));
  },
} satisfies ExportedHandler<Entorno>;
