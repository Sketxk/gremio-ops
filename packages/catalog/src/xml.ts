/**
 * Los JSON de ao-bin-dumps vienen de convertir XML: un nodo con un solo hijo es objeto y con varios
 * es arreglo, y todos los atributos (`@nombre`) son texto. Estas utilidades normalizan eso.
 */
export type Nodo = Record<string, unknown>;

export function esNodo(valor: unknown): valor is Nodo {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

export function lista(valor: unknown): Nodo[] {
  if (valor === undefined || valor === null) return [];
  const arreglo = Array.isArray(valor) ? valor : [valor];
  return arreglo.filter(esNodo);
}

export function texto(nodo: Nodo, attr: string): string | null {
  const valor = nodo[`@${attr}`];
  return typeof valor === 'string' && valor !== '' ? valor : null;
}

export function numero(nodo: Nodo, attr: string): number | null {
  const valor = texto(nodo, attr);
  if (valor === null) return null;
  const n = Number(valor);
  if (!Number.isFinite(n)) {
    throw new Error(`Atributo @${attr}="${valor}" no es un número`);
  }
  return n;
}
