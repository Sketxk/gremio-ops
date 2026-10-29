import { describe, expect, it } from 'vitest';
import { costoCompra, ingresoVenta, rrr } from '../src/index.js';

/**
 * Ejemplos con números publicados en guías externas, consultadas el 2026-10-29. Sirven como
 * verificación independiente de las fórmulas, además de las constantes leídas de ao-bin-dumps.
 * Si un parche cambia algo y estas pruebas fallan, revisar la fuente antes de "arreglar" el motor.
 */
describe('casos publicados', () => {
  // albionmarket.gg/guides/black-market-flipping (9 jul 2026): comprar a 100,000 y vender al
  // Mercado Negro en 130,000. "you keep 130,000 × 0.92 = 119,600. Profit is 19,600";
  // con premium "you keep 124,800, for 24,800 profit".
  it('venta al Mercado Negro: 8% sin premium, 4% con premium, sin comisión', () => {
    expect(ingresoVenta(130_000, 'instantanea', false).neto - 100_000).toBe(19_600);
    expect(ingresoVenta(130_000, 'instantanea', true).neto - 100_000).toBe(24_800);
  });

  // albiononlinegrind.com/guides/market-flipping-guide (act. 26 ago 2026): orden de compra de
  // 10,000,000 → "the fee would be 250,000 silver (10,000,000 + 250,000 = 10,250,000)".
  it('orden de compra: 2.5% de comisión', () => {
    expect(costoCompra(10_000_000, 'orden')).toEqual({ total: 10_250_000, comision: 250_000 });
  });

  // Misma guía: orden de venta con premium = "2.5% sell order fee and 4% tax", "total fee of 6.5%";
  // sin premium "10.5%".
  it('orden de venta: comisión + impuesto = 6.5% con premium, 10.5% sin premium', () => {
    expect(ingresoVenta(349_000, 'orden', true).neto).toBeCloseTo(349_000 * 0.935, 6);
    expect(ingresoVenta(349_000, 'orden', false).neto).toBeCloseTo(349_000 * 0.895, 6);
  });

  // albionmarket.gg/guides/best-refining-city-setup (9 jul 2026): "RRR = bonus / (1 + bonus)",
  // tabla: ~0.18 → ~15.3%; ciudad de bono ~0.58 → ~36.7%; ciudad de bono + foco ~1.17 → ~53.9%.
  it('RRR: misma fórmula y mismos porcentajes que la tabla publicada', () => {
    expect(rrr([0.18]) * 100).toBeCloseTo(15.3, 1);
    expect(rrr([0.18, 0.4]) * 100).toBeCloseTo(36.7, 1);
    expect(rrr([0.18, 0.4, 0.59]) * 100).toBeCloseTo(53.9, 1);
  });
});
