import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compararConstantes, indexarMundo, parsearBonos } from './bonos.js';
import { BonosSchema, CatalogoSchema, type Bonos, type Catalogo } from './esquema.js';
import { descargar, escribirJson, leerJson, REPO, versionActual } from './descargar.js';
import { indexarNombres, parsearItems } from './parsear.js';
import { validarCatalogo } from './validar.js';

const RAIZ_PAQUETE = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(RAIZ_PAQUETE, '.cache');
const SALIDA_CATALOGO = join(RAIZ_PAQUETE, 'catalogo.json');
const SALIDA_BONOS = join(RAIZ_PAQUETE, 'bonos.json');

async function main(): Promise<void> {
  const version = await versionActual();
  console.log(`ao-bin-dumps ${version.sha.slice(0, 7)} (${version.fecha})`);
  const fuente = { repositorio: REPO, sha: version.sha, fecha: version.fecha };

  const [rutaItems, rutaNombres, rutaModificadores, rutaMundo, rutaGamedata] = await Promise.all([
    descargar('items', version, CACHE),
    descargar('nombres', version, CACHE),
    descargar('modificadores', version, CACHE),
    descargar('mundo', version, CACHE),
    descargar('gamedata', version, CACHE),
  ]);

  const diferencias = compararConstantes(await leerJson(rutaGamedata));
  if (diferencias.length > 0) {
    throw new Error(
      `Un parche cambió constantes del juego; actualiza packages/core/src/constantes.ts:\n- ${diferencias.join('\n- ')}`,
    );
  }

  const nombres = indexarNombres(await leerJson(rutaNombres));
  const { items, sinCategoria } = parsearItems(await leerJson(rutaItems), nombres);

  const errores = validarCatalogo(items);
  if (errores.length > 0) {
    throw new Error(`El catálogo no pasó la validación:\n- ${errores.join('\n- ')}`);
  }

  const catalogo: Catalogo = CatalogoSchema.parse({
    fuente,
    generado: new Date().toISOString(),
    items: items.sort((a, b) => a.id.localeCompare(b.id)),
  });
  const bonos: Bonos = BonosSchema.parse({
    fuente,
    ciudades: parsearBonos(
      await leerJson(rutaModificadores),
      indexarMundo(await leerJson(rutaMundo)),
    ),
  });
  await Promise.all([escribirJson(SALIDA_CATALOGO, catalogo), escribirJson(SALIDA_BONOS, bonos)]);

  const sinNombre = items.filter((i) => i.nombre === null).length;
  const conReceta = items.filter((i) => i.recetas.length > 0).length;
  console.log(
    `${items.length} ítems (${conReceta} con receta, ${sinNombre} sin nombre en español); ` +
      `${sinCategoria} descartados por no venderse en el mercado.`,
  );
  console.log(
    `${bonos.ciudades.length} ciudades con bonos: ${bonos.ciudades.map((c) => c.nombre).join(', ')}`,
  );
  console.log('Constantes de core coinciden con gamedata.json.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
