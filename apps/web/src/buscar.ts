import { frescura } from '@gremio/core';
import type { PrecioCiudad, Punto } from './precios';

export interface ItemBuscable {
  id: string;
  nombre: string | null;
  tier: number | null;
  encantamiento: number;
  grupo: string;
}

/** Ubicación de la API que no es ciudad: su orden de compra va en su propia columna. */
export const MERCADO_NEGRO = 'Black Market';

/** Minúsculas y sin acentos, para que "pocion" encuentre "Poción". */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

export interface Busqueda {
  palabras: string[];
  tier: number | null;
  encantamiento: number | null;
}

/**
 * Separa el nivel del texto: "arco largo 4.1" busca "arco" y "largo" en tier 4, encantamiento 1.
 * También entiende "t4", "t4.1" y "@1".
 */
export function interpretarBusqueda(texto: string): Busqueda {
  const busqueda: Busqueda = { palabras: [], tier: null, encantamiento: null };
  for (const parte of normalizar(texto).split(/\s+/).filter(Boolean)) {
    const nivel = /^t?([1-8])(?:\.([0-4]))?$/.exec(parte);
    const encantamiento = /^@([0-4])$/.exec(parte);
    if (nivel) {
      busqueda.tier = Number(nivel[1]);
      if (nivel[2] !== undefined) busqueda.encantamiento = Number(nivel[2]);
    } else if (encantamiento) {
      busqueda.encantamiento = Number(encantamiento[1]);
    } else {
      busqueda.palabras.push(parte);
    }
  }
  return busqueda;
}

export interface Indexado<T> {
  item: T;
  texto: string;
}

/** Se arma una vez: nombre e ID normalizados de cada ítem. */
export function indexar<T extends ItemBuscable>(items: readonly T[]): Indexado<T>[] {
  return items.map((item) => ({ item, texto: normalizar(`${item.nombre ?? ''} ${item.id}`) }));
}

export function filtrar<T extends ItemBuscable>(
  indice: readonly Indexado<T>[],
  busqueda: Busqueda,
  grupo: string | null,
): T[] {
  const resultado: T[] = [];
  for (const { item, texto } of indice) {
    if (grupo !== null && item.grupo !== grupo) continue;
    if (busqueda.tier !== null && item.tier !== busqueda.tier) continue;
    if (busqueda.encantamiento !== null && item.encantamiento !== busqueda.encantamiento) continue;
    if (busqueda.palabras.every((p) => texto.includes(p))) resultado.push(item);
  }
  return resultado;
}

export interface Mejor {
  ciudad: string;
  punto: Punto;
}

export interface Resumen {
  /** Orden de venta más barata entre las ciudades (sin el Mercado Negro). */
  masBarato: Mejor | null;
  /** Orden de compra más alta entre las ciudades (sin el Mercado Negro). */
  mejorOferta: Mejor | null;
  /** Orden de compra del Mercado Negro. */
  mercadoNegro: Punto | null;
}

/** Solo usa precios de menos de 6 horas: un precio viejo no puede salir como "el más barato". */
export function resumir(porCiudad: Record<string, PrecioCiudad> | undefined, ahora: Date): Resumen {
  const resumen: Resumen = { masBarato: null, mejorOferta: null, mercadoNegro: null };
  if (!porCiudad) return resumen;
  const reciente = (p: Punto | null): p is Punto =>
    p !== null && frescura(new Date(p.fecha), ahora) !== 'rojo';

  for (const [ciudad, precio] of Object.entries(porCiudad)) {
    if (ciudad === MERCADO_NEGRO) {
      if (reciente(precio.compra)) resumen.mercadoNegro = precio.compra;
      continue;
    }
    if (
      reciente(precio.venta) &&
      precio.venta.precio < (resumen.masBarato?.punto.precio ?? Infinity)
    )
      resumen.masBarato = { ciudad, punto: precio.venta };
    if (reciente(precio.compra) && precio.compra.precio > (resumen.mejorOferta?.punto.precio ?? 0))
      resumen.mejorOferta = { ciudad, punto: precio.compra };
  }
  return resumen;
}
