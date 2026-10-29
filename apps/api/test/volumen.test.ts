import { describe, expect, it, vi } from 'vitest';
import lista from '../lista-seguimiento.json';
import { armarLotes, MAX_URL, UBICACIONES, type RegistroHistorial } from '../src/data-project.js';
import { actualizarVolumen, resumirHistorial, type SnapshotVolumen } from '../src/volumen.js';
import historialReal from './muestras/historial.json';

// Respuesta real de /api/v2/stats/history (T4_2H_LONGBOW y T5_PLANKS en Black Market y Lymhurst,
// time-scale=24, 2026-10-29 14:55 UTC).
const registros = historialReal as RegistroHistorial[];
const ahora = new Date('2026-10-29T15:00:00Z');

describe('lotes de historial', () => {
  const lotes = armarLotes(lista.ids, UBICACIONES, [1], Infinity, 'history');

  it('usa la ruta de historial con días completos y no pasa del límite de URL', () => {
    for (const lote of lotes) {
      expect(lote.url).toContain('/api/v2/stats/history/');
      expect(lote.url).toContain('&time-scale=24');
      expect(lote.url.length).toBeLessThanOrEqual(MAX_URL);
    }
    expect(lotes.flatMap((l) => l.ids)).toEqual(lista.ids);
  });
});

describe('resumirHistorial', () => {
  const volumen = resumirHistorial(registros, ahora, 7);

  it('usa solo los 7 días completos anteriores a hoy (22 al 28 de octubre)', () => {
    // Mercado Negro, arco largo T4: hay registro el 22, 23, 24, 25 y 26.
    expect(volumen['T4_2H_LONGBOW']?.['1']?.['Black Market']).toEqual({
      ventasDia: 679, // mediana de 669, 803, 607, 991 y 679
      precioMediano: 4499, // donde se cruza la mitad de las 3,749 unidades
      diasConDato: 5,
    });
  });

  it('descarta el día en curso aunque traiga ventas', () => {
    const conHoy: RegistroHistorial[] = [
      {
        location: 'Lymhurst',
        item_id: 'X',
        quality: 1,
        data: [
          { item_count: 10, avg_price: 100, timestamp: '2026-10-28T00:00:00' },
          { item_count: 9999, avg_price: 1, timestamp: '2026-10-29T00:00:00' },
        ],
      },
    ];
    expect(resumirHistorial(conHoy, ahora, 7)['X']?.['1']?.['Lymhurst']).toEqual({
      ventasDia: 10,
      precioMediano: 100,
      diasConDato: 1,
    });
  });

  it('sin ventas en la ventana no deja dato (no inventa un cero)', () => {
    const viejo: RegistroHistorial[] = [
      {
        location: 'Lymhurst',
        item_id: 'X',
        quality: 1,
        data: [{ item_count: 5, avg_price: 100, timestamp: '2026-10-01T00:00:00' }],
      },
    ];
    expect(resumirHistorial(viejo, ahora, 7)).toEqual({});
  });
});

describe('actualizarVolumen', () => {
  it('baja todos los lotes con pausa y guarda una vez', async () => {
    const guardados: SnapshotVolumen[] = [];
    const fetch = vi.fn(async () => new Response(JSON.stringify(registros), { status: 200 }));
    const esperar = vi.fn(async () => undefined);
    const snapshot = await actualizarVolumen(
      {
        fetch,
        esperar,
        ahora: () => ahora,
        almacen: { guardar: async (s) => void guardados.push(s) },
      },
      ['T4_2H_LONGBOW', 'T5_PLANKS'],
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(guardados).toHaveLength(1);
    expect(snapshot.dias).toBe(7);
    expect(snapshot.lotes).toEqual({ total: 1, fallidos: 0 });
    expect(Object.keys(snapshot.volumen).sort()).toEqual(['T4_2H_LONGBOW', 'T5_PLANKS']);
  });

  it('si fallan todos los lotes no escribe nada', async () => {
    const guardar = vi.fn(async () => undefined);
    await expect(
      actualizarVolumen(
        {
          fetch: async () => new Response('no', { status: 400, statusText: 'Bad Request' }),
          esperar: async () => undefined,
          ahora: () => ahora,
          almacen: { guardar },
        },
        ['T4_2H_LONGBOW'],
      ),
    ).rejects.toThrow('Fallaron los 1 lotes');
    expect(guardar).not.toHaveBeenCalled();
  });
});
