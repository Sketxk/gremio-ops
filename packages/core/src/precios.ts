import { FRESCURA } from './constantes.js';

export interface PuntoHistorial {
  precio: number;
  volumen: number;
}

/**
 * Mediana ponderada por volumen: el precio al que se cruzó la mitad de lo vendido. Resiste mejor
 * que el promedio a una venta suelta inflada. null si no hubo ventas.
 */
export function medianaPonderada(historial: readonly PuntoHistorial[]): number | null {
  const puntos = historial.filter((h) => h.volumen > 0).sort((a, b) => a.precio - b.precio);
  const total = puntos.reduce((suma, h) => suma + h.volumen, 0);
  if (total === 0) return null;
  let acumulado = 0;
  for (const punto of puntos) {
    acumulado += punto.volumen;
    if (acumulado >= total / 2) return punto.precio;
  }
  throw new Error('Inalcanzable: el acumulado siempre llega a la mitad');
}

/** Qué tanto se aleja un precio de su referencia, como fracción (0.3 = 30% arriba). */
export function desviacion(precio: number, referencia: number): number {
  if (referencia <= 0) throw new Error('La referencia debe ser mayor a 0');
  return (precio - referencia) / referencia;
}

export type Frescura = 'verde' | 'amarillo' | 'rojo';

export function frescura(fechaPrecio: Date, ahora: Date): Frescura {
  const minutos = (ahora.getTime() - fechaPrecio.getTime()) / 60_000;
  if (minutos < FRESCURA.verdeHastaMin) return 'verde';
  if (minutos <= FRESCURA.amarilloHastaMin) return 'amarillo';
  return 'rojo';
}
