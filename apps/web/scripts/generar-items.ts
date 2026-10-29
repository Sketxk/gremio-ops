import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CatalogoSchema } from '@gremio/catalog';

/**
 * Copia del catálogo solo con lo que vigila la descarga de precios (nombre, tier, encantamiento,
 * grupo), para no mandar los 6 MB del catálogo completo al navegador.
 */
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const CATALOGO = join(RAIZ, '..', '..', 'packages', 'catalog', 'catalogo.json');
const LISTA = join(RAIZ, '..', 'api', 'lista-seguimiento.json');
const SALIDA = join(RAIZ, 'src', 'datos', 'items.json');

const catalogo = CatalogoSchema.parse(JSON.parse(await readFile(CATALOGO, 'utf8')));
const lista = JSON.parse(await readFile(LISTA, 'utf8')) as {
  grupos: { clave: string; ids: string[] }[];
};
const porId = new Map(catalogo.items.map((i) => [i.id, i]));

const items = lista.grupos.flatMap((grupo) =>
  grupo.ids.map((id) => {
    const item = porId.get(id);
    if (!item) throw new Error(`${id} está en la lista de seguimiento pero no en el catálogo`);
    return {
      id,
      nombre: item.nombre,
      tier: item.tier,
      encantamiento: item.encantamiento,
      grupo: grupo.clave,
    };
  }),
);

await writeFile(SALIDA, `${JSON.stringify(items, null, 1)}\n`);
console.log(`${items.length} ítems en ${SALIDA}`);
