import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ItemSchema } from '../src/esquema.js';
import { idMercado, indexarNombres, parsearItems } from '../src/parsear.js';
import { validarCatalogo } from '../src/validar.js';

// Fragmentos reales de ao-bin-dumps (commit 1a469e5, 2026-10-12), sin modificar sus valores.
const muestra = (archivo: string): unknown =>
  JSON.parse(readFileSync(join(import.meta.dirname, 'muestras', archivo), 'utf8'));

const nombres = indexarNombres(muestra('formatted_items.json'));
const { items, sinCategoria } = parsearItems(muestra('items.json'), nombres);
const item = (id: string) => {
  const encontrado = items.find((i) => i.id === id);
  if (!encontrado) throw new Error(`No está ${id}`);
  return encontrado;
};

describe('idMercado', () => {
  it('agrega @N solo a lo encantado', () => {
    expect(idMercado('T4_2H_LONGBOW', 0)).toBe('T4_2H_LONGBOW');
    expect(idMercado('T4_PLANKS_LEVEL1', 1)).toBe('T4_PLANKS_LEVEL1@1');
  });
});

describe('parsearItems', () => {
  it('cada ítem cumple el esquema', () => {
    for (const i of items) expect(() => ItemSchema.parse(i)).not.toThrow();
  });

  it('descarta lo que no se vende en el mercado (sin shopcategory)', () => {
    expect(sinCategoria).toBe(1);
    expect(items.some((i) => i.tipo === 'mountskin')).toBe(false);
  });

  it('lee recursos refinados con todas sus recetas', () => {
    const tablas = item('T4_PLANKS');
    expect(tablas).toMatchObject({ nombre: 'Tablas de pino', tier: 4, peso: 0.51 });
    expect(tablas.recetas).toHaveLength(2);
    expect(tablas.recetas[0]).toEqual({
      materiales: [
        { id: 'T4_WOOD', cantidad: 2, seRegresa: true },
        { id: 'T3_PLANKS', cantidad: 1, seRegresa: true },
      ],
      cantidadProducida: 1,
      plata: 0,
      foco: 54,
      tiempo: 0.04167,
    });
  });

  it('usa el ID de mercado con @N para recursos encantados', () => {
    expect(item('T4_PLANKS_LEVEL1@1')).toMatchObject({
      base: 'T4_PLANKS_LEVEL1',
      encantamiento: 1,
      nombre: 'Tablas de pino poco común',
    });
  });

  it('genera una entrada por nivel de encantamiento del equipo, con su propia receta', () => {
    const niveles = items.filter((i) => i.base === 'T4_2H_LONGBOW').map((i) => i.id);
    expect(niveles).toEqual([
      'T4_2H_LONGBOW',
      'T4_2H_LONGBOW@1',
      'T4_2H_LONGBOW@2',
      'T4_2H_LONGBOW@3',
      'T4_2H_LONGBOW@4',
    ]);
    expect(item('T4_2H_LONGBOW').recetas[0]?.materiales).toEqual([
      { id: 'T4_PLANKS', cantidad: 32, seRegresa: true },
    ]);
    const encantado = item('T4_2H_LONGBOW@1');
    expect(encantado).toMatchObject({ nombre: 'Arco largo del iniciado', peso: 6.8 });
    expect(encantado.recetas[0]).toMatchObject({
      materiales: [{ id: 'T4_PLANKS_LEVEL1@1', cantidad: 32, seRegresa: true }],
      foco: 3001,
    });
  });

  it('marca los artefactos que el RRR no regresa', () => {
    const escudo = item('T4_OFF_TOWERSHIELD_UNDEAD');
    const artefacto = escudo.recetas[0]?.materiales.find((m) => m.id.includes('ARTEFACT'));
    expect(artefacto).toEqual({
      id: 'T4_ARTEFACT_OFF_TOWERSHIELD_UNDEAD',
      cantidad: 1,
      seRegresa: false,
    });
  });

  it('deja la plata en null cuando la receta no la trae, sin inventar un 0', () => {
    expect(item('T4_OFF_TOWERSHIELD_UNDEAD').recetas[1]?.plata).toBeNull();
  });
});

describe('validarCatalogo', () => {
  it('reporta ítems clave y materiales faltantes en un catálogo incompleto', () => {
    const errores = validarCatalogo(items);
    expect(errores).toContain('Falta el ítem clave T4_2H_BOW');
    expect(errores.some((e) => e.includes('materiales de recetas no están'))).toBe(true);
  });
});
