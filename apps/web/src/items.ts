import datos from './datos/items.json';
import { indexar, type ItemBuscable } from './buscar';
import { textos } from './textos/es';

export interface ItemLista extends ItemBuscable {
  /** Peso por unidad en kg; null si el catálogo no lo trae. */
  peso: number | null;
}

/** Los ítems que vigila la descarga de precios, ordenados por nombre, tier y encantamiento. */
const orden = new Intl.Collator('es-MX');
export const ITEMS: readonly ItemLista[] = [...(datos as ItemLista[])].sort(
  (a, b) =>
    orden.compare(a.nombre ?? a.id, b.nombre ?? b.id) ||
    (a.tier ?? 0) - (b.tier ?? 0) ||
    a.encantamiento - b.encantamiento,
);

export const INDICE = indexar(ITEMS);
export const POR_ID = new Map(ITEMS.map((i) => [i.id, i]));
export const GRUPOS = [...new Set(ITEMS.map((i) => i.grupo))];

export function nombreItem(item: ItemBuscable): string {
  return item.nombre ?? textos.sinNombre;
}

/** "4.1" para tier 4 encantamiento 1; vacío si el ítem no tiene tier. */
export function nivelItem(item: ItemBuscable): string {
  return item.tier === null ? '' : `${item.tier}.${item.encantamiento}`;
}
