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
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useId, useMemo } from 'react';
import { useAhora } from '@/ahora';
import { useAjustes } from '@/ajustes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AvisosPrecios } from '@/componentes/EstadoPrecios';
import { PanelAjustes } from '@/componentes/PanelAjustes';
import { LeyendaFrescura, Precio, nombreCiudad, pct, plata } from '@/componentes/Precio';
import { GRUPOS, ITEMS, nivelItem, nombreItem, type ItemLista } from '@/items';
import { SinSnapshot, usePrecios, useVolumen } from '@/precios';
import { esConfiable, oportunidades, type Oportunidad } from '@/radar';
import { cambiarParametros } from '@/ruta';
import { textos } from '@/textos/es';
import { DetalleOportunidad } from './DetalleOportunidad';

const t = textos.radar;
const TODOS = 'todos';

export interface FilaRadar {
  item: ItemLista;
  mejor: Oportunidad;
  otras: Oportunidad[];
}

const features = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns: { text: sortFn_text },
});

const columna = createColumnHelper<typeof features, FilaRadar>();
const columnas = columna.columns([
  columna.accessor((f) => f.item.nombre ?? f.item.id, {
    id: 'item',
    header: t.columnas.item,
    sortFn: 'text',
    cell: ({ row }) => {
      const { item } = row.original;
      return (
        <a
          href={`?item=${encodeURIComponent(item.id)}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            cambiarParametros({ item: item.id });
          }}
          className="flex flex-col leading-tight hover:text-amber-300 focus-visible:text-amber-300 focus-visible:outline-none"
        >
          <span className="font-medium">
            {nombreItem(item)} {nivelItem(item)}
          </span>
          <span className="text-xs text-muted-foreground">
            {textos.grupos[item.grupo] ?? item.grupo}
          </span>
        </a>
      );
    },
  }),
  columna.accessor((f) => f.mejor.costoUnidad, {
    id: 'compraEn',
    header: t.columnas.compraEn,
    cell: ({ row }) => {
      const o = row.original.mejor;
      return (
        <div className="space-y-1">
          <Precio punto={o.compra} ciudad={o.ciudad} />
          {o.raro.compra && <BadgeRaro />}
        </div>
      );
    },
  }),
  columna.accessor((f) => f.mejor.mercadoNegro.precio, {
    id: 'mnPaga',
    header: t.columnas.mnPaga,
    cell: ({ row }) => {
      const o = row.original.mejor;
      return (
        <div className="space-y-1">
          <Precio punto={o.mercadoNegro} />
          <p className="text-xs text-muted-foreground">
            {o.volumenMercadoNegro
              ? t.vendeDia(plata(o.volumenMercadoNegro.ventasDia))
              : t.sinVolumenCorto}
          </p>
          {o.raro.mercadoNegro && <BadgeRaro />}
        </div>
      );
    },
  }),
  columna.accessor((f) => f.mejor.gananciaUnidad, {
    id: 'ganasUnidad',
    header: t.columnas.ganasUnidad,
    cell: ({ row }) => {
      const o = row.original.mejor;
      return (
        <span className="flex flex-col leading-tight">
          <span className="font-medium tabular-nums text-emerald-400">
            {plata(o.gananciaUnidad)}
          </span>
          <span className="text-xs text-muted-foreground">{t.margen(pct(o.margen))}</span>
        </span>
      );
    },
  }),
  columna.accessor((f) => f.mejor.unidades, {
    id: 'cuantas',
    header: t.columnas.cuantas,
    cell: ({ row }) => {
      const o = row.original.mejor;
      return (
        <span className="flex flex-col leading-tight">
          <span className="font-medium tabular-nums">{plata(o.unidades)}</span>
          <span className="text-xs text-muted-foreground">
            {t.limitadoPor(t.limitante[o.limitante] ?? o.limitante)}
          </span>
        </span>
      );
    },
  }),
  columna.accessor((f) => f.mejor.inversion, {
    id: 'inversion',
    header: t.columnas.inversion,
    cell: ({ row }) => <span className="tabular-nums">{plata(row.original.mejor.inversion)}</span>,
  }),
  columna.accessor((f) => f.mejor.gananciaEsperada, {
    id: 'ganancia',
    header: t.columnas.ganancia,
    cell: ({ row }) => {
      const o = row.original.mejor;
      return (
        <span className="flex flex-col leading-tight">
          <span className="font-semibold tabular-nums text-amber-300">
            {plata(o.gananciaEsperada)}
          </span>
          <span className="text-xs text-muted-foreground">{o.viaje ? t.viaje : t.sinViaje}</span>
        </span>
      );
    },
  }),
]);

function BadgeRaro() {
  return (
    <Badge variant="destructive" title={t.ayudaRaro}>
      {t.raro}
    </Badge>
  );
}

export function MercadoNegro({ parametros }: { parametros: URLSearchParams }) {
  const precios = usePrecios();
  const volumen = useVolumen();
  const ahora = useAhora();
  const [ajustes] = useAjustes();
  const grupo = parametros.get('grupo');
  const todas = parametros.get('todas') === '1';
  const itemAbierto = parametros.get('item');
  const idConfiables = useId();

  const filas = useMemo<FilaRadar[]>(() => {
    if (!precios.data) return [];
    const resultado: FilaRadar[] = [];
    for (const item of ITEMS) {
      if (grupo !== null && item.grupo !== grupo) continue;
      const lista = oportunidades({
        porCiudad: precios.data.precios[item.id]?.['1'],
        volumen: volumen.data?.volumen[item.id]?.['1'],
        peso: item.peso,
        ajustes,
        ahora,
      }).filter((o) => todas || esConfiable(o));
      const [mejor, ...otras] = lista;
      if (mejor) resultado.push({ item, mejor, otras });
    }
    return resultado.sort((a, b) => b.mejor.gananciaEsperada - a.mejor.gananciaEsperada);
  }, [precios.data, volumen.data, ajustes, ahora, grupo, todas]);

  const tabla = useTable({
    features,
    columns: columnas,
    data: filas,
    initialState: { pagination: { pageIndex: 0, pageSize: 25 } },
  });
  const { pageIndex } = tabla.state.pagination;
  const paginas = Math.max(tabla.getPageCount(), 1);
  const primera = filas.find((f) => esConfiable(f.mejor));
  const abierta = filas.find((f) => f.item.id === itemAbierto) ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t.titulo}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.subtitulo}{' '}
          <Badge variant="secondary" className="ml-1 align-middle">
            {textos.precios.calidad}
          </Badge>
        </p>
      </header>

      <AvisosPrecios />

      {precios.data && (
        <p className="rounded-lg border border-amber-300/30 bg-amber-300/5 px-4 py-3 text-sm leading-relaxed">
          {primera
            ? t.recomendacion(
                plata(primera.mejor.unidades),
                `${nombreItem(primera.item)} ${nivelItem(primera.item)}`,
                nombreCiudad(primera.mejor.ciudad),
                plata(primera.mejor.compra.precio),
                plata(primera.mejor.mercadoNegro.precio),
                plata(primera.mejor.gananciaEsperada),
              )
            : t.sinRecomendacion}
        </p>
      )}
      {volumen.isSuccess && volumen.data === null && (
        <p className="text-sm text-amber-300">{t.sinVolumen}</p>
      )}

      <PanelAjustes
        campos={[
          'capital',
          'premium',
          'modoCompra',
          'riesgoViaje',
          'costoSet',
          'exposicion',
          'carga',
          'diasParaVender',
          'miembros',
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select
          value={grupo ?? TODOS}
          onValueChange={(v) =>
            cambiarParametros({ grupo: v === TODOS ? null : v }, { reemplazar: true })
          }
        >
          <SelectTrigger className="sm:w-56" aria-label={textos.precios.grupo}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>{textos.precios.todos}</SelectItem>
            {GRUPOS.map((g) => (
              <SelectItem key={g} value={g}>
                {textos.grupos[g] ?? g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2" title={t.ayudaConfiables}>
          <Switch
            id={idConfiables}
            checked={!todas}
            onCheckedChange={(solo) =>
              cambiarParametros({ todas: solo ? null : '1' }, { reemplazar: true })
            }
          />
          <Label htmlFor={idConfiables}>{t.soloConfiables}</Label>
        </div>
      </div>

      {precios.isError && (
        <p className="text-sm text-amber-300">
          {precios.error instanceof SinSnapshot ? textos.estado.sinSnapshot : textos.estado.error}
        </p>
      )}
      {precios.isPending && (
        <p className="text-sm text-muted-foreground">{textos.estado.cargando}</p>
      )}

      {precios.data && filas.length === 0 && (
        <p className="rounded-lg border border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {t.sinResultados}
        </p>
      )}

      {filas.length > 0 && (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              {tabla.getHeaderGroups().map((g) => (
                <TableRow key={g.id} className="hover:bg-transparent">
                  {g.headers.map((h) => {
                    const orden = h.column.getIsSorted();
                    return (
                      <TableHead key={h.id}>
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
                  onClick={() => cambiarParametros({ item: fila.original.item.id })}
                  className="cursor-pointer"
                >
                  {fila.getAllCells().map((celda) => (
                    <TableCell key={celda.id} className="py-2 align-top">
                      <tabla.FlexRender cell={celda} />
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
          <span className="text-muted-foreground">
            {textos.precios.pagina(pageIndex + 1, paginas)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => tabla.previousPage()}
            disabled={!tabla.getCanPreviousPage()}
          >
            <ChevronLeft />
            {textos.precios.anterior}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => tabla.nextPage()}
            disabled={!tabla.getCanNextPage()}
          >
            {textos.precios.siguiente}
            <ChevronRight />
          </Button>
        </div>
      )}

      <footer className="space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
        <LeyendaFrescura />
        <p>{t.nota}</p>
      </footer>

      <DetalleOportunidad fila={abierta} abierto={itemAbierto !== null} />
    </div>
  );
}
