import type { Item } from './esquema.js';

/**
 * IDs que deben existir con receta y nombre en español. Si alguno falla, el volcado cambió de forma
 * o el parser se rompió, y el catálogo no se escribe.
 */
export const IDS_CLAVE = [
  'T4_2H_LONGBOW',
  'T4_2H_LONGBOW@1',
  'T4_2H_BOW',
  'T4_PLANKS',
  'T4_PLANKS_LEVEL1@1',
  'T4_CLOTH',
] as const;

export function validarCatalogo(items: Item[]): string[] {
  const errores: string[] = [];
  const porId = new Map<string, Item>();
  for (const item of items) {
    if (porId.has(item.id)) errores.push(`ID duplicado: ${item.id}`);
    porId.set(item.id, item);
  }

  for (const id of IDS_CLAVE) {
    const item = porId.get(id);
    if (!item) {
      errores.push(`Falta el ítem clave ${id}`);
      continue;
    }
    if (item.nombre === null) errores.push(`${id} no tiene nombre en español`);
    if (item.recetas.length === 0) errores.push(`${id} no tiene receta`);
    if (item.peso === null) errores.push(`${id} no tiene peso`);
  }

  // Todo material de una receta debe existir en el catálogo para poder ponerle precio.
  const faltantes = new Set<string>();
  for (const item of items) {
    for (const receta of item.recetas) {
      for (const material of receta.materiales) {
        if (!porId.has(material.id)) faltantes.add(material.id);
      }
    }
  }
  if (faltantes.size > 0) {
    errores.push(
      `${faltantes.size} materiales de recetas no están en el catálogo: ${[...faltantes].slice(0, 10).join(', ')}`,
    );
  }

  return errores;
}
