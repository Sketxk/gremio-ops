import {
  Coins,
  GraduationCap,
  Hammer,
  Landmark,
  Menu,
  NotebookPen,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { navegar } from '@/ruta';
import { textos } from '@/textos/es';
import { EdadSnapshot } from './EstadoPrecios';

const s = textos.menu.secciones;

/** Secciones del menú. Las que no tienen ruta todavía se muestran como "Pronto". */
export const SECCIONES: { titulo: string; icono: LucideIcon; ruta: string | null }[] = [
  { titulo: s.precios, icono: Coins, ruta: '/precios' },
  { titulo: s.mercadoNegro, icono: Landmark, ruta: '/mercado-negro' },
  { titulo: s.crafteo, icono: Hammer, ruta: '/crafteo' },
  { titulo: s.bitacora, icono: NotebookPen, ruta: null },
  { titulo: s.aprende, icono: GraduationCap, ruta: null },
];

function Navegacion({ actual, alNavegar }: { actual: string; alNavegar?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {SECCIONES.map(({ titulo, icono: Icono, ruta }) =>
        ruta === null ? (
          <span
            key={titulo}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/60"
          >
            <Icono className="size-4" aria-hidden />
            {titulo}
            <Badge variant="outline" className="ml-auto text-[10px] text-muted-foreground">
              {textos.menu.pronto}
            </Badge>
          </span>
        ) : (
          <a
            key={titulo}
            href={ruta}
            onClick={(e) => {
              e.preventDefault();
              navegar(ruta);
              alNavegar?.();
            }}
            aria-current={actual === ruta ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent',
              actual === ruta && 'bg-accent font-medium text-amber-300',
            )}
          >
            <Icono className="size-4" aria-hidden />
            {titulo}
          </a>
        ),
      )}
    </nav>
  );
}

function Marca() {
  return (
    <div>
      <p className="font-semibold tracking-tight text-amber-300">{textos.app.nombre}</p>
      <p className="text-xs text-muted-foreground">{textos.app.lema}</p>
    </div>
  );
}

/** Esqueleto de la app: menú lateral en compu, barra con menú desplegable en celular. */
export function Marco({ actual, children }: { actual: string; children: ReactNode }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-border p-4 md:flex">
        <Marca />
        <Navegacion actual={actual} />
        <EdadSnapshot className="mt-auto" />
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
        <Marca />
        <Sheet open={menuAbierto} onOpenChange={setMenuAbierto}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={textos.menu.abrir}>
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="gap-6 p-4">
            <SheetHeader className="p-0">
              <SheetTitle>{textos.menu.titulo}</SheetTitle>
            </SheetHeader>
            <Navegacion actual={actual} alNavegar={() => setMenuAbierto(false)} />
            <EdadSnapshot className="mt-auto" />
          </SheetContent>
        </Sheet>
      </header>

      <main className="min-w-0 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
