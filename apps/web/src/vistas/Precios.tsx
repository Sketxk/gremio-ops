import {
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_text,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useDeferredValue, useMemo } from 'react';
import { useAhora } from '@/ahora';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AvisosPrecios } from '@/componentes/EstadoPrecios';
import { ComoLeer, LeyendaFrescura, Precio, formato } from '@/componentes/Precio';
import { filtrar, interpretarBusqueda, resumir, type ItemBuscable, type Resumen } from '@/buscar';
import { GRUPOS, INDICE, ITEMS, nivelItem, nombreItem } from '@/items';
import { SinSnapshot, usePrecios } from '@/precios';
import { cambiarParametros } from '@/ruta';
import { textos } from '@/textos/es';
import { DetalleItem } from './DetalleItem';

const t = textos.precios;
const TODOS = 'todos';
const POR_PAGINA = 50;

interface Fila {
  item: ItemBuscable;
  resumen: Resumen;
}

const features = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns: { text: sortFn_text },
});

const columna = createColumnHelper<typeof features, Fila>();
const columnas = columna.columns([
  columna.accessor((f) => f.item.nombre ?? f.item.id, {
    id: 'item',
    header: t.columnas.item,
    sortFn: 'text',
    cell: ({ row }) => <CeldaItem item={row.original.item} />,
  }),
  columna.accessor((f) => (f.item.tier ?? 0) * 10 + f.item.encantamiento, {
    id: 'nivel',
    header: t.columnas.nivel,
    cell: ({ row }) => <span className="tabular-nums">{nivelItem(row.original.item)}</span>,
  }),
  columna.accessor((f) => f.resumen.masBarato?.punto.precio, {
    id: 'masBarato',
    header: t.columnas.masBarato,
    sortUndefined: 'last',
    cell: ({ row }) => <CeldaMejor mejor={row.original.resumen.masBarato} />,
  }),
  columna.accessor((f) => f.resumen.mejorOferta?.punto.precio, {
    id: 'mejorOferta',
    header: t.columnas.mejorOferta,
    sortUndefined: 'last',
    cell: ({ row }) => <CeldaMejor mejor={row.original.resumen.mejorOferta} />,
  }),
  columna.accessor((f) => f.resumen.mercadoNegro?.precio, {
    id: 'mercadoNegro',
    header: t.columnas.mercadoNegro,
    sortUndefined: 'last',
    cell: ({ row }) => {
      const punto = row.original.resumen.mercadoNegro;
      return punto ? <Precio punto={punto} /> : <SinReciente />;
    },
  }),
]);

const AYUDA: Record<string, string> = t.ayudaColumnas;

function abrir(id: string) {
  cambiarParametros({ item: id });
}

function CeldaItem({ item }: { item: ItemBuscable }) {
  return (
    <a
      href={`?item=${encodeURIComponent(item.id)}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        abrir(item.id);
      }}
      className="flex flex-col leading-tight hover:text-amber-300 focus-visible:text-amber-300 focus-visible:outline-none"
    >
      <span className="font-medium">{nombreItem(item)}</span>
      <span className="text-xs text-muted-foreground">
        {textos.grupos[item.grupo] ?? item.grupo}
      </span>
    </a>
  );
}

function CeldaMejor({ mejor }: { mejor: Resumen['masBarato'] }) {
  return mejor ? <Precio punto={mejor.punto} ciudad={mejor.ciudad} /> : <SinReciente />;
}

function SinReciente() {
  return <span className="text-xs text-muted-foreground">{t.sinReciente}</span>;
}

export function Precios({ parametros }: { parametros: URLSearchParams }) {
  const consulta = usePrecios();
  const ahora = useAhora();
  const texto = parametros.get('q') ?? '';
  const grupo = parametros.get('grupo');
  const itemAbierto = parametros.get('item');

  const textoDiferido = useDeferredValue(texto);
  const encontrados = useMemo(
    () => filtrar(INDICE, interpretarBusqueda(textoDiferido), grupo),
    [textoDiferido, grupo],
  );
  const filas = useMemo<Fila[]>(
    () =>
      encontrados.map((item) => ({
        item,
        resumen: resumir(consulta.data?.precios[item.id]?.['1'], ahora),
      })),
    [encontrados, consulta.data, ahora],
  );

  const tabla = useTable({
    features,
    columns: columnas,
    data: filas,
    initialState: { pagination: { pageIndex: 0, pageSize: POR_PAGINA } },
  });
  const { pageIndex } = tabla.state.pagination;
  const paginas = Math.max(tabla.getPageCount(), 1);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t.titulo}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.subtitulo(formato.format(ITEMS.length))}{' '}
          <Badge variant="secondary" className="ml-1 align-middle">
            {t.calidad}
          </Badge>
        </p>
      </header>

      <AvisosPrecios />

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">{t.buscar}</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={texto}
            onChange={(e) => cambiarParametros({ q: e.target.value }, { reemplazar: true })}
            placeholder={t.buscarEjemplo}
            className="pl-9"
            autoFocus
          />
        </label>
        <Select
          value={grupo ?? TODOS}
          onValueChange={(v) =>
            cambiarParametros({ grupo: v === TODOS ? null : v }, { reemplazar: true })
          }
        >
          <SelectTrigger className="sm:w-56" aria-label={t.grupo}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>{t.todos}</SelectItem>
            {GRUPOS.map((g) => (
              <SelectItem key={g} value={g}>
                {textos.grupos[g] ?? g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {consulta.isError && (
        <p className="text-sm text-amber-300">
          {consulta.error instanceof SinSnapshot ? textos.estado.sinSnapshot : textos.estado.error}
        </p>
      )}

      <p className="text-sm text-muted-foreground">
        {t.resultados(formato.format(encontrados.length))}
      </p>

      {encontrados.length === 0 ? (
        <p className="rounded-lg border border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {t.sinResultados}
        </p>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              {tabla.getHeaderGroups().map((grupoEncabezados) => (
                <TableRow key={grupoEncabezados.id} className="hover:bg-transparent">
                  {grupoEncabezados.headers.map((h) => {
                    const orden = h.column.getIsSorted();
                    return (
                      <TableHead key={h.id} title={AYUDA[h.column.id]}>
                        <button
                          type="button"
                          onClick={h.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          <tabla.FlexRender header={h} />
                          {orden === 'asc' && <ArrowUp className="size-3" aria-hidden />}
                          {orden === 'desc' && <ArrowDown className="size-3" aria-hidden />}
                        </button>
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {tabla.getRowModel().rows.map((fila) => (
                <TableRow
                  key={fila.id}
                  onClick={() => abrir(fila.original.item.id)}
                  className="cursor-pointer"
                >
                  {fila.getAllCells().map((celda) => (
                    <TableCell key={celda.id} className="py-2 align-top">
                      {consulta.isPending &&
                      celda.column.id !== 'item' &&
                      celda.column.id !== 'nivel' ? (
                        <Skeleton className="h-8 w-20" />
                      ) : (
                        <tabla.FlexRender cell={celda} />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {paginas > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground">{t.pagina(pageIndex + 1, paginas)}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => tabla.previousPage()}
            disabled={!tabla.getCanPreviousPage()}
          >
            <ChevronLeft />
            {t.anterior}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => tabla.nextPage()}
            disabled={!tabla.getCanNextPage()}
          >
            {t.siguiente}
            <ChevronRight />
          </Button>
        </div>
      )}

      <footer className="space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
        <ComoLeer />
        <LeyendaFrescura />
        <p>{t.nota}</p>
      </footer>

      <DetalleItem id={itemAbierto} />
    </div>
  );
}
