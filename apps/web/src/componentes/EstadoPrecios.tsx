import { frescura } from '@gremio/core';
import { useAhora } from '@/ahora';
import { cn } from '@/lib/utils';
import { minutosDesde, usePrecios } from '@/precios';
import { textos } from '@/textos/es';
import { COLOR_FRESCURA } from './Precio';

/** La descarga corre cada 15 minutos y GitHub a veces la retrasa; 45 min sin actualizar ya es para avisar. */
const MINUTOS_DESCARGA_ATRASADA = 45;

/** Antigüedad del snapshot completo; va en el menú para que siempre esté a la vista. */
export function EdadSnapshot({ className }: { className?: string }) {
  const { data } = usePrecios();
  const ahora = useAhora();
  if (!data) return null;
  const color = COLOR_FRESCURA[frescura(new Date(data.generado), ahora)];
  return (
    <p className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}>
      <span className={cn('size-2 shrink-0 rounded-full bg-current', color)} aria-hidden />
      {textos.estado.actualizado(textos.tiempo.hace(minutosDesde(data.generado, ahora)))}
    </p>
  );
}

/** Avisos sobre la descarga: atrasada o con lotes que fallaron. */
export function AvisosPrecios() {
  const { data } = usePrecios();
  const ahora = useAhora();
  if (!data) return null;
  const minutos = minutosDesde(data.generado, ahora);
  const avisos: string[] = [];
  if (minutos > MINUTOS_DESCARGA_ATRASADA)
    avisos.push(textos.estado.descargaAtrasada(textos.tiempo.hace(minutos)));
  if (data.lotes.fallidos > 0) avisos.push(textos.estado.lotesFallidos);
  if (avisos.length === 0) return null;
  return (
    <div className="space-y-1 rounded-lg border border-amber-300/30 bg-amber-300/5 px-3 py-2 text-sm text-amber-200">
      {avisos.map((a) => (
        <p key={a}>{a}</p>
      ))}
    </div>
  );
}
