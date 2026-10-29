import { CLAVE_VOLUMEN } from '../src/config.js';
import { actualizarVolumen, type SnapshotVolumen } from '../src/volumen.js';
import { clienteKv, dependenciasRed } from './kv.js';

/** Lo corre GitHub Actions una vez al día (.github/workflows/volumen.yml). */
await actualizarVolumen({ ...dependenciasRed, almacen: clienteKv<SnapshotVolumen>(CLAVE_VOLUMEN) });
