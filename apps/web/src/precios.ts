import { useQuery } from '@tanstack/react-query';

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

/** Resumen diario de ventas que sirve /api/volumen (ver apps/api/src/volumen.ts). */
export interface Volumen {
  ventasDia: number;
  precioMediano: number;
  diasConDato: number;
}

export interface SnapshotVolumen {
  version: 1;
  generado: string;
  dias: number;
  calidades: number[];
  lotes: { total: number; fallidos: number };
  volumen: Record<string, Record<string, Record<string, Volumen>>>;
}

export class SinSnapshot extends Error {}

export async function traerPrecios(): Promise<Snapshot> {
  const res = await fetch('/api/precios');
  if (res.status === 503) throw new SinSnapshot();
  if (!res.ok) throw new Error(`/api/precios respondió ${res.status}`);
  return (await res.json()) as Snapshot;
}

/** Un solo snapshot para toda la app; se vuelve a pedir cada minuto (el Worker lo cachea 60 s). */
export function usePrecios() {
  return useQuery({
    queryKey: ['precios'],
    queryFn: traerPrecios,
    refetchInterval: 60_000,
    retry: (intentos, error) => !(error instanceof SinSnapshot) && intentos < 2,
  });
}

/** Volumen de 7 días; null si todavía no hay (la app sigue funcionando y lo avisa). */
export async function traerVolumen(): Promise<SnapshotVolumen | null> {
  const res = await fetch('/api/volumen');
  if (res.status === 503) return null;
  if (!res.ok) throw new Error(`/api/volumen respondió ${res.status}`);
  return (await res.json()) as SnapshotVolumen;
}

export function useVolumen() {
  return useQuery({
    queryKey: ['volumen'],
    queryFn: traerVolumen,
    staleTime: 30 * 60_000,
    refetchInterval: 60 * 60_000,
  });
}

export function minutosDesde(fecha: string, ahora: Date): number {
  return (ahora.getTime() - new Date(fecha).getTime()) / 60_000;
}
