import { useAhora } from '@/ahora';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ComoLeer, LeyendaFrescura, Precio, nombreCiudad } from '@/componentes/Precio';
import { resumir } from '@/buscar';
import { POR_ID, nivelItem, nombreItem } from '@/items';
import { usePrecios } from '@/precios';
import { cambiarParametros } from '@/ruta';
import { textos } from '@/textos/es';

const t = textos.detalle;

/** Panel lateral con el precio del ítem en cada ciudad. Se abre con ?item=ID en la URL. */
export function DetalleItem({ id }: { id: string | null }) {
  const { data } = usePrecios();
  const ahora = useAhora();
  const item = id === null ? undefined : POR_ID.get(id);
  const porCiudad = id === null ? undefined : data?.precios[id]?.['1'];
  const resumen = resumir(porCiudad, ahora);

  return (
    <Sheet
      open={id !== null}
      onOpenChange={(abierto) => {
        if (!abierto) cambiarParametros({ item: null });
      }}
    >
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="pr-8 text-lg">
            {item ? `${nombreItem(item)} ${nivelItem(item)}` : id}
          </SheetTitle>
          <SheetDescription>
            {item ? `${textos.grupos[item.grupo] ?? item.grupo} · ${item.id} · ` : ''}
            {textos.precios.calidad}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-6">
          {!item && <p className="text-sm text-amber-300">{t.noEncontrado}</p>}
          {item && data && !porCiudad && (
            <p className="text-sm text-muted-foreground">{t.sinDatos}</p>
          )}
          {item && data && porCiudad && (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t.ciudad}</TableHead>
                  <TableHead className="text-right" title={t.ayudaVenta}>
                    {t.venta}
                  </TableHead>
                  <TableHead className="text-right" title={t.ayudaCompra}>
                    {t.compra}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.ubicaciones.map((ciudad) => {
                  const precio = porCiudad[ciudad];
                  return (
                    <TableRow key={ciudad} className="hover:bg-transparent">
                      <TableCell className="align-top font-medium">
                        {nombreCiudad(ciudad)}
                      </TableCell>
                      <TableCell className="text-right align-top">
                        <div className="flex flex-col items-end gap-1">
                          <Precio punto={precio?.venta ?? null} className="items-end" />
                          {resumen.masBarato?.ciudad === ciudad && (
                            <Badge variant="secondary">{t.masBarato}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right align-top">
                        <div className="flex flex-col items-end gap-1">
                          <Precio punto={precio?.compra ?? null} className="items-end" />
                          {resumen.mejorOferta?.ciudad === ciudad && (
                            <Badge variant="secondary">{t.mejorOferta}</Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <div className="space-y-2 text-xs text-muted-foreground">
            <ComoLeer />
            <LeyendaFrescura />
            <p>{t.origen}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
