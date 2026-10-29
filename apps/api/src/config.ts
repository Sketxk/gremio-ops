/** Clave del snapshot de precios en KV. */
export const CLAVE_SNAPSHOT = 'snapshot';

/** Por ahora solo calidad normal; subir esto multiplica el tamaño de cada respuesta. */
export const CALIDADES = [1] as const;

/** Pausa entre consultas: la API bloquea por minutos si recibe varias seguidas. */
export const PAUSA_ENTRE_LOTES_MS = 5000;

/** Clave del resumen de volumen en KV (lo escribe la descarga diaria). */
export const CLAVE_VOLUMEN = 'volumen';

/** Días completos que resume el volumen: una semana para que no pese un solo día raro. */
export const DIAS_VOLUMEN = 7;
