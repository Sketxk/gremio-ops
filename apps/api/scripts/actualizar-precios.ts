import { actualizarPrecios } from '../src/actualizar.js';
import { CLAVE_SNAPSHOT } from '../src/config.js';
import type { Snapshot } from '../src/snapshot.js';
import { clienteKv, dependenciasRed } from './kv.js';

/** Lo corre GitHub Actions cada 15 minutos (.github/workflows/precios.yml). */
await actualizarPrecios({ ...dependenciasRed, almacen: clienteKv<Snapshot>(CLAVE_SNAPSHOT) });
