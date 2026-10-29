import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/**
 * La hora actual para toda la app, refrescada cada minuto para que "hace X min" y los colores de
 * frescura avancen solos sin que cada precio tenga su propio reloj.
 */
const Ahora = createContext<Date | null>(null);

export function ProveedorAhora({ children }: { children: ReactNode }) {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return <Ahora value={ahora}>{children}</Ahora>;
}

export function useAhora(): Date {
  const ahora = useContext(Ahora);
  if (ahora === null) throw new Error('useAhora necesita <ProveedorAhora> más arriba');
  return ahora;
}
