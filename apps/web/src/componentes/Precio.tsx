import { frescura, type Frescura } from '@gremio/core';
import { useAhora } from '@/ahora';
import { cn } from '@/lib/utils';
import { minutosDesde, type Punto } from '@/precios';
import { textos } from '@/textos/es';

export const COLOR_FRESCURA: Record<Frescura, string> = {
  verde: 'text-emerald-400',
  amarillo: 'text-amber-300',
  rojo: 'text-red-400',
};

export const formato = new Intl.NumberFormat('es-MX');
const enteros = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
const porciento = new Intl.NumberFormat('es-MX', { style: 'percent', maximumFractionDigits: 1 });

/** Plata redondeada al entero para mostrarla; la cuenta interna no se redondea. */
export function plata(n: number): string {
  return enteros.format(n);
}

export function pct(fraccion: number): string {
  return porciento.format(fraccion);
}

export function nombreCiudad(ubicacion: string): string {
  return textos.ciudades[ubicacion] ?? ubicacion;
}

/** Precio con su antigüedad debajo, en el color de frescura; opcionalmente con la ciudad. */
export function Precio({
  punto,
  ciudad,
  className,
}: {
  punto: Punto | null;
  ciudad?: string | undefined;
  className?: string;
}) {
  const ahora = useAhora();
  if (punto === null) return <span className="text-muted-foreground">{textos.sinDato}</span>;
  const color = COLOR_FRESCURA[frescura(new Date(punto.fecha), ahora)];
  const hace = textos.tiempo.hace(minutosDesde(punto.fecha, ahora));
  return (
    <span className={cn('inline-flex flex-col leading-tight', className)}>
      <span className={cn('font-medium tabular-nums', color)}>{formato.format(punto.precio)}</span>
      <span className="text-xs text-muted-foreground">
        {ciudad ? `${nombreCiudad(ciudad)} · ${hace}` : hace}
      </span>
    </span>
  );
}

export function LeyendaFrescura() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {(['verde', 'amarillo', 'rojo'] as const).map((f) => (
        <li key={f} className={COLOR_FRESCURA[f]}>
          {textos.frescura[f]}
        </li>
      ))}
    </ul>
  );
}
