import {
  PRODUCCION,
  costoCompra,
  costoCrafteo,
  frescura,
  ingresoVenta,
  rrr,
  valorFoco,
  type CostoCrafteo,
  type IngresoVenta,
  type ModoOperacion,
} from '@gremio/core';
import { MERCADO_NEGRO } from './buscar';
import type { PrecioCiudad, Punto } from './precios';

/** Forma de `datos/recetas.json` (lo genera apps/web/scripts/generar-items.ts). */
export interface RecetaWeb {
  materiales: { id: string; cantidad: number; seRegresa: boolean }[];
  cantidadProducida: number;
  foco: number | null;
}

export interface FichaCrafteo {
  /** Categoría de crafteo del volcado (bow, wood, leather_armor…); decide la especialidad. */
  categoria: string | null;
  /** Refinar usa el bono de refinado de la ciudad; craftear, el de crafteo. */
  refinado: boolean;
  recetas: RecetaWeb[];
}

/** Forma de `datos/bonos.json` (de packages/catalog/bonos.json). */
export interface BonoCiudad {
  cluster: string;
  nombre: string;
  bonoRefinado: number;
  bonoCrafteo: number;
  especialidades: Record<string, number>;
}

export interface Bonos {
  base: number;
  especialidad: number;
  foco: number;
}

/** Bonos de producción que aplican al craftear esta ficha en esta ciudad. */
export function bonosProduccion(ficha: FichaCrafteo, ciudad: BonoCiudad, usarFoco: boolean): Bonos {
  return {
    base: ficha.refinado ? ciudad.bonoRefinado : ciudad.bonoCrafteo,
    especialidad: ficha.categoria === null ? 0 : (ciudad.especialidades[ficha.categoria] ?? 0),
    foco: usarFoco ? PRODUCCION.bonoFoco : 0,
  };
}

/** La ciudad con más bono para esta ficha; empate, la primera de la lista. */
export function mejorCiudad(ficha: FichaCrafteo, ciudades: readonly BonoCiudad[]): BonoCiudad {
  const total = (c: BonoCiudad) => {
    const b = bonosProduccion(ficha, c, false);
    return b.base + b.especialidad;
  };
  const [primera, ...resto] = ciudades;
  if (!primera) throw new Error('No hay ciudades para craftear');
  return resto.reduce((mejor, c) => (total(c) > total(mejor) ? c : mejor), primera);
}

export interface PrecioElegido {
  /** Lo que cuesta cada unidad, ya con la comisión si pones orden. */
  costo: number;
  ciudad: string;
  punto: Punto;
}

/**
 * Precio de un material: de la orden de venta más barata (instantáneo) o poniendo orden igual a la
 * mejor orden de compra (más barato, pero tarda en llenarse). `ciudad` null = la más barata. Solo
 * precios de menos de 6 horas; null si no hay.
 */
export function precioMaterial(
  porCiudad: Record<string, PrecioCiudad> | undefined,
  modo: ModoOperacion,
  ciudad: string | null,
  ahora: Date,
): PrecioElegido | null {
  let mejor: PrecioElegido | null = null;
  for (const [nombre, precio] of Object.entries(porCiudad ?? {})) {
    if (nombre === MERCADO_NEGRO || (ciudad !== null && nombre !== ciudad)) continue;
    const punto = modo === 'instantanea' ? precio.venta : precio.compra;
    if (!punto || punto.precio <= 0 || frescura(new Date(punto.fecha), ahora) === 'rojo') continue;
    const costo = costoCompra(punto.precio, modo).total;
    if (!mejor || costo < mejor.costo) mejor = { costo, ciudad: nombre, punto };
  }
  return mejor;
}

export interface Venta {
  /** Precio de la orden a la que vendes (o el que pones en tu orden de venta). */
  precio: number;
  modo: ModoOperacion;
}

export interface ResultadoCrafteo {
  bonos: Bonos;
  rrr: number;
  costo: CostoCrafteo;
  venta: IngresoVenta | null;
  /** Ganancia por unidad producida; null si falta algún precio. */
  gananciaUnidad: number | null;
}

export function calcularCrafteo(entrada: {
  ficha: FichaCrafteo;
  receta: RecetaWeb;
  ciudad: BonoCiudad;
  usarFoco: boolean;
  /** Costo por unidad de cada material (null si no hay precio reciente). */
  costoMaterial: Record<string, number | null>;
  /** Lo que cobra la estación por cada vez que crafteas la receta. */
  tarifaEstacion: number;
  venta: Venta | null;
  premium: boolean;
}): ResultadoCrafteo {
  const bonos = bonosProduccion(entrada.ficha, entrada.ciudad, entrada.usarFoco);
  const tasa = rrr([bonos.base, bonos.especialidad, bonos.foco]);
  const costo = costoCrafteo({
    materiales: entrada.receta.materiales.map((m) => ({
      ...m,
      precio: entrada.costoMaterial[m.id] ?? null,
    })),
    rrr: tasa,
    tarifaEstacion: entrada.tarifaEstacion,
    // Los bonos diarios no están verificados; no se descuentan (ver CLAUDE.md).
    descuentoDiarios: 0,
    cantidadProducida: entrada.receta.cantidadProducida,
  });
  const venta = entrada.venta
    ? ingresoVenta(entrada.venta.precio, entrada.venta.modo, entrada.premium)
    : null;
  const gananciaUnidad = costo.ok && venta ? venta.neto - costo.porUnidad : null;
  return { bonos, rrr: tasa, costo, venta, gananciaUnidad };
}

/**
 * Plata extra por cada punto de foco: compara la misma receta con y sin foco. Usa el foco base de
 * la receta; tus especializaciones lo bajan, así que tu valor real por punto es igual o mayor.
 */
export function valorDelFoco(
  conFoco: ResultadoCrafteo,
  sinFoco: ResultadoCrafteo,
  receta: RecetaWeb,
): number | null {
  if (conFoco.gananciaUnidad === null || sinFoco.gananciaUnidad === null) return null;
  if (receta.foco === null || receta.foco <= 0) return null;
  return valorFoco(
    conFoco.gananciaUnidad * receta.cantidadProducida,
    sinFoco.gananciaUnidad * receta.cantidadProducida,
    receta.foco,
  );
}
