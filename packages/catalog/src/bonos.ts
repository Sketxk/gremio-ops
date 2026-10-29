import { MERCADO, PRODUCCION } from '@gremio/core';
import type { Ciudad } from './esquema.js';
import { esNodo, lista, numero, texto, type Nodo } from './xml.js';

/** Índice de lugares desde formatted/world.json: ID de cluster → nombre. */
export function indexarMundo(mundo: unknown): Map<string, string> {
  if (!Array.isArray(mundo)) throw new Error('formatted/world.json no es un arreglo');
  const indice = new Map<string, string>();
  for (const lugar of mundo) {
    if (
      esNodo(lugar) &&
      typeof lugar['Index'] === 'string' &&
      typeof lugar['UniqueName'] === 'string'
    ) {
      indice.set(lugar['Index'], lugar['UniqueName']);
    }
  }
  return indice;
}

function bono(nodo: Nodo, hijo: string, cluster: string): number {
  const valor = esNodo(nodo[hijo]) ? numero(nodo[hijo], 'value') : null;
  if (valor === null) throw new Error(`El cluster ${cluster} no trae ${hijo}`);
  return valor;
}

/**
 * Bonos de producción de las ciudades con cluster fijo (ciudades reales, Caerleon, Brecilien y los
 * Descansos) desde craftingmodifiers.json. Se dejan fuera las Tierras Lejanas (sin cluster) y los
 * Caminos de Avalon (`TNL-*`, solo traen bono de refinado).
 */
export function parsearBonos(modificadores: unknown, mundo: Map<string, string>): Ciudad[] {
  const raiz =
    esNodo(modificadores) && esNodo(modificadores['craftingmodifiers'])
      ? modificadores['craftingmodifiers']
      : null;
  if (raiz === null) throw new Error('craftingmodifiers.json no tiene el nodo "craftingmodifiers"');

  return lista(raiz['craftinglocation']).flatMap((lugar) => {
    const cluster = texto(lugar, 'clusterid');
    if (cluster === null || cluster.startsWith('TNL-')) return [];
    const nombre = mundo.get(cluster);
    if (nombre === undefined) throw new Error(`El cluster ${cluster} no aparece en world.json`);
    const especialidades: Record<string, number> = {};
    for (const mod of lista(lugar['craftingmodifier'])) {
      const categoria = texto(mod, 'name');
      const valor = numero(mod, 'value');
      if (categoria === null || valor === null) {
        throw new Error(`Modificador incompleto en ${nombre}: ${JSON.stringify(mod)}`);
      }
      especialidades[categoria] = valor;
    }
    return [
      {
        cluster,
        nombre,
        bonoRefinado: bono(lugar, 'refiningbonus', cluster),
        bonoCrafteo: bono(lugar, 'craftingbonus', cluster),
        especialidades,
      },
    ];
  });
}

/**
 * Compara las constantes de @gremio/core contra gamedata.json. Devuelve una lista de diferencias:
 * si no está vacía, un parche cambió el juego y hay que actualizar `constantes.ts`.
 */
export function compararConstantes(gamedata: unknown): string[] {
  const raiz = esNodo(gamedata) && esNodo(gamedata['AO-GameData']) ? gamedata['AO-GameData'] : null;
  if (raiz === null) throw new Error('gamedata.json no tiene el nodo "AO-GameData"');

  const mercado = esNodo(raiz['MarketPlace']) ? raiz['MarketPlace'] : {};
  const tasas = esNodo(mercado['TaxValues']) ? mercado['TaxValues'] : {};
  const factores = new Map(
    lista(tasas['TaxFactor']).map((f) => [texto(f, 'name'), numero(f, 'value')] as const),
  );
  const foco = esNodo(raiz['ActionFocus']) ? raiz['ActionFocus'] : {};
  const eficiencia = esNodo(foco['CraftingEfficiency']) ? foco['CraftingEfficiency'] : {};

  const comparaciones: [string, number | null | undefined, number][] = [
    ['MarketPlace setupfee', factores.get('setupfee'), MERCADO.comisionOrden],
    ['MarketPlace transactiontax', factores.get('transactiontax'), MERCADO.impuestoVentaSinPremium],
    ['ActionFocus CraftingEfficiency', numero(eficiencia, 'bonus'), PRODUCCION.bonoFoco],
  ];
  return comparaciones
    .filter(([, enJuego, enCore]) => enJuego !== enCore)
    .map(
      ([nombre, enJuego, enCore]) =>
        `${nombre}: el juego dice ${enJuego ?? 'nada'}, core usa ${enCore}`,
    );
}
