import { MERCADO } from './constantes.js';

export type ModoOperacion = 'instantanea' | 'orden';

export function tasaImpuestoVenta(premium: boolean): number {
  return premium ? MERCADO.impuestoVentaPremium : MERCADO.impuestoVentaSinPremium;
}

export interface CostoCompra {
  total: number;
  comision: number;
}

/** Comprar de una orden de venta no cobra nada extra; poner orden de compra cobra comisión. */
export function costoCompra(precio: number, modo: ModoOperacion): CostoCompra {
  const comision = modo === 'orden' ? precio * MERCADO.comisionOrden : 0;
  return { total: precio + comision, comision };
}

export interface IngresoVenta {
  neto: number;
  impuesto: number;
  comision: number;
}

/**
 * Vender a una orden de compra (o al Mercado Negro) paga solo impuesto; poner orden de venta
 * paga además la comisión al publicarla.
 */
export function ingresoVenta(precio: number, modo: ModoOperacion, premium: boolean): IngresoVenta {
  const impuesto = precio * tasaImpuestoVenta(premium);
  const comision = modo === 'orden' ? precio * MERCADO.comisionOrden : 0;
  return { neto: precio - impuesto - comision, impuesto, comision };
}
