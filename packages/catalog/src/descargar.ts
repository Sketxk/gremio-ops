import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export const REPO = 'ao-data/ao-bin-dumps';
export const USER_AGENT = 'gremio-ops-catalogo (+https://github.com/Sketxk/gremio-ops)';

/** Archivos del volcado que usa el catálogo, con su ruta dentro del repositorio. */
export const ARCHIVOS = {
  items: 'items.json',
  nombres: 'formatted/items.json',
  modificadores: 'craftingmodifiers.json',
  mundo: 'formatted/world.json',
  gamedata: 'gamedata.json',
} as const;

export type ArchivoVolcado = keyof typeof ARCHIVOS;

export interface VersionVolcado {
  sha: string;
  fecha: string;
}

const MAX_INTENTOS = 4;

async function conReintentos<T>(descripcion: string, fn: () => Promise<T>): Promise<T> {
  let espera = 2_000;
  for (let intento = 1; ; intento++) {
    try {
      return await fn();
    } catch (error) {
      if (intento >= MAX_INTENTOS) {
        throw new Error(`${descripcion}: falló tras ${MAX_INTENTOS} intentos`, { cause: error });
      }
      console.warn(`${descripcion}: intento ${intento} falló, reintento en ${espera / 1000} s`);
      await new Promise((r) => setTimeout(r, espera));
      espera *= 2;
    }
  }
}

/** Último commit de la rama principal del volcado: su SHA fija la versión del catálogo. */
export async function versionActual(): Promise<VersionVolcado> {
  return conReintentos('Consultar versión de ao-bin-dumps', async () => {
    const res = await fetch(`https://api.github.com/repos/${REPO}/commits/master`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) throw new Error(`GitHub respondió ${res.status} ${res.statusText}`);
    const datos = (await res.json()) as { sha: string; commit: { committer: { date: string } } };
    return { sha: datos.sha, fecha: datos.commit.committer.date };
  });
}

async function existe(ruta: string): Promise<boolean> {
  try {
    await stat(ruta);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

/**
 * Descarga un archivo del volcado en la versión indicada, guardándolo en `cacheDir/<sha>/`.
 * Si ya está en caché no lo vuelve a bajar. Devuelve la ruta local.
 */
export async function descargar(
  archivo: ArchivoVolcado,
  version: VersionVolcado,
  cacheDir: string,
): Promise<string> {
  const dir = join(cacheDir, version.sha);
  const destino = join(dir, ARCHIVOS[archivo].replaceAll('/', '__'));
  if (await existe(destino)) return destino;

  await mkdir(dir, { recursive: true });
  const url = `https://raw.githubusercontent.com/${REPO}/${version.sha}/${ARCHIVOS[archivo]}`;
  await conReintentos(`Descargar ${ARCHIVOS[archivo]}`, async () => {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok || !res.body) throw new Error(`${url} respondió ${res.status} ${res.statusText}`);
    const temporal = `${destino}.parcial`;
    await pipeline(Readable.fromWeb(res.body), createWriteStream(temporal));
    await rename(temporal, destino);
  });
  return destino;
}

export async function leerJson(ruta: string): Promise<unknown> {
  return JSON.parse(await readFile(ruta, 'utf8')) as unknown;
}

export async function escribirJson(ruta: string, datos: unknown): Promise<void> {
  await writeFile(ruta, `${JSON.stringify(datos)}\n`, 'utf8');
}
