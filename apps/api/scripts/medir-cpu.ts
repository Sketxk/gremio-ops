import lista from '../lista-seguimiento.json';
import { CALIDADES, lotesSeguimiento } from '../src/cron.js';
import { UBICACIONES, USER_AGENT } from '../src/data-project.js';
import { construirSnapshot, tablaDesdeRegistros, type Snapshot } from '../src/snapshot.js';

/**
 * Estima el CPU de una corrida del Cron (una porción) con una respuesta real de la porción más
 * grande. Esperar la red no cuenta como CPU en Workers, así que solo se mide el trabajo sobre la
 * respuesta y el snapshot.
 *
 * Calibración: el 2026-10-28 esta PC midió 3.3 ms donde Cloudflare reportó 13 ms (×4). El dato que
 * manda es el `cpuTime` de `wrangler tail`; esto solo sirve para comparar antes de publicar.
 */
const FACTOR_CLOUDFLARE = 4;

const lotes = lotesSeguimiento();
const lote = [...lotes].sort((a, b) => b.ids.length - a.ids.length)[0];
if (!lote) throw new Error('La lista de seguimiento está vacía');

// Una sola consulta: la API bloquea por minutos si recibe varias seguidas.
const res = await fetch(lote.url, { headers: { 'User-Agent': USER_AGENT } });
if (!res.ok) throw new Error(`La API respondió ${res.status}`);
const texto = await res.text();
console.log(
  `${lotes.length} porciones; la mayor tiene ${lote.ids.length} ítems y ${(texto.length / 1024).toFixed(0)} KB de respuesta`,
);

// Snapshot anterior de tamaño realista: la lista completa con esta misma respuesta repetida.
const tabla = tablaDesdeRegistros(JSON.parse(texto) as Parameters<typeof tablaDesdeRegistros>[0]);
const muestra = Object.values(tabla);
const anteriorTexto = JSON.stringify({
  version: 1,
  generado: new Date().toISOString(),
  ubicaciones: [...UBICACIONES],
  calidades: [...CALIDADES],
  porcion: { indice: 0, total: lotes.length },
  precios: Object.fromEntries(lista.ids.map((id, i) => [id, muestra[i % muestra.length] ?? {}])),
} satisfies Snapshot);

function corrida(): number {
  const inicio = performance.now();
  const registros = JSON.parse(texto) as Parameters<typeof tablaDesdeRegistros>[0];
  const anterior = JSON.parse(anteriorTexto) as Snapshot;
  const snapshot = construirSnapshot({
    ids: lista.ids,
    idsActualizados: new Set(lote?.ids),
    nuevos: tablaDesdeRegistros(registros),
    anterior,
    ubicaciones: UBICACIONES,
    calidades: CALIDADES,
    porcion: { indice: 0, total: lotes.length },
    ahora: new Date(),
  });
  if (JSON.stringify(snapshot).length === 0) throw new Error('Snapshot vacío');
  return performance.now() - inicio;
}

// La primera corrida incluye calentamiento del motor, como una invocación en frío.
const frio = corrida();
const tiempos = Array.from({ length: 50 }, corrida).sort((a, b) => a - b);
const mediana = tiempos[Math.floor(tiempos.length / 2)] ?? NaN;
console.log(
  `En esta PC: ${frio.toFixed(2)} ms en frío, ${mediana.toFixed(2)} ms en caliente. ` +
    `Estimado en Cloudflare (×${FACTOR_CLOUDFLARE}): ~${(frio * FACTOR_CLOUDFLARE).toFixed(1)} ms de 10.`,
);
