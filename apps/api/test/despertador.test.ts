import { describe, expect, it, vi } from 'vitest';
import { snapshotReciente } from '../src/actualizar.js';
import { despertarDescarga, type FetchGithub } from '../src/despertador.js';
import type { Snapshot } from '../src/snapshot.js';

describe('despertarDescarga', () => {
  it('habilita el workflow y luego lo lanza en main', async () => {
    const fetchFn = vi.fn<FetchGithub>(async () => new Response(null, { status: 204 }));
    await despertarDescarga('token-falso', fetchFn);
    const [habilitar, lanzar] = fetchFn.mock.calls;
    expect(habilitar?.[0]).toBe(
      'https://api.github.com/repos/Sketxk/gremio-ops/actions/workflows/precios.yml/enable',
    );
    expect(habilitar?.[1].method).toBe('PUT');
    expect(lanzar?.[0]).toBe(
      'https://api.github.com/repos/Sketxk/gremio-ops/actions/workflows/precios.yml/dispatches',
    );
    expect(lanzar?.[1].method).toBe('POST');
    expect(lanzar?.[1].body).toBe('{"ref":"main"}');
    expect(new Headers(lanzar?.[1].headers).get('Authorization')).toBe('Bearer token-falso');
  });

  it('si GitHub rechaza el token, falla con el motivo (no se queda callado)', async () => {
    const fetchFn: FetchGithub = async () => new Response('Bad credentials', { status: 401 });
    await expect(despertarDescarga('malo', fetchFn)).rejects.toThrow(/401.*Bad credentials/);
  });
});

describe('snapshotReciente', () => {
  const ahora = new Date('2026-10-29T12:00:00Z');
  const con = (generado: string) => ({ generado }) as Snapshot;

  it('se salta la descarga si el snapshot tiene menos de 10 minutos', () => {
    expect(snapshotReciente(con('2026-10-29T11:55:00Z'), ahora)).toBe(true);
    expect(snapshotReciente(con('2026-10-29T11:49:00Z'), ahora)).toBe(false);
    expect(snapshotReciente(null, ahora)).toBe(false);
  });
});
