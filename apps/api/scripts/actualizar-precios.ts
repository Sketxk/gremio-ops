import { actualizarPrecios, snapshotReciente } from '../src/actualizar.js';
import { CLAVE_SNAPSHOT } from '../src/config.js';
import type { Snapshot } from '../src/snapshot.js';
import { clienteKv, dependenciasRed } from './kv.js';

/**
 * Lo corre GitHub Actions (.github/workflows/precios.yml) cuando lo despierta el Cron del Worker o
 * su propio horario de respaldo. Si los dos llegan casi juntos, el segundo se salta.
 */
const almacen = clienteKv<Snapshot>(CLAVE_SNAPSHOT);
const anterior = await almacen.leer();
if (snapshotReciente(anterior, new Date())) {
  console.log(`El snapshot es de ${anterior?.generado}; todavía está fresco, no se descarga.`);
} else {
  await actualizarPrecios({ ...dependenciasRed, almacen });
}
