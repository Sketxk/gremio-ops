/**
 * Cliente de la API del Albion Online Data Project. Solo lo usa el Cron; el navegador de los
 * miembros nunca la consulta directamente.
 */
export const HOST = 'https://west.albion-online-data.com';
export const USER_AGENT = 'gremio-ops (+https://github.com/Sketxk/gremio-ops)';

/** Nombres exactos que usa la API (verificados en una respuesta real el 2026-10-28). */
export const UBICACIONES = [
  'Lymhurst',
  'Fort Sterling',
  'Thetford',
  'Martlock',
  'Bridgewatch',
  'Caerleon',
  'Brecilien',
  'Black Market',
] as const;

/** Límite de la API por URL. */
export const MAX_URL = 4096;

export interface Lote {
  url: string;
  ids: string[];
}

/** Reparte los IDs en URLs que no pasen de `MAX_URL` caracteres ni de `maxIds` ítems. */
export function armarLotes(
  ids: readonly string[],
  ubicaciones: readonly string[],
  calidades: readonly number[],
  maxIds = Infinity,
): Lote[] {
  const query =
    `?locations=${ubicaciones.map(encodeURIComponent).join(',')}` +
    `&qualities=${calidades.join(',')}`;
  const base = `${HOST}/api/v2/stats/prices/`;
  const largo = (lista: string[]) =>
    base.length + lista.map(encodeURIComponent).join(',').length + '.json'.length + query.length;

  const lotes: Lote[] = [];
  let actual: string[] = [];
  for (const id of ids) {
    if (actual.length > 0 && (actual.length >= maxIds || largo([...actual, id]) > MAX_URL)) {
      lotes.push({
        url: `${base}${actual.map(encodeURIComponent).join(',')}.json${query}`,
        ids: actual,
      });
      actual = [];
    }
    actual.push(id);
    if (largo(actual) > MAX_URL) throw new Error(`El ID ${id} solo ya no cabe en una URL`);
  }
  if (actual.length > 0) {
    lotes.push({
      url: `${base}${actual.map(encodeURIComponent).join(',')}.json${query}`,
      ids: actual,
    });
  }
  return lotes;
}

/** Un registro tal como lo devuelve /api/v2/stats/prices. */
export interface RegistroApi {
  item_id: string;
  city: string;
  quality: number;
  sell_price_min: number;
  sell_price_min_date: string;
  buy_price_max: number;
  buy_price_max_date: string;
}

function esRegistro(valor: unknown): valor is RegistroApi {
  if (typeof valor !== 'object' || valor === null) return false;
  const r = valor as Record<string, unknown>;
  return (
    typeof r['item_id'] === 'string' &&
    typeof r['city'] === 'string' &&
    typeof r['quality'] === 'number' &&
    typeof r['sell_price_min'] === 'number' &&
    typeof r['sell_price_min_date'] === 'string' &&
    typeof r['buy_price_max'] === 'number' &&
    typeof r['buy_price_max_date'] === 'string'
  );
}

export type Fetch = (url: string, init: RequestInit) => Promise<Response>;
export type Esperar = (ms: number) => Promise<void>;

const INTENTOS = 3;

/** Si la API pide esperar más que esto, la corrida se rinde y conserva el dato anterior. */
export const ESPERA_MAXIMA_MS = 60_000;

/**
 * Cuánto pide esperar la API en un 429: `Retry-After` (segundos) o `ratelimit-reset` (hora Unix en
 * que se libera, visto en respuestas reales el 2026-10-28). null si no manda ninguna.
 */
export function esperaPedida(headers: Headers, ahora: Date): number | null {
  const retryAfter = Number(headers.get('Retry-After'));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter * 1000;
  const reset = Number(headers.get('ratelimit-reset'));
  if (Number.isFinite(reset) && reset > 0) return Math.max(0, reset * 1000 - ahora.getTime());
  return null;
}

function validarRespuesta(datos: unknown): RegistroApi[] {
  if (!Array.isArray(datos)) throw new Error('La respuesta no es un arreglo');
  const invalido = datos.find((r) => !esRegistro(r));
  if (invalido !== undefined) {
    throw new Error(`Registro con forma inesperada: ${JSON.stringify(invalido)}`);
  }
  return datos as RegistroApi[];
}

/**
 * Descarga un lote con espera progresiva (2 s, 4 s) ante 429, errores 5xx o de red, o lo que la API
 * pida esperar si lo dice. Otros errores (4xx, forma inesperada) no se reintentan.
 */
export async function descargarLote(
  lote: Lote,
  fetchFn: Fetch,
  esperar: Esperar,
  ahora: () => Date,
): Promise<RegistroApi[]> {
  let ultimoError: unknown;
  for (let intento = 1; intento <= INTENTOS; intento++) {
    let espera = 1000 * 2 ** intento;
    let res: Response;
    try {
      res = await fetchFn(lote.url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      });
    } catch (error) {
      ultimoError = error;
      if (intento < INTENTOS) await esperar(espera);
      continue;
    }
    if (res.ok) return validarRespuesta(await res.json());
    if (res.status !== 429 && res.status < 500) {
      throw new Error(`La API respondió ${res.status} ${res.statusText}`);
    }
    ultimoError = new Error(`La API respondió ${res.status}`);
    const pedida = esperaPedida(res.headers, ahora());
    if (pedida !== null) {
      if (pedida > ESPERA_MAXIMA_MS) {
        throw new Error(
          `La API pide esperar ${Math.round(pedida / 1000)} s; se reintenta en la siguiente corrida`,
          {
            cause: ultimoError,
          },
        );
      }
      espera = pedida;
    }
    if (intento < INTENTOS) await esperar(espera);
  }
  throw new Error(`Lote de ${lote.ids.length} ítems falló tras ${INTENTOS} intentos`, {
    cause: ultimoError,
  });
}
