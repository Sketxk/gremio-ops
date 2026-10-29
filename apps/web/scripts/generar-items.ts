import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BonosSchema, CatalogoSchema } from '@gremio/catalog';

/**
 * Copia del catálogo solo con lo que vigila la descarga de precios, para no mandar los 6 MB del
 * catálogo completo al navegador:
 * - `items.json`: nombre, tier, encantamiento, peso y grupo de cada ítem (lo carga toda la app).
 * - `recetas.json`: recetas de los que se craftean (solo lo carga la calculadora de crafteo).
 * - `bonos.json`: bonos de producción por ciudad (de `packages/catalog/bonos.json`).
 */
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const CATALOGO = join(RAIZ, '..', '..', 'packages', 'catalog', 'catalogo.json');
const BONOS = join(RAIZ, '..', '..', 'packages', 'catalog', 'bonos.json');
const LISTA = join(RAIZ, '..', 'api', 'lista-seguimiento.json');
const DATOS = join(RAIZ, 'src', 'datos');

const catalogo = CatalogoSchema.parse(JSON.parse(await readFile(CATALOGO, 'utf8')));
const lista = JSON.parse(await readFile(LISTA, 'utf8')) as {
  grupos: { clave: string; ids: string[] }[];
};
const porId = new Map(catalogo.items.map((i) => [i.id, i]));
const grupoDe = new Map(lista.grupos.flatMap((g) => g.ids.map((id) => [id, g.clave])));

const items = lista.grupos.flatMap((grupo) =>
  grupo.ids.map((id) => {
    const item = porId.get(id);
    if (!item) throw new Error(`${id} está en la lista de seguimiento pero no en el catálogo`);
    return {
      id,
      nombre: item.nombre,
      tier: item.tier,
      encantamiento: item.encantamiento,
      peso: item.peso,
      grupo: grupo.clave,
    };
  }),
);

const recetas = Object.fromEntries(
  items.flatMap(({ id }) => {
    const item = porId.get(id);
    if (!item || item.recetas.length === 0 || grupoDe.get(id) === 'materiales') return [];
    return [
      [
        id,
        {
          categoria: item.categoriaCrafteo,
          refinado: item.subcategoria === 'refinedresources',
          recetas: item.recetas.map((r) => ({
            materiales: r.materiales,
            cantidadProducida: r.cantidadProducida,
            foco: r.foco,
          })),
        },
      ],
    ];
  }),
);

await writeFile(join(DATOS, 'items.json'), `${JSON.stringify(items, null, 1)}\n`);
await writeFile(join(DATOS, 'recetas.json'), `${JSON.stringify(recetas)}\n`);
const bonos = BonosSchema.parse(JSON.parse(await readFile(BONOS, 'utf8')));
await writeFile(join(DATOS, 'bonos.json'), `${JSON.stringify(bonos.ciudades, null, 1)}\n`);
console.log(`${items.length} ítems y ${Object.keys(recetas).length} con receta en ${DATOS}`);
