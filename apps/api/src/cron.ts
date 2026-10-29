import lista from '../lista-seguimiento.json';
import {
  armarLotes,
  descargarLote,
  UBICACIONES,
  type Esperar,
  type Fetch,
} from './data-project.js';
import { construirSnapshot, tablaDesdeRegistros, type Snapshot } from './snapshot.js';

export const CLAVE_SNAPSHOT = 'snapshot';

/** Por ahora solo calidad normal; subir esto multiplica el tamaño de cada respuesta. */
export const CALIDADES = [1] as const;

/**
 * Ítems por corrida. Con 255 ítems y 2 lotes por corrida se midieron 13 ms de CPU en Cloudflare
 * (límite: 10 ms), así que cada corrida baja una sola porción y la mezcla con el snapshot anterior.
 * Con porciones de 90 se midieron 7 y 9 ms (2026-10-28): demasiado justo, por eso 60.
 */
export const MAX_IDS_POR_LOTE = 60;

/** Cada cuánto corre el Cron; debe coincidir con `triggers.crons` en wrangler.jsonc. */
export const INTERVALO_CRON_MS = 5 * 60_000;

export interface Entorno {
  PRECIOS: KVNamespace;
}

export interface Dependencias {
  fetch: Fetch;
  esperar: Esperar;
  ahora: () => Date;
}

export function lotesSeguimiento() {
  return armarLotes(lista.ids, UBICACIONES, CALIDADES, MAX_IDS_POR_LOTE);
}

/** Qué porción toca según la hora programada: las porciones se turnan en orden. */
export function indicePorcion(momento: Date, total: number): number {
  return Math.floor(momento.getTime() / INTERVALO_CRON_MS) % total;
}

/**
 * Corrida del Cron: baja la porción que toca y escribe un solo snapshot en KV. Si la descarga falla
 * no escribe nada: el snapshot anterior se queda con sus fechas reales.
 */
export async function actualizarPrecios(
  env: Entorno,
  deps: Dependencias,
  momento: Date,
): Promise<Snapshot> {
  const lotes = lotesSeguimiento();
  const indice = indicePorcion(momento, lotes.length);
  const lote = lotes[indice];
  if (!lote) throw new Error(`No existe la porción ${indice} de ${lotes.length}`);

  const registros = await descargarLote(lote, deps.fetch, deps.esperar, deps.ahora);
  const anterior = await env.PRECIOS.get<Snapshot>(CLAVE_SNAPSHOT, 'json');

  const snapshot = construirSnapshot({
    ids: lista.ids,
    idsActualizados: new Set(lote.ids),
    nuevos: tablaDesdeRegistros(registros),
    anterior,
    ubicaciones: UBICACIONES,
    calidades: CALIDADES,
    porcion: { indice, total: lotes.length },
    ahora: deps.ahora(),
  });
  await env.PRECIOS.put(CLAVE_SNAPSHOT, JSON.stringify(snapshot));
  console.log(
    `Porción ${indice + 1}/${lotes.length}: ${lote.ids.length} ítems, ${registros.length} registros; ` +
      `${Object.keys(snapshot.precios).length}/${lista.ids.length} ítems con precio en el snapshot`,
  );
  return snapshot;
}
