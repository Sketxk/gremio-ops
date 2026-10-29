export interface TiemposMin {
  compra: number;
  transporte: number;
  crafteo: number;
  venta: number;
}

/** Ganancia neta entre el tiempo total que te lleva, en plata por hora. */
export function plataPorHora(gananciaNeta: number, tiempos: TiemposMin): number {
  const minutos = tiempos.compra + tiempos.transporte + tiempos.crafteo + tiempos.venta;
  if (minutos <= 0) throw new Error('El tiempo total debe ser mayor a 0');
  return gananciaNeta / (minutos / 60);
}

export interface EntradaPosicion {
  capital: number;
  precioUnitario: number;
  pesoUnitario: number;
  /** Peso que aún te cabe en la montura. */
  cargaDisponible: number;
  /** Plata máxima a arriesgar en el viaje (ver `limiteExposicion`). */
  exposicionMax: number;
  /** Unidades que se venden al día en el mercado destino. */
  volumenDiario: number;
  /** En cuántos días quieres terminar de vender. */
  diasParaVender: number;
  /** Miembros del gremio apuntando al mismo ítem (incluyéndote). */
  miembros: number;
}

export type Limitante = 'capital' | 'carga' | 'exposicion' | 'mercado';

export interface Posicion {
  unidades: number;
  limitante: Limitante;
  limites: Record<Limitante, number>;
}

/** Cuántas comprar: lo menor entre capital, carga, exposición y lo que el mercado absorbe. */
export function tamanoPosicion(e: EntradaPosicion): Posicion {
  if (e.precioUnitario <= 0) throw new Error('El precio debe ser mayor a 0');
  if (e.miembros < 1) throw new Error('Debe haber al menos un miembro');
  const limites: Record<Limitante, number> = {
    capital: Math.floor(e.capital / e.precioUnitario),
    carga: e.pesoUnitario > 0 ? Math.floor(e.cargaDisponible / e.pesoUnitario) : Infinity,
    exposicion: Math.floor(e.exposicionMax / e.precioUnitario),
    mercado: Math.floor((e.volumenDiario * e.diasParaVender) / e.miembros),
  };
  let limitante: Limitante = 'capital';
  for (const clave of Object.keys(limites) as Limitante[]) {
    if (limites[clave] < limites[limitante]) limitante = clave;
  }
  return { unidades: Math.max(0, limites[limitante]), limitante, limites };
}
