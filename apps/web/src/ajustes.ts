import { useCallback, useSyncExternalStore } from 'react';
import type { AjustesRadar } from './radar';

/**
 * Ajustes de cada quien (capital, premium, riesgo…). Viven en el navegador mientras no haya
 * login; cuando lo haya, pasan al perfil. Si el navegador no deja guardar, se usan los de fábrica.
 */
export interface Ajustes extends AjustesRadar {
  tarifaEstacion: number;
}

export const AJUSTES_INICIALES: Ajustes = {
  capital: 100_000,
  // Sin premium por defecto: el impuesto es más alto y así ninguna cuenta sale optimista de más.
  premium: false,
  modoCompra: 'instantanea',
  riesgoViaje: 0,
  costoSet: 0,
  // Regla del plan: no cargar más del 10% de tu plata por viaje (ajustable).
  exposicion: 0.1,
  carga: null,
  diasParaVender: 1,
  miembros: 1,
  tarifaEstacion: 0,
};

const CLAVE = 'gremio-ops:ajustes';
const EVENTO = 'gremio:ajustes';

let cache: Ajustes | null = null;

function leer(): Ajustes {
  if (cache) return cache;
  let guardados: Partial<Ajustes> = {};
  try {
    const texto = window.localStorage.getItem(CLAVE);
    if (texto) guardados = JSON.parse(texto) as Partial<Ajustes>;
  } catch (error) {
    console.warn('No se pudieron leer los ajustes guardados; se usan los de fábrica', error);
  }
  cache = { ...AJUSTES_INICIALES, ...guardados };
  return cache;
}

function suscribir(avisar: () => void) {
  window.addEventListener(EVENTO, avisar);
  return () => window.removeEventListener(EVENTO, avisar);
}

export function useAjustes(): [Ajustes, (cambios: Partial<Ajustes>) => void] {
  const ajustes = useSyncExternalStore(suscribir, leer);
  const cambiar = useCallback((cambios: Partial<Ajustes>) => {
    cache = { ...leer(), ...cambios };
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(cache));
    } catch (error) {
      console.warn('No se pudieron guardar los ajustes; duran mientras no recargues', error);
    }
    window.dispatchEvent(new Event(EVENTO));
  }, []);
  return [ajustes, cambiar];
}
