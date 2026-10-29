import { useEffect } from 'react';
import { ProveedorAhora } from './ahora';
import { Marco } from './componentes/Marco';
import { navegar, useUbicacion } from './ruta';
import { Precios } from './vistas/Precios';

/** Rutas de la app. Por ahora solo Precios; "/" lleva ahí. */
export function App() {
  const { pathname, search } = useUbicacion();

  useEffect(() => {
    if (pathname !== '/precios') navegar(`/precios${search}`, { reemplazar: true });
  }, [pathname, search]);

  return (
    <ProveedorAhora>
      <Marco actual={pathname}>
        <Precios parametros={new URLSearchParams(search)} />
      </Marco>
    </ProveedorAhora>
  );
}
