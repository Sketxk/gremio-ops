function validarProbabilidad(p: number): void {
  if (p < 0 || p > 1) throw new Error(`Probabilidad fuera de rango: ${p}`);
}

/** Probabilidad de morir al cruzar varias zonas: `p = 1 − (1 − p1)(1 − p2)…`. */
export function probabilidadCombinada(probabilidades: readonly number[]): number {
  return (
    1 -
    probabilidades.reduce((sobrevivir, p) => {
      validarProbabilidad(p);
      return sobrevivir * (1 - p);
    }, 1)
  );
}

export interface EntradaViaje {
  /** Probabilidad de morir en el viaje. */
  p: number;
  /** Lo que recibes al vender, ya sin impuestos. */
  ingresoNeto: number;
  /** Lo que pagaste por la carga. */
  inversion: number;
  /** Lo que cuesta reponer tu equipo si mueres. */
  costoSet: number;
}

/** Valor esperado: `EV = (1 − p)·V_neto − I − p·S`. */
export function valorEsperadoViaje({ p, ingresoNeto, inversion, costoSet }: EntradaViaje): number {
  validarProbabilidad(p);
  return (1 - p) * ingresoNeto - inversion - p * costoSet;
}

/** Plata máxima que conviene arriesgar en un viaje según la regla de exposición. */
export function limiteExposicion(banco: number, fraccionMax: number): number {
  validarProbabilidad(fraccionMax);
  return banco * fraccionMax;
}
