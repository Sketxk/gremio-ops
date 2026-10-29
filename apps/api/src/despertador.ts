/**
 * Despertador de la descarga de precios. Las tareas programadas de GitHub se retrasan o se saltan
 * cuando GitHub tiene mucha carga (pasó al estrenar el repo: más de una hora sin correr), así que el
 * Cron del Worker le pide a GitHub cada 15 minutos que la corra. Solo hace dos peticiones cortas;
 * cabe de sobra en los 10 ms de CPU. La descarga misma sigue en GitHub Actions.
 */
export const REPOSITORIO = 'Sketxk/gremio-ops';
export const WORKFLOW = 'precios.yml';
export const RAMA = 'main';

const API = `https://api.github.com/repos/${REPOSITORIO}/actions/workflows/${WORKFLOW}`;

export type FetchGithub = (url: string, init: RequestInit) => Promise<Response>;

/**
 * Vuelve a habilitar el workflow (por si GitHub lo pausó tras 60 días sin actividad) y lo lanza.
 * El token es de GitHub, de grano fino, solo para este repo y con permiso de Actions.
 */
export async function despertarDescarga(token: string, fetchFn: FetchGithub): Promise<void> {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'gremio-ops (+https://github.com/Sketxk/gremio-ops)',
  };

  const habilitar = await fetchFn(`${API}/enable`, { method: 'PUT', headers });
  if (!habilitar.ok) {
    throw new Error(`GitHub respondió ${habilitar.status} al habilitar: ${await habilitar.text()}`);
  }
  const lanzar = await fetchFn(`${API}/dispatches`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: RAMA }),
  });
  if (!lanzar.ok) {
    throw new Error(`GitHub respondió ${lanzar.status} al lanzar: ${await lanzar.text()}`);
  }
}
