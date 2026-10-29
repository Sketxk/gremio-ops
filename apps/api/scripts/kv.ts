/**
 * Lectura y escritura en KV de Cloudflare por su API, desde GitHub Actions. El token solo tiene
 * permiso de editar Workers KV y vive en los secretos del repo.
 */
function variable(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`);
  return valor;
}

export function clienteKv<T>(clave: string) {
  const cuenta = variable('CLOUDFLARE_ACCOUNT_ID');
  const espacio = variable('KV_NAMESPACE_ID');
  const url = `https://api.cloudflare.com/client/v4/accounts/${cuenta}/storage/kv/namespaces/${espacio}/values/${clave}`;
  const autorizacion = { Authorization: `Bearer ${variable('CLOUDFLARE_API_TOKEN')}` };

  return {
    async leer(): Promise<T | null> {
      const res = await fetch(url, { headers: autorizacion });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`KV respondió ${res.status} al leer: ${await res.text()}`);
      return (await res.json()) as T;
    },
    async guardar(valor: T): Promise<void> {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { ...autorizacion, 'Content-Type': 'text/plain' },
        body: JSON.stringify(valor),
      });
      if (!res.ok) throw new Error(`KV respondió ${res.status} al guardar: ${await res.text()}`);
    },
  };
}

export const dependenciasRed = {
  fetch: (u: string, init: RequestInit) => fetch(u, init),
  esperar: (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
  ahora: () => new Date(),
};
