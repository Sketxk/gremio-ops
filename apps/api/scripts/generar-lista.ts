import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CatalogoSchema, type Item } from '@gremio/catalog';

/**
 * Qué se descarga cada 15 minutos. Cada regla filtra el catálogo por sus categorías; para agregar
 * algo, agrega una regla y corre `npm run lista -w @gremio/api` y `npm run items -w @gremio/web`.
 */
const t4 = (i: Item) => (i.tier ?? 0) >= 4;
const REGLAS: { clave: string; motivo: string; aplica: (i: Item) => boolean }[] = [
  { clave: 'arcos', motivo: 'Arcos T4+', aplica: (i) => i.subcategoria === 'bow' && t4(i) },
  {
    clave: 'recursos',
    motivo: 'Recursos en bruto y refinados',
    aplica: (i) => i.subcategoria === 'resources' || i.subcategoria === 'refinedresources',
  },
  {
    clave: 'cuero',
    motivo: 'Armaduras de cuero T4+',
    aplica: (i) =>
      ['leather_armor', 'leather_helmet', 'leather_shoes'].includes(i.subcategoria ?? '') && t4(i),
  },
  {
    clave: 'capas-bolsas',
    motivo: 'Capas y bolsas T4+',
    aplica: (i) => ['capes', 'bags'].includes(i.categoria ?? '') && t4(i),
  },
  {
    clave: 'consumibles',
    motivo: 'Comida y pociones',
    aplica: (i) =>
      i.categoria === 'consumables' && ['food', 'potions'].includes(i.subcategoria ?? ''),
  },
  {
    clave: 'lujo',
    motivo: 'Bienes de lujo (tesoros)',
    aplica: (i) => i.subcategoria === 'luxurygoods',
  },
];

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const CATALOGO = join(RAIZ, '..', '..', 'packages', 'catalog', 'catalogo.json');
const SALIDA = join(RAIZ, 'lista-seguimiento.json');

const catalogo = CatalogoSchema.parse(JSON.parse(await readFile(CATALOGO, 'utf8')));
const ids = new Set<string>();
const grupos: { clave: string; motivo: string; ids: string[] }[] = [];
for (const regla of REGLAS) {
  // Cada ítem queda en el primer grupo que lo atrapa; el buscador de la web filtra por grupo.
  const encontrados = catalogo.items.filter((i) => regla.aplica(i) && !ids.has(i.id));
  if (encontrados.length === 0) throw new Error(`La regla "${regla.motivo}" no encontró ítems`);
  for (const item of encontrados) ids.add(item.id);
  const delGrupo = encontrados.map((i) => i.id).sort();
  grupos.push({ clave: regla.clave, motivo: regla.motivo, ids: delGrupo });
  console.log(`${regla.motivo}: ${encontrados.length}`);
}

await writeFile(
  SALIDA,
  `${JSON.stringify({ catalogo: catalogo.fuente.sha, ids: [...ids].sort(), grupos }, null, 2)}\n`,
);
console.log(`${ids.size} ítems en ${SALIDA}`);
