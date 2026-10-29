import {
  costoCompra,
  desviacion,
  frescura,
  ingresoVenta,
  tamanoPosicion,
  valorEsperadoViaje,
  type Limitante,
  type ModoOperacion,
} from '@gremio/core';
import { MERCADO_NEGRO } from './buscar';
import type { PrecioCiudad, Punto, Volumen } from './precios';

/** El Mercado Negro está en Caerleon: comprar ahí y venderle no implica viaje. */
export const CAERLEON = 'Caerleon';

/**
 * Regla del producto: un precio a más de 50% de su mediana de 7 días se marca como raro (puede ser
 * un error de captura, una orden trampa o un pico que no va a durar).
 */
export const UMBRAL_RARO = 0.5;

export interface AjustesRadar {
  /** Plata con la que cuentas para esta jugada. */
  capital: number;
  premium: boolean;
  /** `instantanea`: compras de la orden de venta más barata. `orden`: pones orden de compra. */
  modoCompra: ModoOperacion;
  /** Probabilidad de morir en el viaje a Caerleon (0 a 1). */
  riesgoViaje: number;
  /** Lo que te cuesta reponer tu equipo si mueres. */
  costoSet: number;
  /** Fracción máxima de tu plata que cargas en un viaje (regla de exposición). */
  exposicion: number;
  /** Peso que te cabe en la montura; null si no lo quieres limitar. */
  carga: number | null;
  /** En cuántos días quieres terminar de vender. */
  diasParaVender: number;
  /** Miembros del gremio haciendo la misma jugada (se reparten lo que el Mercado Negro absorbe). */
  miembros: number;
}

export interface Oportunidad {
  ciudad: string;
  viaje: boolean;
  /** Precio de compra en la ciudad (orden de venta o de compra, según el modo). */
  compra: Punto;
  /** Orden de compra del Mercado Negro. */
  mercadoNegro: Punto;
  costoUnidad: number;
  comisionUnidad: number;
  ingresoUnidad: number;
  impuestoUnidad: number;
  gananciaUnidad: number;
  /** Ganancia entre costo (0.2 = te quedan 20 de cada 100 que pones). */
  margen: number;
  unidades: number;
  limitante: Limitante;
  limites: Record<Limitante, number>;
  inversion: number;
  /** Ganancia sin contar el riesgo: lo que te queda si llegas. */
  gananciaSiLlegas: number;
  /** Ganancia esperada contando la probabilidad de morir en el camino. */
  gananciaEsperada: number;
  /** Ventas diarias al Mercado Negro (mediana de 7 días); null si no hay dato. */
  volumenMercadoNegro: Volumen | null;
  raro: { compra: boolean; mercadoNegro: boolean };
}

function reciente(p: Punto | null | undefined, ahora: Date): p is Punto {
  return p != null && frescura(new Date(p.fecha), ahora) !== 'rojo';
}

function esRaro(precio: number, volumen: Volumen | undefined): boolean {
  if (!volumen) return false;
  return Math.abs(desviacion(precio, volumen.precioMediano)) > UMBRAL_RARO;
}

/**
 * Todas las formas de comprar un ítem en una ciudad y vendérselo al Mercado Negro al instante, con
 * impuestos, comisión, tamaño de posición y riesgo. Solo usa precios de menos de 6 horas. Regresa
 * las que dejan ganancia, de la mejor a la peor.
 */
export function oportunidades(entrada: {
  porCiudad: Record<string, PrecioCiudad> | undefined;
  volumen: Record<string, Volumen> | undefined;
  peso: number | null;
  ajustes: AjustesRadar;
  ahora: Date;
}): Oportunidad[] {
  const { porCiudad, volumen, peso, ajustes: a, ahora } = entrada;
  const mn = porCiudad?.[MERCADO_NEGRO]?.compra;
  if (!porCiudad || !reciente(mn, ahora)) return [];

  const venta = ingresoVenta(mn.precio, 'instantanea', a.premium);
  const volumenMN = volumen?.[MERCADO_NEGRO] ?? null;
  const resultado: Oportunidad[] = [];

  for (const [ciudad, precio] of Object.entries(porCiudad)) {
    if (ciudad === MERCADO_NEGRO) continue;
    const compra = a.modoCompra === 'instantanea' ? precio.venta : precio.compra;
    if (!reciente(compra, ahora) || compra.precio <= 0) continue;

    const costo = costoCompra(compra.precio, a.modoCompra);
    const gananciaUnidad = venta.neto - costo.total;
    if (gananciaUnidad <= 0) continue;

    const viaje = ciudad !== CAERLEON;
    const p = viaje ? a.riesgoViaje : 0;
    const posicion = tamanoPosicion({
      capital: a.capital,
      precioUnitario: costo.total,
      pesoUnitario: peso ?? 0,
      cargaDisponible: a.carga ?? Infinity,
      exposicionMax: viaje ? a.capital * a.exposicion : a.capital,
      // Sin dato de volumen no se limita por mercado; la pantalla lo avisa.
      volumenDiario: volumenMN?.ventasDia ?? Infinity,
      diasParaVender: a.diasParaVender,
      miembros: a.miembros,
    });
    if (posicion.unidades <= 0) continue;

    const inversion = costo.total * posicion.unidades;
    const ingresoTotal = venta.neto * posicion.unidades;
    resultado.push({
      ciudad,
      viaje,
      compra,
      mercadoNegro: mn,
      costoUnidad: costo.total,
      comisionUnidad: costo.comision,
      ingresoUnidad: venta.neto,
      impuestoUnidad: venta.impuesto,
      gananciaUnidad,
      margen: gananciaUnidad / costo.total,
      unidades: posicion.unidades,
      limitante: posicion.limitante,
      limites: posicion.limites,
      inversion,
      gananciaSiLlegas: ingresoTotal - inversion,
      gananciaEsperada: valorEsperadoViaje({
        p,
        ingresoNeto: ingresoTotal,
        inversion,
        costoSet: viaje ? a.costoSet : 0,
      }),
      volumenMercadoNegro: volumenMN,
      raro: {
        compra: esRaro(compra.precio, volumen?.[ciudad]),
        mercadoNegro: esRaro(mn.precio, volumenMN ?? undefined),
      },
    });
  }
  return resultado.sort((x, y) => y.gananciaEsperada - x.gananciaEsperada);
}

/** Una oportunidad es confiable si hay volumen del Mercado Negro y ningún precio se ve raro. */
export function esConfiable(o: Oportunidad): boolean {
  return o.volumenMercadoNegro !== null && !o.raro.compra && !o.raro.mercadoNegro;
}
