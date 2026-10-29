import { lazy, Suspense, useEffect } from 'react';
import { ProveedorAhora } from './ahora';
import { Marco } from './componentes/Marco';
import { navegar, useUbicacion } from './ruta';
import { textos } from './textos/es';
import { MercadoNegro } from './vistas/MercadoNegro';
import { Precios } from './vistas/Precios';

// La calculadora trae las recetas (~25 KB comprimidas); solo se descargan al abrirla.
const Crafteo = lazy(() => import('./vistas/Crafteo'));

const RUTAS: Record<string, (p: { parametros: URLSearchParams }) => React.ReactNode> = {
  '/precios': Precios,
  '/mercado-negro': MercadoNegro,
  '/crafteo': Crafteo,
};

/** Rutas de la app; cualquier otra lleva a Precios. */
export function App() {
  const { pathname, search } = useUbicacion();
  const Vista = RUTAS[pathname];

  useEffect(() => {
    if (!Vista) navegar(`/precios${search}`, { reemplazar: true });
  }, [Vista, search]);

  return (
    <ProveedorAhora>
      <Marco actual={pathname}>
        <Suspense
          fallback={<p className="text-sm text-muted-foreground">{textos.estado.cargando}</p>}
        >
          {Vista && <Vista parametros={new URLSearchParams(search)} />}
        </Suspense>
      </Marco>
    </ProveedorAhora>
  );
}
