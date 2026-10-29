import { medianaPonderada } from '@gremio/core';
import lista from '../lista-seguimiento.json';
import { CALIDADES, DIAS_VOLUMEN, PAUSA_ENTRE_LOTES_MS } from './config.js';
import {
  armarLotes,
  descargarLote,
  UBICACIONES,
  validarHistorial,
  type Esperar,
  type Fetch,
  type RegistroHistorial,
} from './data-project.js';

/** Ventas de un ítem en una ubicación durante los últimos días completos. */
export interface Volumen {
  /** Mediana de unidades vendidas por día, contando solo los días con registro. */
  ventasDia: number;
  /** Precio al que se cruzó la mitad de lo vendido (mediana ponderada por volumen). */
  precioMediano: number;
  /** Días con registro dentro de la ventana (de 0 a `dias`). */
  diasConDato: number;
}

export interface SnapshotVolumen {
  version: 1;
  generado: string;
  /** Tamaño de la ventana en días completos (UTC), sin contar el día en curso. */
  dias: number;
  calidades: number[];
  lotes: { total: number; fallidos: number };
  /** volumen[itemId][calidad][ubicación] */
  volumen: Record<string, Record<string, Record<string, Volumen>>>;
}

function mediana(valores: readonly number[]): number {
  const orden = [...valores].sort((a, b) => a - b);
  const mitad = Math.floor(orden.length / 2);
  if (orden.length % 2 === 1) return orden[mitad] ?? 0;
  return ((orden[mitad - 1] ?? 0) + (orden[mitad] ?? 0)) / 2;
}

/**
 * Resume el historial en la ventana de días completos que termina ayer (UTC). El día en curso se
 * descarta porque va a medias. Un día sin registro no cuenta como cero: no sabemos si no hubo
 * ventas o si nadie revisó el historial ese día.
 */
export function resumirHistorial(
  registros: readonly RegistroHistorial[],
  ahora: Date,
  dias: number,
): SnapshotVolumen['volumen'] {
  const hoy = Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate());
  const desde = hoy - dias * 86_400_000;
  const volumen: SnapshotVolumen['volumen'] = {};

  for (const r of registros) {
    const enVentana = r.data.filter((d) => {
      const t = Date.parse(`${d.timestamp}Z`);
      return t >= desde && t < hoy && d.item_count > 0;
    });
    if (enVentana.length === 0) continue;
    const precioMediano = medianaPonderada(
      enVentana.map((d) => ({ precio: d.avg_price, volumen: d.item_count })),
    );
    if (precioMediano === null) continue;
    const porCalidad = (volumen[r.item_id] ??= {});
    const porUbicacion = (porCalidad[String(r.quality)] ??= {});
    porUbicacion[r.location] = {
      ventasDia: mediana(enVentana.map((d) => d.item_count)),
      precioMediano,
      diasConDato: enVentana.length,
    };
  }
  return volumen;
}

export interface AlmacenVolumen {
  guardar(snapshot: SnapshotVolumen): Promise<void>;
}

export interface DependenciasVolumen {
  fetch: Fetch;
  esperar: Esperar;
  ahora: () => Date;
  almacen: AlmacenVolumen;
}

/**
 * Baja el historial diario de toda la lista y guarda un resumen. Corre una vez al día: el volumen
 * cambia despacio y así se cuida la API comunitaria. Si fallan lotes, esos ítems quedan sin dato
 * (la app dice "sin datos de volumen", no inventa).
 */
export async function actualizarVolumen(
  deps: DependenciasVolumen,
  ids: readonly string[] = lista.ids,
): Promise<SnapshotVolumen> {
  const lotes = armarLotes(ids, UBICACIONES, CALIDADES, Infinity, 'history');
  const registros: RegistroHistorial[] = [];
  let fallidos = 0;

  for (const [i, lote] of lotes.entries()) {
    if (i > 0) await deps.esperar(PAUSA_ENTRE_LOTES_MS);
    try {
      registros.push(
        ...(await descargarLote(lote, deps.fetch, deps.esperar, deps.ahora, validarHistorial)),
      );
    } catch (error) {
      fallidos++;
      console.error(`Lote ${i + 1}/${lotes.length} fallido`, error);
    }
  }
  if (fallidos === lotes.length) {
    throw new Error(`Fallaron los ${lotes.length} lotes; se conserva el volumen anterior`);
  }

  const ahora = deps.ahora();
  const snapshot: SnapshotVolumen = {
    version: 1,
    generado: ahora.toISOString(),
    dias: DIAS_VOLUMEN,
    calidades: [...CALIDADES],
    lotes: { total: lotes.length, fallidos },
    volumen: resumirHistorial(registros, ahora, DIAS_VOLUMEN),
  };
  await deps.almacen.guardar(snapshot);
  console.log(
    `Volumen: ${Object.keys(snapshot.volumen).length}/${ids.length} ítems con ventas, ` +
      `${registros.length} registros, ${lotes.length} lotes, ${fallidos} fallidos`,
  );
  return snapshot;
}
