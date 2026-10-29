import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compararConstantes, indexarMundo, parsearBonos } from '../src/bonos.js';

// Fragmentos reales de ao-bin-dumps (commit 1a469e5, 2026-10-12), sin modificar sus valores.
const muestra = (archivo: string): unknown =>
  JSON.parse(readFileSync(join(import.meta.dirname, 'muestras', archivo), 'utf8'));

describe('parsearBonos', () => {
  const ciudades = parsearBonos(
    muestra('craftingmodifiers.json'),
    indexarMundo(muestra('world.json')),
  );

  it('lee las ciudades con cluster y deja fuera las Tierras Lejanas', () => {
    expect(ciudades.map((c) => c.nombre)).toEqual(['Lymhurst', 'Fort Sterling']);
  });

  it('Lymhurst da bono a los arcos y Fort Sterling a la madera', () => {
    const lymhurst = ciudades.find((c) => c.nombre === 'Lymhurst');
    const fortSterling = ciudades.find((c) => c.nombre === 'Fort Sterling');
    expect(lymhurst).toMatchObject({ cluster: '1000', bonoRefinado: 0.18, bonoCrafteo: 0.18 });
    expect(lymhurst?.especialidades['bow']).toBe(0.15);
    expect(fortSterling?.especialidades['wood']).toBe(0.4);
  });

  it('falla si un cluster no tiene nombre en world.json', () => {
    expect(() => parsearBonos(muestra('craftingmodifiers.json'), new Map())).toThrow(/world\.json/);
  });
});

describe('compararConstantes', () => {
  it('las constantes de core coinciden con el juego', () => {
    expect(compararConstantes(muestra('gamedata.json'))).toEqual([]);
  });

  it('detecta cuando un parche cambia una tasa', () => {
    const gamedata = muestra('gamedata.json') as {
      'AO-GameData': { ActionFocus: { CraftingEfficiency: { '@bonus': string } } };
    };
    gamedata['AO-GameData'].ActionFocus.CraftingEfficiency['@bonus'] = '0.60';
    expect(compararConstantes(gamedata)).toEqual([
      'ActionFocus CraftingEfficiency: el juego dice 0.6, core usa 0.59',
    ]);
  });
});
