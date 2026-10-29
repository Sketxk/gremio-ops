import { describe, expect, it } from 'vitest';
import { AJUSTES_INICIALES } from '../src/ajustes';
import { MERCADO_NEGRO } from '../src/buscar';
import { esConfiable, oportunidades, type AjustesRadar } from '../src/radar';
import type { PrecioCiudad, Volumen } from '../src/precios';

const ahora = new Date('2026-10-29T12:00:00Z');
const hace = (horas: number) => new Date(ahora.getTime() - horas * 3_600_000).toISOString();
const ciudad = (venta: number | null, compra: number | null, horas = 0.5): PrecioCiudad => ({
  venta: venta === null ? null : { precio: venta, fecha: hace(horas) },
  compra: compra === null ? null : { precio: compra, fecha: hace(horas) },
});

const ajustes: AjustesRadar = { ...AJUSTES_INICIALES }; // 100,000 de plata, sin premium, 10%
const precios: Record<string, PrecioCiudad> = {
  Lymhurst: ciudad(1882, 1785),
  Caerleon: ciudad(2500, 2300),
  Martlock: ciudad(5000, 4000), // más caro que lo que paga el Mercado Negro: no deja ganancia
  [MERCADO_NEGRO]: ciudad(null, 4300),
};
const volumen: Record<string, Volumen> = {
  [MERCADO_NEGRO]: { ventasDia: 679, precioMediano: 4499, diasConDato: 5 },
};
const calcular = (cambios: Partial<AjustesRadar> = {}, p = precios, v = volumen) =>
  oportunidades({ porCiudad: p, volumen: v, peso: 3, ajustes: { ...ajustes, ...cambios }, ahora });

describe('radar del Mercado Negro', () => {
  it('descuenta el 8% sin premium y respeta la regla de exposición al viajar', () => {
    const lym = calcular().find((o) => o.ciudad === 'Lymhurst');
    // Vender a 4,300 sin premium: 4,300 − 344 = 3,956 limpios por unidad.
    expect(lym?.ingresoUnidad).toBe(3956);
    expect(lym?.impuestoUnidad).toBe(344);
    // Comprar al instante no cobra comisión.
    expect(lym?.costoUnidad).toBe(1882);
    expect(lym?.gananciaUnidad).toBe(2074);
    // 10% de 100,000 = 10,000 por viaje → 5 arcos de 1,882.
    expect(lym?.unidades).toBe(5);
    expect(lym?.limitante).toBe('exposicion');
    expect(lym?.inversion).toBe(9410);
    expect(lym?.gananciaSiLlegas).toBe(10370);
    expect(lym?.gananciaEsperada).toBe(10370);
  });

  it('comprar en Caerleon no es viaje: usa todo el capital y queda primero', () => {
    const [primera] = calcular();
    expect(primera?.ciudad).toBe('Caerleon');
    expect(primera?.viaje).toBe(false);
    expect(primera?.unidades).toBe(40); // 100,000 / 2,500
    expect(primera?.limitante).toBe('capital');
    expect(primera?.gananciaEsperada).toBe(3956 * 40 - 100_000);
  });

  it('con premium el impuesto baja a 4%', () => {
    const lym = calcular({ premium: true }).find((o) => o.ciudad === 'Lymhurst');
    expect(lym?.ingresoUnidad).toBe(4300 - 172);
  });

  it('poner orden de compra usa la mejor oferta más 2.5% de comisión', () => {
    const lym = calcular({ modoCompra: 'orden' }).find((o) => o.ciudad === 'Lymhurst');
    expect(lym?.compra.precio).toBe(1785);
    expect(lym?.costoUnidad).toBeCloseTo(1785 * 1.025, 6);
    expect(lym?.comisionUnidad).toBeCloseTo(44.625, 6);
  });

  it('el riesgo de morir baja la ganancia esperada', () => {
    const lym = calcular({ riesgoViaje: 0.1, costoSet: 20_000 }).find(
      (o) => o.ciudad === 'Lymhurst',
    );
    // 0.9 × 19,780 − 9,410 − 0.1 × 20,000
    expect(lym?.gananciaEsperada).toBeCloseTo(6392, 6);
    expect(lym?.gananciaSiLlegas).toBe(10370);
  });

  it('no compra más de lo que el Mercado Negro absorbe en los días que elijas', () => {
    const poco = { [MERCADO_NEGRO]: { ventasDia: 12, precioMediano: 4400, diasConDato: 7 } };
    const [primera] = calcular({ capital: 10_000_000, miembros: 3 }, precios, poco);
    expect(primera?.unidades).toBe(4); // 12 al día entre 3 del gremio
    expect(primera?.limitante).toBe('mercado');
  });

  it('respeta la carga de la montura', () => {
    const [primera] = calcular({ carga: 30 });
    expect(primera?.unidades).toBe(10); // 30 kg / 3 kg
    expect(primera?.limitante).toBe('carga');
  });

  it('ignora precios viejos y no inventa oportunidades', () => {
    expect(calcular({}, { ...precios, [MERCADO_NEGRO]: ciudad(null, 4300, 7) })).toEqual([]);
    expect(calcular({}, { [MERCADO_NEGRO]: ciudad(null, 4300) })).toEqual([]);
    expect(oportunidades({ porCiudad: undefined, volumen, peso: 3, ajustes, ahora })).toEqual([]);
  });

  it('marca precios raros y lo que no tiene volumen como no confiable', () => {
    const [caro] = calcular({}, { ...precios, [MERCADO_NEGRO]: ciudad(null, 9000) });
    expect(caro?.raro.mercadoNegro).toBe(true); // el doble de su mediana de 7 días
    expect(caro && esConfiable(caro)).toBe(false);

    const [sinVolumen] = calcular({}, precios, {});
    expect(sinVolumen?.volumenMercadoNegro).toBeNull();
    expect(sinVolumen && esConfiable(sinVolumen)).toBe(false);

    const [normal] = calcular();
    expect(normal && esConfiable(normal)).toBe(true);
  });
});
