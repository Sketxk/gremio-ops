import { useSyncExternalStore } from 'react';

/**
 * Navegación mínima sin librería: la ruta y los filtros viven en la URL, así un enlace a
 * "/precios?item=T4_2H_LONGBOW" abre directo ese ítem.
 */
const EVENTO = 'gremio:navegar';

function suscribir(avisar: () => void) {
  window.addEventListener('popstate', avisar);
  window.addEventListener(EVENTO, avisar);
  return () => {
    window.removeEventListener('popstate', avisar);
    window.removeEventListener(EVENTO, avisar);
  };
}

export function useUbicacion(): URL {
  const href = useSyncExternalStore(suscribir, () => window.location.href);
  return new URL(href);
}

export function navegar(url: string, { reemplazar = false } = {}) {
  if (reemplazar) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
  window.dispatchEvent(new Event(EVENTO));
}

/** Cambia parámetros de la URL actual; `null` los quita. */
export function cambiarParametros(
  cambios: Record<string, string | null>,
  opciones: { reemplazar?: boolean } = {},
) {
  const url = new URL(window.location.href);
  for (const [clave, valor] of Object.entries(cambios)) {
    if (valor === null || valor === '') url.searchParams.delete(clave);
    else url.searchParams.set(clave, valor);
  }
  navegar(url.pathname + url.search, opciones);
}
