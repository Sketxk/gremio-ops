import { describe, expect, it } from 'vitest';
import { MERCADO_NEGRO } from '../src/buscar';
import {
  calcularCrafteo,
  mejorCiudad,
  precioMaterial,
  valorDelFoco,
  type BonoCiudad,
  type FichaCrafteo,
} from '../src/crafteo';
import bonos from '../src/datos/bonos.json';
import recetas from '../src/datos/recetas.json';
import type { PrecioCiudad } from '../src/precios';

const ciudades = bonos as BonoCiudad[];
const lymhurst = ciudades.find((c) => c.nombre === 'Lymhurst');
const fichas = recetas as Record<string, FichaCrafteo>;
const arcoLargo = fichas['T4_2H_LONGBOW'];
if (!lymhurst || !arcoLargo) throw new Error('Faltan datos generados');
const receta = arcoLargo.recetas[0];
if (!receta) throw new Error('El arco largo T4 no trae receta');

const ahora = new Date('2026-10-29T12:00:00Z');
const hace = (horas: number) => new Date(ahora.getTime() - horas * 3_600_000).toISOString();

describe('datos de crafteo', () => {
  it('el arco largo T4 se hace con 32 tablas T4 y es categoría arco', () => {
    expect(arcoLargo.categoria).toBe('bow');
    expect(arcoLargo.refinado).toBe(false);
    expect(receta.materiales).toEqual([{ id: 'T4_PLANKS', cantidad: 32, seRegresa: true }]);
  });

  it('la mejor ciudad para arcos es Lymhurst (+15%) y para tablas Fort Sterling (+40%)', () => {
    expect(mejorCiudad(arcoLargo, ciudades).nombre).toBe('Lymhurst');
    const tablas = fichas['T5_PLANKS'];
    if (!tablas) throw new Error('Faltan las tablas T5');
    expect(tablas.refinado).toBe(true);
    expect(mejorCiudad(tablas, ciudades).nombre).toBe('Fort Sterling');
  });
});

describe('calcularCrafteo', () => {
  const base = {
    ficha: arcoLargo,
    receta,
    ciudad: lymhurst,
    costoMaterial: { T4_PLANKS: 200 },
    tarifaEstacion: 100,
    venta: { precio: 9000, modo: 'instantanea' as const },
    premium: false,
  };

  it('sin foco: RRR de 18% + 15% y venta con 8% de impuesto', () => {
    const r = calcularCrafteo({ ...base, usarFoco: false });
    expect(r.rrr).toBeCloseTo(1 - 1 / 1.33, 10); // 24.8%
    expect(r.costo.ok && r.costo.porUnidad).toBeCloseTo(32 * 200 * (1 / 1.33) + 100, 6);
    expect(r.venta?.neto).toBe(8280);
    expect(r.gananciaUnidad).toBeCloseTo(8280 - (6400 / 1.33 + 100), 6);
  });

  it('con foco: suma 59% de bono y el valor del foco sale de comparar ambos', () => {
    const con = calcularCrafteo({ ...base, usarFoco: true });
    const sin = calcularCrafteo({ ...base, usarFoco: false });
    expect(con.rrr).toBeCloseTo(1 - 1 / 1.92, 10); // 47.9%
    const ahorro = 6400 / 1.33 - 6400 / 1.92;
    expect(valorDelFoco(con, sin, receta)).toBeCloseTo(ahorro / (receta.foco ?? 1), 10);
  });

  it('si falta el precio de un material no calcula nada', () => {
    const r = calcularCrafteo({ ...base, usarFoco: false, costoMaterial: { T4_PLANKS: null } });
    expect(r.costo).toEqual({ ok: false, sinPrecio: ['T4_PLANKS'] });
    expect(r.gananciaUnidad).toBeNull();
  });
});

describe('precioMaterial', () => {
  const precios: Record<string, PrecioCiudad> = {
    Lymhurst: { venta: { precio: 210, fecha: hace(1) }, compra: { precio: 190, fecha: hace(1) } },
    Martlock: { venta: { precio: 150, fecha: hace(8) }, compra: null }, // viejo: no cuenta
    Thetford: { venta: { precio: 205, fecha: hace(2) }, compra: { precio: 180, fecha: hace(2) } },
    [MERCADO_NEGRO]: { venta: { precio: 1, fecha: hace(1) }, compra: null }, // no es ciudad
  };

  it('elige la ciudad más barata con precio reciente', () => {
    expect(precioMaterial(precios, 'instantanea', null, ahora)).toMatchObject({
      costo: 205,
      ciudad: 'Thetford',
    });
  });

  it('en una ciudad fija usa solo esa', () => {
    expect(precioMaterial(precios, 'instantanea', 'Lymhurst', ahora)?.costo).toBe(210);
    expect(precioMaterial(precios, 'instantanea', 'Martlock', ahora)).toBeNull();
  });

  it('poniendo orden: la mejor oferta más 2.5%', () => {
    const elegido = precioMaterial(precios, 'orden', null, ahora);
    expect(elegido?.ciudad).toBe('Thetford');
    expect(elegido?.costo).toBeCloseTo(184.5, 10);
  });
});
