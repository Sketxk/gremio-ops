import type { Item, Material, Receta } from './esquema.js';
import { esNodo, lista, numero, texto, type Nodo } from './xml.js';

/** ID de mercado: el Data Project agrega `@N` a todo lo encantado (`T4_PLANKS_LEVEL1@1`). */
export function idMercado(uniquename: string, encantamiento: number): string {
  return encantamiento > 0 ? `${uniquename}@${encantamiento}` : uniquename;
}

function parsearMaterial(nodo: Nodo): Material {
  const id = texto(nodo, 'uniquename');
  const cantidad = numero(nodo, 'count');
  if (id === null || cantidad === null) {
    throw new Error(`Material sin @uniquename o @count: ${JSON.stringify(nodo)}`);
  }
  return {
    id: idMercado(id, numero(nodo, 'enchantmentlevel') ?? 0),
    cantidad,
    seRegresa: texto(nodo, 'maxreturnamount') !== '0',
  };
}

function parsearRecetas(valor: unknown): Receta[] {
  return lista(valor)
    .map((req) => ({
      materiales: lista(req['craftresource']).map(parsearMaterial),
      cantidadProducida: numero(req, 'amountcrafted') ?? 1,
      plata: numero(req, 'silver'),
      foco: numero(req, 'craftingfocus'),
      tiempo: numero(req, 'time'),
    }))
    .filter((receta) => receta.materiales.length > 0);
}

export interface Nombres {
  es: string | null;
  en: string | null;
}

/** Índice de nombres desde formatted/items.json: UniqueName → nombres en español e inglés. */
export function indexarNombres(formatted: unknown): Map<string, Nombres> {
  if (!Array.isArray(formatted)) throw new Error('formatted/items.json no es un arreglo');
  const indice = new Map<string, Nombres>();
  for (const entrada of formatted) {
    if (!esNodo(entrada) || typeof entrada['UniqueName'] !== 'string') continue;
    const nombres = esNodo(entrada['LocalizedNames']) ? entrada['LocalizedNames'] : {};
    const es = nombres['ES-ES'];
    const en = nombres['EN-US'];
    indice.set(entrada['UniqueName'], {
      es: typeof es === 'string' && es !== '' ? es : null,
      en: typeof en === 'string' && en !== '' ? en : null,
    });
  }
  return indice;
}

/** Grupos de items.json que no son ítems. */
const GRUPOS_IGNORADOS = new Set(['shopcategories']);

export interface ResultadoParseo {
  items: Item[];
  /** Ítems descartados por no tener categoría de tienda (no se venden en el mercado). */
  sinCategoria: number;
}

export function parsearItems(itemsJson: unknown, nombres: Map<string, Nombres>): ResultadoParseo {
  const raiz = esNodo(itemsJson) && esNodo(itemsJson['items']) ? itemsJson['items'] : null;
  if (raiz === null) throw new Error('items.json no tiene el nodo raíz "items"');

  const items: Item[] = [];
  let sinCategoria = 0;

  for (const [tipo, grupo] of Object.entries(raiz)) {
    if (tipo.startsWith('@') || GRUPOS_IGNORADOS.has(tipo)) continue;
    for (const nodo of lista(grupo)) {
      const base = texto(nodo, 'uniquename');
      if (base === null) continue;
      if (texto(nodo, 'shopcategory') === null) {
        sinCategoria++;
        continue;
      }

      const encantamientoBase = numero(nodo, 'enchantmentlevel') ?? 0;
      const comun = {
        base,
        tier: numero(nodo, 'tier'),
        tipo,
        categoria: texto(nodo, 'shopcategory'),
        subcategoria: texto(nodo, 'shopsubcategory1'),
        subcategoria2: texto(nodo, 'shopsubcategory2'),
        categoriaCrafteo: texto(nodo, 'craftingcategory'),
      };

      const agregar = (encantamiento: number, peso: number | null, recetas: Receta[]): void => {
        const id = idMercado(base, encantamiento);
        const nombre = nombres.get(id) ?? nombres.get(base);
        items.push({
          ...comun,
          id,
          encantamiento,
          nombre: nombre?.es ?? null,
          nombreIngles: nombre?.en ?? null,
          peso,
          recetas,
        });
      };

      const pesoBase = numero(nodo, 'weight');
      agregar(encantamientoBase, pesoBase, parsearRecetas(nodo['craftingrequirements']));

      // Equipo encantado: cada nivel vive dentro del ítem base con su propia receta.
      const encantamientos = esNodo(nodo['enchantments']) ? nodo['enchantments'] : {};
      for (const ench of lista(encantamientos['enchantment'])) {
        const nivel = numero(ench, 'enchantmentlevel');
        if (nivel === null || nivel === 0) continue;
        agregar(
          nivel,
          numero(ench, 'weight') ?? pesoBase,
          parsearRecetas(ench['craftingrequirements']),
        );
      }
    }
  }

  return { items, sinCategoria };
}
