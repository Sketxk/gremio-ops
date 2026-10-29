import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CatalogoSchema, type Item } from '@gremio/catalog';

/**
 * Qué vigila el Cron. Cada regla filtra el catálogo por sus categorías; para agregar algo, agrega
 * una regla y corre `npm run lista -w @gremio/api`.
 */
const REGLAS: { motivo: string; aplica: (i: Item) => boolean }[] = [
  { motivo: 'Arcos T4+', aplica: (i) => i.subcategoria === 'bow' && (i.tier ?? 0) >= 4 },
  {
    motivo: 'Tablas',
    aplica: (i) => i.subcategoria === 'refinedresources' && i.subcategoria2 === 'planks',
  },
  {
    motivo: 'Troncos',
    aplica: (i) => i.subcategoria === 'resources' && i.subcategoria2 === 'wood',
  },
];

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const CATALOGO = join(RAIZ, '..', '..', 'packages', 'catalog', 'catalogo.json');
const SALIDA = join(RAIZ, 'lista-seguimiento.json');

const catalogo = CatalogoSchema.parse(JSON.parse(await readFile(CATALOGO, 'utf8')));
const ids = new Set<string>();
for (const regla of REGLAS) {
  const encontrados = catalogo.items.filter(regla.aplica);
  if (encontrados.length === 0) throw new Error(`La regla "${regla.motivo}" no encontró ítems`);
  for (const item of encontrados) ids.add(item.id);
  console.log(`${regla.motivo}: ${encontrados.length}`);
}

await writeFile(
  SALIDA,
  `${JSON.stringify({ catalogo: catalogo.fuente.sha, reglas: REGLAS.map((r) => r.motivo), ids: [...ids].sort() }, null, 2)}\n`,
);
console.log(`${ids.size} ítems en ${SALIDA}`);
