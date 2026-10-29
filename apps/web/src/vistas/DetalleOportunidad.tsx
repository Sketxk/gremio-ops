import { tasaImpuestoVenta } from '@gremio/core';
import { useAjustes } from '@/ajustes';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Precio, nombreCiudad, pct, plata } from '@/componentes/Precio';
import { nivelItem, nombreItem } from '@/items';
import type { Oportunidad } from '@/radar';
import { cambiarParametros } from '@/ruta';
import { textos } from '@/textos/es';
import type { FilaRadar } from './MercadoNegro';

const t = textos.cuenta;
const r = textos.radar;

/** La cuenta paso a paso, en palabras, de una jugada al Mercado Negro. */
function Cuenta({ o }: { o: Oportunidad }) {
  const [{ premium, riesgoViaje }] = useAjustes();
  const pasos = [
    t.compra(plata(o.unidades), plata(o.compra.precio), nombreCiudad(o.ciudad)),
    o.comisionUnidad > 0 ? t.comision(plata(o.comisionUnidad)) : t.sinComision,
    t.venta(plata(o.mercadoNegro.precio)),
    t.impuesto(pct(tasaImpuestoVenta(premium)), plata(o.impuestoUnidad)),
    t.neto(plata(o.ingresoUnidad)),
    t.porUnidad(plata(o.gananciaUnidad), pct(o.margen)),
    t.total(plata(o.inversion), plata(o.gananciaSiLlegas)),
  ];
  if (o.viaje && riesgoViaje > 0) pasos.push(t.riesgo(pct(riesgoViaje), plata(o.gananciaEsperada)));
  return (
    <div className="space-y-3">
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        {pasos.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ol>
      <div className="text-sm">
        <p className="mb-1 text-muted-foreground">{t.limites}</p>
        <ul className="space-y-0.5">
          {(['capital', 'exposicion', 'carga', 'mercado'] as const).map((l) => (
            <li key={l} className={l === o.limitante ? 'font-medium text-amber-300' : ''}>
              {r.limitante[l]}: {Number.isFinite(o.limites[l]) ? plata(o.limites[l]) : t.infinito}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function DetalleOportunidad({
  fila,
  abierto,
}: {
  fila: FilaRadar | null;
  abierto: boolean;
}) {
  return (
    <Sheet
      open={abierto}
      onOpenChange={(a) => {
        if (!a) cambiarParametros({ item: null });
      }}
    >
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="pr-8 text-lg">
            {fila ? `${nombreItem(fila.item)} ${nivelItem(fila.item)}` : t.titulo}
          </SheetTitle>
          <SheetDescription>{t.titulo}</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-4 pb-6">
          {!fila && <p className="text-sm text-muted-foreground">{r.sinResultados}</p>}
          {fila && (
            <>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{r.columnas.compraEn}</p>
                  <Precio punto={fila.mejor.compra} ciudad={fila.mejor.ciudad} />
                </div>
                <div>
                  <p className="text-muted-foreground">{r.columnas.mnPaga}</p>
                  <Precio punto={fila.mejor.mercadoNegro} />
                </div>
              </div>
              {(fila.mejor.raro.compra || fila.mejor.raro.mercadoNegro) && (
                <p className="text-sm text-red-400">{r.ayudaRaro}</p>
              )}
              <Cuenta o={fila.mejor} />
              {fila.otras.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">{t.otrasCiudades}</h3>
                  <ul className="space-y-2 text-sm">
                    {fila.otras.map((o) => (
                      <li key={o.ciudad} className="flex items-start justify-between gap-4">
                        <Precio punto={o.compra} ciudad={o.ciudad} />
                        <span className="text-right">
                          <span className="block font-medium text-amber-300 tabular-nums">
                            {plata(o.gananciaEsperada)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {plata(o.unidades)} · {r.limitadoPor(r.limitante[o.limitante] ?? '')}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
