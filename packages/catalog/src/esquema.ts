import { z } from 'zod';

export const MaterialSchema = z.object({
  /** ID de mercado del material (con `@N` si está encantado). */
  id: z.string().min(1),
  cantidad: z.number().positive(),
  /** false cuando el juego no regresa este material con el RRR (`maxreturnamount="0"`). */
  seRegresa: z.boolean(),
});

export const RecetaSchema = z.object({
  materiales: z.array(MaterialSchema).min(1),
  /** Unidades que produce una vez la receta. */
  cantidadProducida: z.number().positive(),
  plata: z.number().nonnegative().nullable(),
  foco: z.number().nonnegative().nullable(),
  /** Tiempo de crafteo tal como viene en el volcado (`@time`). */
  tiempo: z.number().nonnegative().nullable(),
});

export const ItemSchema = z.object({
  /** ID que usa la API del Data Project, p. ej. `T4_2H_LONGBOW@1`. */
  id: z.string().min(1),
  /** `@uniquename` del volcado, sin sufijo de encantamiento. */
  base: z.string().min(1),
  nombre: z.string().nullable(),
  nombreIngles: z.string().nullable(),
  tier: z.number().int().nullable(),
  encantamiento: z.number().int().min(0),
  /** Tipo de nodo en items.json (weapon, equipmentitem, simpleitem…). */
  tipo: z.string(),
  categoria: z.string().nullable(),
  subcategoria: z.string().nullable(),
  subcategoria2: z.string().nullable(),
  categoriaCrafteo: z.string().nullable(),
  peso: z.number().nonnegative().nullable(),
  recetas: z.array(RecetaSchema),
});

export const CatalogoSchema = z.object({
  fuente: z.object({
    repositorio: z.string(),
    sha: z.string(),
    fecha: z.string(),
  }),
  generado: z.string(),
  items: z.array(ItemSchema),
});

export const CiudadSchema = z.object({
  /** ID de cluster del juego. */
  cluster: z.string(),
  nombre: z.string(),
  /** Bono base de producción al refinar en esta ciudad. */
  bonoRefinado: z.number().nonnegative(),
  /** Bono base de producción al craftear en esta ciudad. */
  bonoCrafteo: z.number().nonnegative(),
  /** Bono extra por categoría de crafteo (`categoriaCrafteo` del ítem), p. ej. `{ bow: 0.15 }`. */
  especialidades: z.record(z.string(), z.number().nonnegative()),
});

export const BonosSchema = z.object({
  fuente: z.object({ repositorio: z.string(), sha: z.string(), fecha: z.string() }),
  ciudades: z.array(CiudadSchema).min(1),
});

export type Material = z.infer<typeof MaterialSchema>;
export type Ciudad = z.infer<typeof CiudadSchema>;
export type Bonos = z.infer<typeof BonosSchema>;
export type Receta = z.infer<typeof RecetaSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type Catalogo = z.infer<typeof CatalogoSchema>;
