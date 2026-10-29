import type { RegistroApi } from './data-project.js';

export interface Punto {
  precio: number;
  /** Fecha ISO en UTC de cuando alguien vio ese precio. */
  fecha: string;
}

export interface PrecioCiudad {
  /** Orden de venta más barata (lo que pagas si compras al instante). */
  venta: Punto | null;
  /** Orden de compra más alta (lo que recibes si vendes al instante). */
  compra: Punto | null;
}

/** id → calidad → ciudad → precios. */
export type TablaPrecios = Record<string, Record<string, Record<string, PrecioCiudad>>>;

export interface Snapshot {
  version: 1;
  generado: string;
  ubicaciones: string[];
  calidades: number[];
  /** Porción de la lista que se actualizó en esta corrida (las porciones se turnan). */
  porcion: Porcion;
  precios: TablaPrecios;
}

export interface Porcion {
  indice: number;
  total: number;
}

/**
 * La API manda precio 0 y fecha `0001-01-01T00:00:00` cuando no tiene dato; eso es "sin dato",
 * nunca un precio de 0. Sus fechas vienen en UTC sin zona.
 */
export function punto(precio: number, fecha: string): Punto | null {
  if (precio <= 0 || fecha.startsWith('0001-')) return null;
  return { precio, fecha: fecha.endsWith('Z') ? fecha : `${fecha}Z` };
}

export function tablaDesdeRegistros(registros: readonly RegistroApi[]): TablaPrecios {
  const tabla: TablaPrecios = {};
  for (const r of registros) {
    const venta = punto(r.sell_price_min, r.sell_price_min_date);
    const compra = punto(r.buy_price_max, r.buy_price_max_date);
    if (venta === null && compra === null) continue;
    const porCalidad = (tabla[r.item_id] ??= {});
    const porCiudad = (porCalidad[String(r.quality)] ??= {});
    porCiudad[r.city] = { venta, compra };
  }
  return tabla;
}

export interface EntradaSnapshot {
  /** Lista de seguimiento actual: lo que no esté aquí se descarta. */
  ids: readonly string[];
  /** IDs que se descargaron en esta corrida. */
  idsActualizados: ReadonlySet<string>;
  nuevos: TablaPrecios;
  anterior: Snapshot | null;
  ubicaciones: readonly string[];
  calidades: readonly number[];
  porcion: Porcion;
  ahora: Date;
}

/**
 * Lo descargado reemplaza por completo lo anterior de ese ítem (si la API ya no tiene dato, deja de
 * mostrarse). Lo demás conserva lo anterior con su fecha original, así la antigüedad sigue siendo
 * honesta.
 */
export function construirSnapshot(e: EntradaSnapshot): Snapshot {
  const precios: TablaPrecios = {};
  for (const id of e.ids) {
    const datos = e.idsActualizados.has(id) ? e.nuevos[id] : e.anterior?.precios[id];
    if (datos !== undefined) precios[id] = datos;
  }
  return {
    version: 1,
    generado: e.ahora.toISOString(),
    ubicaciones: [...e.ubicaciones],
    calidades: [...e.calidades],
    porcion: e.porcion,
    precios,
  };
}
