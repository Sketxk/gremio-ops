/**
 * Constantes del juego. Cada una dice de dónde sale. Los bonos por ciudad no viven aquí: el
 * catálogo los genera en `bonos.json` desde `craftingmodifiers.json`.
 *
 * `npm run generar` (packages/catalog) compara las que vienen del volcado contra el volcado
 * nuevo y falla si un parche las cambió.
 */
export const MERCADO = {
  /** Comisión al poner una orden de compra o de venta. Verificar tras parche. Fuente: gamedata.json → MarketPlace.TaxValues `setupfee`. */
  comisionOrden: 0.025,
  /** Impuesto al vender sin premium. Verificar tras parche. Fuente: gamedata.json → MarketPlace.TaxValues `transactiontax`. */
  impuestoVentaSinPremium: 0.08,
  /** Impuesto al vender con premium (la mitad). Verificar tras parche. Fuente: docs/PLAN.md; no viene en el volcado. */
  impuestoVentaPremium: 0.04,
} as const;

export const PRODUCCION = {
  /** Bono de producción al usar foco. Verificar tras parche. Fuente: gamedata.json → ActionFocus.CraftingEfficiency `bonus`. */
  bonoFoco: 0.59,
} as const;

/** Reglas del producto (no del juego): antigüedad de un precio en minutos. */
export const FRESCURA = {
  verdeHastaMin: 60,
  amarilloHastaMin: 360,
} as const;
