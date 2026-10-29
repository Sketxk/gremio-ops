/** Tasa de retorno de recursos: `RRR = 1 − 1 / (1 + B)`, con B = suma de bonos de producción. */
export function rrr(bonos: readonly number[]): number {
  const total = bonos.reduce((suma, b) => suma + b, 0);
  if (total < 0) throw new Error(`La suma de bonos no puede ser negativa (${total})`);
  return 1 - 1 / (1 + total);
}

export interface MaterialConPrecio {
  id: string;
  cantidad: number;
  /** false si el RRR no regresa este material (artefactos, fichas). */
  seRegresa: boolean;
  /** null si no hay precio: el costo no se calcula. */
  precio: number | null;
}

export interface EntradaCrafteo {
  materiales: readonly MaterialConPrecio[];
  rrr: number;
  /** Lo que cobra la estación por usarla, en plata. */
  tarifaEstacion: number;
  /** Plata que te ahorran los bonos diarios, si aplica. */
  descuentoDiarios: number;
  /** Unidades que produce la receta. */
  cantidadProducida: number;
}

export interface LineaCosto {
  id: string;
  /** Cantidad que de verdad se consume después del retorno. */
  cantidadEfectiva: number;
  subtotal: number;
}

export type CostoCrafteo =
  | { ok: true; total: number; porUnidad: number; lineas: LineaCosto[] }
  | { ok: false; sinPrecio: string[] };

/** `C = Σ qᵢ·pᵢ·(1 − RRR) + T_estación − D_diarios`; lo que no se regresa cuenta completo. */
export function costoCrafteo(entrada: EntradaCrafteo): CostoCrafteo {
  if (entrada.rrr < 0 || entrada.rrr >= 1) throw new Error(`RRR fuera de rango: ${entrada.rrr}`);
  if (entrada.cantidadProducida <= 0) throw new Error('La receta debe producir al menos 1');

  const sinPrecio = entrada.materiales.filter((m) => m.precio === null).map((m) => m.id);
  if (sinPrecio.length > 0) return { ok: false, sinPrecio };

  const lineas = entrada.materiales.map((m) => {
    const cantidadEfectiva = m.seRegresa ? m.cantidad * (1 - entrada.rrr) : m.cantidad;
    return { id: m.id, cantidadEfectiva, subtotal: cantidadEfectiva * (m.precio ?? 0) };
  });
  const total =
    lineas.reduce((suma, l) => suma + l.subtotal, 0) +
    entrada.tarifaEstacion -
    entrada.descuentoDiarios;
  return { ok: true, total, porUnidad: total / entrada.cantidadProducida, lineas };
}

/** Plata extra que te deja cada punto de foco. */
export function valorFoco(gananciaConFoco: number, gananciaSinFoco: number, foco: number): number {
  if (foco <= 0) throw new Error('El foco gastado debe ser mayor a 0');
  return (gananciaConFoco - gananciaSinFoco) / foco;
}
