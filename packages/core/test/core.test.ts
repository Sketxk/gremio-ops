import { describe, expect, it } from 'vitest';
import {
  costoCompra,
  costoCrafteo,
  desviacion,
  frescura,
  ingresoVenta,
  limiteExposicion,
  medianaPonderada,
  plataPorHora,
  probabilidadCombinada,
  rrr,
  tamanoPosicion,
  valorEsperadoViaje,
  valorFoco,
} from '../src/index.js';

// Los precios de estas pruebas son entradas de ejemplo para comprobar la aritmética, no datos del juego.

describe('mercado', () => {
  it('comprar de una orden de venta no cobra extra', () => {
    expect(costoCompra(1000, 'instantanea')).toEqual({ total: 1000, comision: 0 });
  });

  it('poner orden de compra cobra 2.5%', () => {
    expect(costoCompra(1000, 'orden')).toEqual({ total: 1025, comision: 25 });
  });

  it('vender a orden de compra o al Mercado Negro paga solo impuesto', () => {
    expect(ingresoVenta(10_000, 'instantanea', true)).toEqual({
      neto: 9600,
      impuesto: 400,
      comision: 0,
    });
    expect(ingresoVenta(10_000, 'instantanea', false).neto).toBe(9200);
  });

  it('poner orden de venta paga impuesto y comisión', () => {
    expect(ingresoVenta(10_000, 'orden', false)).toEqual({
      neto: 8950,
      impuesto: 800,
      comision: 250,
    });
  });
});

describe('rrr', () => {
  it('cuadra con las referencias del plan (~15%, ~37%, ~54%)', () => {
    expect(rrr([0.18])).toBeCloseTo(0.1525, 4); // ciudad real sin especialidad
    expect(rrr([0.18, 0.4])).toBeCloseTo(0.3671, 4); // refinando en ciudad de especialidad
    expect(rrr([0.18, 0.4, 0.59])).toBeCloseTo(0.5392, 4); // + foco
  });

  it('sin bonos no regresa nada', () => {
    expect(rrr([])).toBe(0);
  });
});

describe('costoCrafteo', () => {
  const base = { tarifaEstacion: 10, descuentoDiarios: 0, cantidadProducida: 1 };

  it('aplica el RRR a lo que se regresa y suma la tarifa', () => {
    const r = costoCrafteo({
      ...base,
      rrr: 0.5,
      materiales: [
        { id: 'T4_WOOD', cantidad: 2, seRegresa: true, precio: 100 },
        { id: 'T3_PLANKS', cantidad: 1, seRegresa: true, precio: 200 },
      ],
    });
    expect(r).toMatchObject({ ok: true, total: 210, porUnidad: 210 });
  });

  it('cobra completo lo que el RRR no regresa (artefactos)', () => {
    const r = costoCrafteo({
      ...base,
      tarifaEstacion: 0,
      rrr: 0.5,
      materiales: [
        { id: 'T4_PLANKS', cantidad: 4, seRegresa: true, precio: 300 },
        { id: 'T4_ARTEFACT', cantidad: 1, seRegresa: false, precio: 1000 },
      ],
    });
    expect(r).toMatchObject({ ok: true, total: 1600 });
  });

  it('reparte el costo entre las unidades producidas', () => {
    const r = costoCrafteo({
      ...base,
      tarifaEstacion: 0,
      rrr: 0,
      cantidadProducida: 10,
      materiales: [{ id: 'X', cantidad: 5, seRegresa: true, precio: 100 }],
    });
    expect(r).toMatchObject({ ok: true, total: 500, porUnidad: 50 });
  });

  it('no calcula si falta un precio, y dice cuál', () => {
    const r = costoCrafteo({
      ...base,
      rrr: 0.3,
      materiales: [
        { id: 'T4_WOOD', cantidad: 2, seRegresa: true, precio: 100 },
        { id: 'T3_PLANKS', cantidad: 1, seRegresa: true, precio: null },
      ],
    });
    expect(r).toEqual({ ok: false, sinPrecio: ['T3_PLANKS'] });
  });
});

describe('foco', () => {
  it('plata extra por punto de foco', () => {
    expect(valorFoco(5000, 2000, 1000)).toBe(3);
  });
});

describe('riesgo', () => {
  it('combina la probabilidad de morir en varias zonas', () => {
    expect(probabilidadCombinada([0.1, 0.2])).toBeCloseTo(0.28, 10);
  });

  it('valor esperado de un viaje', () => {
    expect(
      valorEsperadoViaje({ p: 0.1, ingresoNeto: 120_000, inversion: 100_000, costoSet: 50_000 }),
    ).toBeCloseTo(3000, 6);
  });

  it('regla de exposición', () => {
    expect(limiteExposicion(1_000_000, 0.1)).toBe(100_000);
  });
});

describe('precios', () => {
  it('la mediana ponderada ignora una venta suelta inflada', () => {
    expect(
      medianaPonderada([
        { precio: 100, volumen: 1 },
        { precio: 200, volumen: 10 },
        { precio: 1000, volumen: 1 },
      ]),
    ).toBe(200);
  });

  it('sin ventas no hay mediana', () => {
    expect(medianaPonderada([{ precio: 100, volumen: 0 }])).toBeNull();
  });

  it('desviación contra la referencia', () => {
    expect(desviacion(130, 100)).toBeCloseTo(0.3, 10);
  });

  it('frescura: verde < 1 h, amarillo 1–6 h, rojo > 6 h', () => {
    const ahora = new Date('2026-10-28T12:00:00Z');
    const hace = (min: number) => new Date(ahora.getTime() - min * 60_000);
    expect(frescura(hace(30), ahora)).toBe('verde');
    expect(frescura(hace(60), ahora)).toBe('amarillo');
    expect(frescura(hace(360), ahora)).toBe('amarillo');
    expect(frescura(hace(361), ahora)).toBe('rojo');
  });
});

describe('sesión', () => {
  it('plata por hora con todo el tiempo invertido', () => {
    expect(plataPorHora(30_000, { compra: 10, transporte: 20, crafteo: 0, venta: 30 })).toBe(
      30_000,
    );
  });

  it('tamaño de posición: gana el límite más estricto', () => {
    const r = tamanoPosicion({
      capital: 1_000_000,
      precioUnitario: 10_000,
      pesoUnitario: 6.8,
      cargaDisponible: 500,
      exposicionMax: 300_000,
      volumenDiario: 40,
      diasParaVender: 2,
      miembros: 2,
    });
    expect(r.limites).toEqual({ capital: 100, carga: 73, exposicion: 30, mercado: 40 });
    expect(r).toMatchObject({ unidades: 30, limitante: 'exposicion' });
  });
});
