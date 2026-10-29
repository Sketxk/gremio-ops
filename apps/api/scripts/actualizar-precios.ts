import { actualizarPrecios, type Almacen } from '../src/actualizar.js';
import { CLAVE_SNAPSHOT } from '../src/config.js';
import type { Snapshot } from '../src/snapshot.js';

/**
 * Lo corre GitHub Actions cada 15 minutos (.github/workflows/precios.yml). Escribe en KV con la API
 * de Cloudflare; el token solo tiene permiso de editar Workers KV y vive en los secretos del repo.
 */
function variable(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`);
  return valor;
}

const token = variable('CLOUDFLARE_API_TOKEN');
const cuenta = variable('CLOUDFLARE_ACCOUNT_ID');
const espacio = variable('KV_NAMESPACE_ID');
const url = `https://api.cloudflare.com/client/v4/accounts/${cuenta}/storage/kv/namespaces/${espacio}/values/${CLAVE_SNAPSHOT}`;
const autorizacion = { Authorization: `Bearer ${token}` };

const kv: Almacen = {
  async leer() {
    const res = await fetch(url, { headers: autorizacion });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`KV respondió ${res.status} al leer: ${await res.text()}`);
    return (await res.json()) as Snapshot;
  },
  async guardar(snapshot) {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { ...autorizacion, 'Content-Type': 'text/plain' },
      body: JSON.stringify(snapshot),
    });
    if (!res.ok) throw new Error(`KV respondió ${res.status} al guardar: ${await res.text()}`);
  },
};

await actualizarPrecios({
  fetch: (u, init) => fetch(u, init),
  esperar: (ms) => new Promise((r) => setTimeout(r, ms)),
  ahora: () => new Date(),
  almacen: kv,
});
