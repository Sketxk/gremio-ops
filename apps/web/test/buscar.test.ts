import { describe, expect, it } from 'vitest';
import {
  MERCADO_NEGRO,
  filtrar,
  indexar,
  interpretarBusqueda,
  normalizar,
  resumir,
  type ItemBuscable,
} from '../src/buscar';
import type { PrecioCiudad } from '../src/precios';

const items: ItemBuscable[] = [
  {
    id: 'T4_2H_LONGBOW',
    nombre: 'Arco largo del adepto',
    tier: 4,
    encantamiento: 0,
    grupo: 'arcos',
  },
  {
    id: 'T4_2H_LONGBOW@1',
    nombre: 'Arco largo del adepto',
    tier: 4,
    encantamiento: 1,
    grupo: 'arcos',
  },
  {
    id: 'T6_2H_LONGBOW@1',
    nombre: 'Arco largo del maestro',
    tier: 6,
    encantamiento: 1,
    grupo: 'arcos',
  },
  { id: 'T5_PLANKS', nombre: 'Tablas de cedro', tier: 5, encantamiento: 0, grupo: 'recursos' },
  {
    id: 'T4_POTION_HEAL',
    nombre: 'Poción curativa menor',
    tier: 4,
    encantamiento: 0,
    grupo: 'consumibles',
  },
  {
    id: 'TREASURE_CEREMONIAL_RARITY3',
    nombre: 'Corona dorada',
    tier: 6,
    encantamiento: 0,
    grupo: 'lujo',
  },
  {
    id: 'UNIQUE_CONSUMABLE_EVENT_HALLOWEEN_CANDY_2026',
    nombre: null,
    tier: null,
    encantamiento: 0,
    grupo: 'consumibles',
  },
];
const indice = indexar(items);
const ids = (texto: string, grupo: string | null = null) =>
  filtrar(indice, interpretarBusqueda(texto), grupo).map((i) => i.id);

describe('buscador', () => {
  it('ignora acentos y mayúsculas', () => {
    expect(normalizar('  Poción CURATIVA ')).toBe('pocion curativa');
    expect(ids('pocion')).toEqual(['T4_POTION_HEAL']);
  });

  it('separa tier y encantamiento del texto', () => {
    expect(interpretarBusqueda('arco largo 4.1')).toEqual({
      palabras: ['arco', 'largo'],
      tier: 4,
      encantamiento: 1,
    });
    expect(interpretarBusqueda('t6 @1')).toEqual({ palabras: [], tier: 6, encantamiento: 1 });
    expect(ids('arco largo 4.1')).toEqual(['T4_2H_LONGBOW@1']);
    expect(ids('arco t4')).toEqual(['T4_2H_LONGBOW', 'T4_2H_LONGBOW@1']);
    expect(ids('arco 6.1')).toEqual(['T6_2H_LONGBOW@1']);
  });

  it('busca también por ID, aunque el ítem no tenga nombre', () => {
    expect(ids('halloween')).toEqual(['UNIQUE_CONSUMABLE_EVENT_HALLOWEEN_CANDY_2026']);
    expect(ids('t5_planks')).toEqual(['T5_PLANKS']);
  });

  it('filtra por grupo', () => {
    expect(ids('', 'lujo')).toEqual(['TREASURE_CEREMONIAL_RARITY3']);
    expect(ids('arco', 'recursos')).toEqual([]);
  });

  it('búsqueda vacía regresa todo', () => {
    expect(ids('')).toHaveLength(items.length);
  });
});

describe('resumir', () => {
  const ahora = new Date('2026-10-29T12:00:00Z');
  const hace = (horas: number) => new Date(ahora.getTime() - horas * 3_600_000).toISOString();
  const precio = (venta: number | null, compra: number | null, horas = 0.5): PrecioCiudad => ({
    venta: venta === null ? null : { precio: venta, fecha: hace(horas) },
    compra: compra === null ? null : { precio: compra, fecha: hace(horas) },
  });

  it('elige la venta más barata y la compra más alta entre ciudades', () => {
    const r = resumir(
      {
        Lymhurst: precio(1900, 1700),
        Martlock: precio(1800, 1750),
        Caerleon: precio(2100, 1600),
      },
      ahora,
    );
    expect(r.masBarato).toEqual({ ciudad: 'Martlock', punto: { precio: 1800, fecha: hace(0.5) } });
    expect(r.mejorOferta?.ciudad).toBe('Martlock');
    expect(r.mercadoNegro).toBeNull();
  });

  it('el Mercado Negro va aparte y no cuenta como ciudad', () => {
    const r = resumir({ Lymhurst: precio(1900, 1700), [MERCADO_NEGRO]: precio(500, 3000) }, ahora);
    expect(r.masBarato?.ciudad).toBe('Lymhurst');
    expect(r.mejorOferta?.ciudad).toBe('Lymhurst');
    expect(r.mercadoNegro?.precio).toBe(3000);
  });

  it('ignora precios de más de 6 horas', () => {
    const r = resumir(
      {
        Lymhurst: precio(1000, 5000, 7),
        Martlock: precio(1800, 1750, 5),
        [MERCADO_NEGRO]: precio(null, 3000, 8),
      },
      ahora,
    );
    expect(r.masBarato?.ciudad).toBe('Martlock');
    expect(r.mejorOferta?.ciudad).toBe('Martlock');
    expect(r.mercadoNegro).toBeNull();
  });

  it('sin datos no inventa nada', () => {
    expect(resumir(undefined, ahora)).toEqual({
      masBarato: null,
      mejorOferta: null,
      mercadoNegro: null,
    });
  });
});
