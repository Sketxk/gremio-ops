import lista from '../lista-seguimiento.json';
import { CALIDADES, PAUSA_ENTRE_LOTES_MS } from './config.js';
import {
  armarLotes,
  descargarLote,
  UBICACIONES,
  type Esperar,
  type Fetch,
  type RegistroApi,
} from './data-project.js';
import { construirSnapshot, tablaDesdeRegistros, type Snapshot } from './snapshot.js';

/** Dónde vive el snapshot (KV vía la API de Cloudflare en producción). */
export interface Almacen {
  leer(): Promise<Snapshot | null>;
  guardar(snapshot: Snapshot): Promise<void>;
}

export interface Dependencias {
  fetch: Fetch;
  esperar: Esperar;
  ahora: () => Date;
  almacen: Almacen;
}

/** Si el snapshot tiene menos de esto, la corrida se salta (llegaron dos avisos casi juntos). */
export const MINUTOS_MINIMOS_ENTRE_DESCARGAS = 10;

export function snapshotReciente(anterior: Snapshot | null, ahora: Date): boolean {
  if (!anterior) return false;
  const minutos = (ahora.getTime() - Date.parse(anterior.generado)) / 60_000;
  return minutos >= 0 && minutos < MINUTOS_MINIMOS_ENTRE_DESCARGAS;
}

/**
 * Baja toda la lista de seguimiento en lotes con pausa entre ellos y guarda un solo snapshot. Los
 * ítems de lotes fallidos conservan su dato anterior con su fecha real. Si fallan todos, no escribe.
 *
 * Corre en GitHub Actions: en el Cron del Worker no cupo en los 10 ms de CPU del plan gratuito.
 */
export async function actualizarPrecios(
  deps: Dependencias,
  ids: readonly string[] = lista.ids,
): Promise<Snapshot> {
  const lotes = armarLotes(ids, UBICACIONES, CALIDADES);
  const registros: RegistroApi[] = [];
  const idsActualizados = new Set<string>();
  let fallidos = 0;

  for (const [i, lote] of lotes.entries()) {
    if (i > 0) await deps.esperar(PAUSA_ENTRE_LOTES_MS);
    try {
      registros.push(...(await descargarLote(lote, deps.fetch, deps.esperar, deps.ahora)));
      for (const id of lote.ids) idsActualizados.add(id);
    } catch (error) {
      fallidos++;
      console.error(`Lote ${i + 1}/${lotes.length} fallido`, error);
    }
  }

  if (fallidos === lotes.length) {
    throw new Error(`Fallaron los ${lotes.length} lotes; se conserva el snapshot anterior`);
  }

  const anterior = fallidos > 0 ? await deps.almacen.leer() : null;
  const snapshot = construirSnapshot({
    ids,
    idsActualizados,
    nuevos: tablaDesdeRegistros(registros),
    anterior,
    ubicaciones: UBICACIONES,
    calidades: CALIDADES,
    lotes: { total: lotes.length, fallidos },
    ahora: deps.ahora(),
  });
  await deps.almacen.guardar(snapshot);
  console.log(
    `Snapshot: ${Object.keys(snapshot.precios).length}/${ids.length} ítems con precio, ` +
      `${registros.length} registros, ${lotes.length} lotes, ${fallidos} fallidos`,
  );
  return snapshot;
}
