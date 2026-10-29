import { describe, expect, it, vi } from 'vitest';
import lista from '../lista-seguimiento.json';
import {
  actualizarPrecios,
  CLAVE_SNAPSHOT,
  indicePorcion,
  INTERVALO_CRON_MS,
  lotesSeguimiento,
  MAX_IDS_POR_LOTE,
  type Entorno,
} from '../src/cron.js';
import {
  armarLotes,
  descargarLote,
  MAX_URL,
  UBICACIONES,
  type Fetch,
  type RegistroApi,
} from '../src/data-project.js';
import { construirSnapshot, punto, tablaDesdeRegistros, type Snapshot } from '../src/snapshot.js';
import respuestaReal from './muestras/precios.json';

// Respuesta real de west.albion-online-data.com (T4_2H_LONGBOW y T4_PLANKS, 2026-10-28 08:09 UTC).
const registros = respuestaReal as RegistroApi[];

describe('armarLotes', () => {
  const lotes = armarLotes(lista.ids, UBICACIONES, [1]);

  it('ninguna URL pasa del límite de la API', () => {
    for (const lote of lotes) expect(lote.url.length).toBeLessThanOrEqual(MAX_URL);
  });

  it('cubre toda la lista sin repetir', () => {
    expect(lotes.flatMap((l) => l.ids)).toEqual(lista.ids);
  });

  it('respeta el máximo de ítems por lote', () => {
    const porciones = lotesSeguimiento();
    for (const lote of porciones) expect(lote.ids.length).toBeLessThanOrEqual(MAX_IDS_POR_LOTE);
    expect(porciones.flatMap((l) => l.ids)).toEqual(lista.ids);
  });

  it('pide las ubicaciones con el nombre exacto de la API', () => {
    expect(lotes[0]?.url).toContain('locations=Lymhurst,Fort%20Sterling,');
    expect(lotes[0]?.url).toContain('Black%20Market&qualities=1');
  });
});

describe('punto', () => {
  it('precio 0 o fecha del año 1 es "sin dato", nunca un precio', () => {
    expect(punto(0, '0001-01-01T00:00:00')).toBeNull();
    expect(punto(3476, '0001-01-01T00:00:00')).toBeNull();
  });

  it('marca la fecha como UTC', () => {
    expect(punto(3476, '2026-10-28T04:35:00')).toEqual({
      precio: 3476,
      fecha: '2026-10-28T04:35:00Z',
    });
  });
});

describe('tablaDesdeRegistros', () => {
  const tabla = tablaDesdeRegistros(registros);

  it('guarda la orden de compra del Mercado Negro', () => {
    expect(tabla['T4_2H_LONGBOW']?.['1']?.['Black Market']).toEqual({
      venta: null,
      compra: { precio: 3476, fecha: '2026-10-28T04:35:00Z' },
    });
  });

  it('omite ciudades sin ningún dato', () => {
    expect(tabla['T4_2H_LONGBOW']?.['1']?.['Martlock']).toBeUndefined();
    expect(Object.keys(tabla['T4_PLANKS']?.['1'] ?? {}).sort()).toEqual([
      'Bridgewatch',
      'Caerleon',
      'Fort Sterling',
      'Lymhurst',
      'Thetford',
    ]);
  });
});

describe('construirSnapshot', () => {
  const nuevos = tablaDesdeRegistros(registros);
  const anterior: Snapshot = {
    version: 1,
    generado: '2026-10-28T07:00:00.000Z',
    ubicaciones: [...UBICACIONES],
    calidades: [1],
    porcion: { indice: 0, total: 1 },
    precios: {
      T4_PLANKS: {
        '1': { Martlock: { venta: { precio: 1, fecha: '2026-10-28T06:00:00Z' }, compra: null } },
      },
      T5_PLANKS: {
        '1': { Lymhurst: { venta: { precio: 2, fecha: '2026-10-28T06:00:00Z' }, compra: null } },
      },
      T9_FUERA_DE_LA_LISTA: {},
    },
  };
  const snapshot = construirSnapshot({
    ids: ['T4_2H_LONGBOW', 'T4_PLANKS', 'T5_PLANKS'],
    idsActualizados: new Set(['T4_2H_LONGBOW', 'T4_PLANKS']),
    nuevos,
    anterior,
    ubicaciones: UBICACIONES,
    calidades: [1],
    porcion: { indice: 0, total: 2 },
    ahora: new Date('2026-10-28T08:10:00Z'),
  });

  it('lo descargado reemplaza por completo lo anterior', () => {
    expect(snapshot.precios['T4_PLANKS']).toEqual(nuevos['T4_PLANKS']);
  });

  it('lo que no tocaba en esta corrida conserva el dato anterior con su fecha original', () => {
    expect(snapshot.precios['T5_PLANKS']).toEqual(anterior.precios['T5_PLANKS']);
  });

  it('descarta lo que ya no está en la lista', () => {
    expect(snapshot.precios['T9_FUERA_DE_LA_LISTA']).toBeUndefined();
  });
});

