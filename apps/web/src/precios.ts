/** Forma del snapshot que sirve /api/precios (ver apps/api/src/snapshot.ts). */
export interface Punto {
  precio: number;
  fecha: string;
}

export interface PrecioCiudad {
  venta: Punto | null;
  compra: Punto | null;
}

export interface Snapshot {
  version: 1;
  generado: string;
  ubicaciones: string[];
  calidades: number[];
  lotes: { total: number; fallidos: number };
  precios: Record<string, Record<string, Record<string, PrecioCiudad>>>;
}

export class SinSnapshot extends Error {}

export async function traerPrecios(): Promise<Snapshot> {
  const res = await fetch('/api/precios');
  if (res.status === 503) throw new SinSnapshot();
  if (!res.ok) throw new Error(`/api/precios respondió ${res.status}`);
  return (await res.json()) as Snapshot;
}