describe('descargarLote', () => {
  const lote = { url: 'https://ejemplo/precios.json', ids: ['T4_PLANKS'] };
  const esperar = vi.fn(async () => {});
  // 08:14:24 UTC, como en el bloqueo real observado.
  const ahora = () => new Date('2026-10-28T08:14:24Z');

  it('reintenta con espera progresiva ante 429 y respeta Retry-After', async () => {
    const respuestas = [
      new Response('', { status: 429, headers: { 'Retry-After': '7' } }),
      new Response('', { status: 503 }),
      Response.json(registros),
    ];
    const fetchFn: Fetch = vi.fn(async () => respuestas.shift() as Response);
    esperar.mockClear();
    await expect(descargarLote(lote, fetchFn, esperar, ahora)).resolves.toHaveLength(16);
    expect(esperar.mock.calls).toEqual([[7000], [4000]]);
  });

  it('espera hasta ratelimit-reset si es menos de un minuto', async () => {
    const respuestas = [
      // Cabeceras reales de un 429: se libera a las 08:15:00 UTC.
      new Response('', {
        status: 429,
        headers: {
          'ratelimit-limit': '1',
          'ratelimit-remaining': '0',
          'ratelimit-reset': '1793175300',
        },
      }),
      Response.json(registros),
    ];
    esperar.mockClear();
    await descargarLote(lote, async () => respuestas.shift() as Response, esperar, ahora);
    expect(esperar.mock.calls).toEqual([[36_000]]);
  });

  it('se rinde de inmediato si la API pide esperar varios minutos', async () => {
    const fetchFn = vi.fn<Fetch>(
      async () =>
        // Se libera a las 08:20:00 UTC: casi 6 minutos.
        new Response('', { status: 429, headers: { 'ratelimit-reset': '1793175600' } }),
    );
    await expect(descargarLote(lote, fetchFn, esperar, ahora)).rejects.toThrow(/esperar 336 s/);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('manda User-Agent propio', async () => {
    const fetchFn = vi.fn<Fetch>(async () => Response.json([]));
    await descargarLote(lote, fetchFn, esperar, ahora);
    const init = fetchFn.mock.calls[0]?.[1];
    expect(new Headers(init?.headers).get('User-Agent')).toMatch(/^gremio-ops/);
  });

  it('no reintenta un 404', async () => {
    const fetchFn = vi.fn<Fetch>(async () => new Response('', { status: 404 }));
    await expect(descargarLote(lote, fetchFn, esperar, ahora)).rejects.toThrow(/404/);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('rechaza una respuesta con forma inesperada', async () => {
    const fetchFn: Fetch = async () => Response.json([{ item_id: 'X' }]);
    await expect(descargarLote(lote, fetchFn, esperar, ahora)).rejects.toThrow(/forma inesperada/);
  });
});

describe('actualizarPrecios', () => {
  function kvFalso() {
    const datos = new Map<string, string>();
    const kv = {
      get: vi.fn(async (clave: string) => {
        const valor = datos.get(clave);
        return valor === undefined ? null : (JSON.parse(valor) as unknown);
      }),
      put: vi.fn(async (clave: string, valor: string) => {
        datos.set(clave, valor);
      }),
    };
    return { kv, datos, env: { PRECIOS: kv as unknown as KVNamespace } satisfies Entorno };
  }
  const deps = (fetchFn: Fetch) => ({
    fetch: fetchFn,
    esperar: async () => {},
    ahora: () => new Date('2026-10-28T08:10:00Z'),
  });

  const momento = (porcion: number) => new Date(porcion * INTERVALO_CRON_MS);
  const lotes = lotesSeguimiento();

  it('las porciones se turnan en orden según la hora programada', () => {
    expect(lotes.length).toBeGreaterThan(1);
    expect(lotes.map((_, i) => indicePorcion(momento(i), lotes.length))).toEqual(
      lotes.map((_, i) => i),
    );
    expect(indicePorcion(momento(lotes.length), lotes.length)).toBe(0);
  });

  it('cada corrida pide una sola porción y escribe un solo snapshot', async () => {
    const { kv, datos, env } = kvFalso();
    const fetchFn = vi.fn<Fetch>(async () => Response.json(registros));
    await actualizarPrecios(env, deps(fetchFn), momento(0));
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0]?.[0]).toBe(lotes[0]?.url);
    expect(kv.put).toHaveBeenCalledTimes(1);
    const guardado = JSON.parse(datos.get(CLAVE_SNAPSHOT) ?? '{}') as Snapshot;
    expect(guardado.porcion).toEqual({ indice: 0, total: lotes.length });
    expect(guardado.precios['T4_2H_LONGBOW']?.['1']?.['Black Market']?.compra?.precio).toBe(3476);
  });

  it('la siguiente porción conserva lo que trajo la anterior', async () => {
    const { datos, env } = kvFalso();
    await actualizarPrecios(
      env,
      deps(async () => Response.json(registros)),
      momento(0),
    );
    await actualizarPrecios(
      env,
      deps(async () => Response.json([])),
      momento(1),
    );
    const guardado = JSON.parse(datos.get(CLAVE_SNAPSHOT) ?? '{}') as Snapshot;
    expect(guardado.porcion.indice).toBe(1);
    // T4_2H_LONGBOW vino en la porción 0 y no se pierde al actualizar la 1.
    expect(lotes[0]?.ids).toContain('T4_2H_LONGBOW');
    expect(guardado.precios['T4_2H_LONGBOW']?.['1']?.['Black Market']?.compra?.precio).toBe(3476);
  });

  it('si la descarga falla no toca el snapshot anterior', async () => {
    const { kv, env } = kvFalso();
    await expect(
      actualizarPrecios(
        env,
        deps(async () => new Response('', { status: 500 })),
        momento(0),
      ),
    ).rejects.toThrow(/falló tras 3 intentos/);
    expect(kv.put).not.toHaveBeenCalled();
  });
});
