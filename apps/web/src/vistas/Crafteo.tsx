import { frescura, type ModoOperacion } from '@gremio/core';
import { Search } from 'lucide-react';
import { useDeferredValue, useId, useMemo, type ReactNode } from 'react';
import { useAhora } from '@/ahora';
import { useAjustes } from '@/ajustes';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { MERCADO_NEGRO, filtrar, interpretarBusqueda, type ItemBuscable } from '@/buscar';
import {
  calcularCrafteo,
  mejorCiudad,
  precioMaterial,
  valorDelFoco,
  type BonoCiudad,
  type FichaCrafteo,
  type PrecioElegido,
} from '@/crafteo';
import datosBonos from '@/datos/bonos.json';
import datosRecetas from '@/datos/recetas.json';
import { INDICE, POR_ID, nivelItem, nombreItem } from '@/items';
import { usePrecios, type Punto } from '@/precios';
import { cambiarParametros } from '@/ruta';
import { textos } from '@/textos/es';

const t = textos.crafteo;
const FICHAS = datosRecetas as Record<string, FichaCrafteo>;
const BONOS = datosBonos as BonoCiudad[];
const INDICE_CRAFTEABLE = INDICE.filter(({ item }) => item.id in FICHAS);
const LA_MAS_BARATA = 'mas-barata';
const MAXIMO_RESULTADOS = 8;

function Campo({ etiqueta, id, children }: { etiqueta: string; id: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{etiqueta}</Label>
      {children}
    </div>
  );
}

function nombreConNivel(item: ItemBuscable | undefined, id: string): string {
  return item ? `${nombreItem(item)} ${nivelItem(item)}`.trim() : id;
}

/** Buscador de ítems crafteables; elegir uno lo pone en la URL. */
function ElegirItem({ texto }: { texto: string }) {
  const diferido = useDeferredValue(texto);
  const resultados = useMemo(
    () =>
      diferido.trim() === ''
        ? []
        : filtrar(INDICE_CRAFTEABLE, interpretarBusqueda(diferido), null).slice(
            0,
            MAXIMO_RESULTADOS,
          ),
    [diferido],
  );
  return (
    <div className="space-y-2">
      <label className="relative block">
        <span className="sr-only">{t.elegir}</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={texto}
          onChange={(e) => cambiarParametros({ q: e.target.value }, { reemplazar: true })}
          placeholder={t.buscar}
          className="pl-9"
        />
      </label>
      {resultados.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {resultados.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => cambiarParametros({ item: item.id, q: null, receta: null })}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <span>{nombreConNivel(item, item.id)}</span>
                <span className="text-xs text-muted-foreground">
                  {textos.grupos[item.grupo] ?? item.grupo}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Dato({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <div className="text-lg font-semibold tabular-nums">{children}</div>
    </div>
  );
}

export default function Crafteo({ parametros }: { parametros: URLSearchParams }) {
  const precios = usePrecios();
  const ahora = useAhora();
  const [ajustes] = useAjustes();
  const ids = {
    ciudad: useId(),
    receta: useId(),
    foco: useId(),
    mat: useId(),
    venta: useId(),
    modo: useId(),
  };

  const id = parametros.get('item');
  const ficha = id ? FICHAS[id] : undefined;
  const item = id ? POR_ID.get(id) : undefined;

  const ciudades = useMemo(
    () => BONOS.filter((c) => precios.data?.ubicaciones.includes(c.nombre) ?? false),
    [precios.data],
  );
  const indiceReceta = Number(parametros.get('receta') ?? 0);
  const receta = ficha?.recetas[indiceReceta] ?? ficha?.recetas[0];
  const ciudad =
    ciudades.find((c) => c.nombre === parametros.get('ciudad')) ??
    (ficha && ciudades.length > 0 ? mejorCiudad(ficha, ciudades) : undefined);
  const usarFoco = parametros.get('foco') === '1';
  const materialesEn = parametros.get('materiales') ?? LA_MAS_BARATA;
  const modoVenta: ModoOperacion = parametros.get('vender') === 'orden' ? 'orden' : 'instantanea';
  const venderEn = parametros.get('venderEn') ?? ciudad?.nombre ?? '';

  const preciosItem = (clave: string) => precios.data?.precios[clave]?.['1'];

  const elegidos = useMemo(() => {
    const mapa: Record<string, PrecioElegido | null> = {};
    for (const m of receta?.materiales ?? []) {
      mapa[m.id] = precioMaterial(
        precios.data?.precios[m.id]?.['1'],
        ajustes.modoCompra,
        materialesEn === LA_MAS_BARATA ? null : materialesEn,
        ahora,
      );
    }
    return mapa;
  }, [receta, precios.data, ajustes.modoCompra, materialesEn, ahora]);

  // Vender al Mercado Negro solo es a su orden de compra.
  const modoReal: ModoOperacion = venderEn === MERCADO_NEGRO ? 'instantanea' : modoVenta;
  const puntoVenta: Punto | null = (() => {
    const p = id ? preciosItem(id)?.[venderEn] : undefined;
    const punto = modoReal === 'instantanea' ? p?.compra : p?.venta;
    if (!punto || punto.precio <= 0 || frescura(new Date(punto.fecha), ahora) === 'rojo')
      return null;
    return punto;
  })();

  const resultado = (foco: boolean) =>
    ficha && receta && ciudad
      ? calcularCrafteo({
          ficha,
          receta,
          ciudad,
          usarFoco: foco,
          costoMaterial: Object.fromEntries(
            Object.entries(elegidos).map(([k, v]) => [k, v?.costo ?? null]),
          ),
          tarifaEstacion: ajustes.tarifaEstacion,
          venta: puntoVenta ? { precio: puntoVenta.precio, modo: modoReal } : null,
          premium: ajustes.premium,
        })
      : null;
  const calculo = resultado(usarFoco);
  const conFoco = resultado(true);
  const sinFoco = resultado(false);
  const valorFoco = conFoco && sinFoco && receta ? valorDelFoco(conFoco, sinFoco, receta) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
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

      <ElegirItem texto={parametros.get('q') ?? ''} />

      {!id && <p className="text-sm text-muted-foreground">{t.sinElegir}</p>}
      {id && !ficha && <p className="text-sm text-amber-300">{t.noCrafteable}</p>}

      {ficha && receta && ciudad && calculo && (
        <>
          <h2 className="text-xl font-semibold">{nombreConNivel(item, id ?? '')}</h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ficha.recetas.length > 1 && (
              <Campo etiqueta={t.receta} id={ids.receta}>
                <Select
                  value={String(indiceReceta)}
                  onValueChange={(v) => cambiarParametros({ receta: v }, { reemplazar: true })}
                >
                  <SelectTrigger id={ids.receta} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ficha.recetas.map((_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {t.opcion(i + 1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>
            )}
            <Campo etiqueta={t.ciudad} id={ids.ciudad}>
              <Select
                value={ciudad.nombre}
                onValueChange={(v) => cambiarParametros({ ciudad: v }, { reemplazar: true })}
              >
                <SelectTrigger id={ids.ciudad} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ciudades.map((c) => (
                    <SelectItem key={c.nombre} value={c.nombre}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            <Campo etiqueta={t.foco} id={ids.foco}>
              <div className="flex h-9 items-center">
                <Switch
                  id={ids.foco}
                  checked={usarFoco}
                  onCheckedChange={(v) =>
                    cambiarParametros({ foco: v ? '1' : null }, { reemplazar: true })
                  }
                />
              </div>
            </Campo>
            <Campo etiqueta={t.materialesEn} id={ids.mat}>
              <Select
                value={materialesEn}
                onValueChange={(v) =>
                  cambiarParametros(
                    { materiales: v === LA_MAS_BARATA ? null : v },
                    { reemplazar: true },
                  )
                }
              >
                <SelectTrigger id={ids.mat} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LA_MAS_BARATA}>{t.laMasBarata}</SelectItem>
                  {ciudades.map((c) => (
                    <SelectItem key={c.nombre} value={c.nombre}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            <Campo etiqueta={t.venderEn} id={ids.venta}>
              <Select
                value={venderEn}
                onValueChange={(v) => cambiarParametros({ venderEn: v }, { reemplazar: true })}
              >
                <SelectTrigger id={ids.venta} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(precios.data?.ubicaciones ?? []).map((u) => (
                    <SelectItem key={u} value={u}>
                      {nombreCiudad(u)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            {venderEn !== MERCADO_NEGRO && (
              <Campo etiqueta={t.modoVenta} id={ids.modo}>
                <Select
                  value={modoVenta}
                  onValueChange={(v) =>
                    cambiarParametros(
                      { vender: v === 'orden' ? 'orden' : null },
                      { reemplazar: true },
                    )
                  }
                >
                  <SelectTrigger id={ids.modo} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instantanea">{t.ventaInstantanea}</SelectItem>
                    <SelectItem value="orden">{t.ventaOrden}</SelectItem>
                  </SelectContent>
                </Select>
              </Campo>
            )}
          </div>

          <PanelAjustes campos={['premium', 'modoCompra', 'tarifaEstacion']} />

          <Card size="sm">
            <CardHeader>
              <CardTitle>{t.retorno(pct(calculo.rrr))}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {t.explicaRetorno(
                  pct(calculo.bonos.base),
                  pct(calculo.bonos.especialidad),
                  pct(calculo.bonos.foco),
                )}{' '}
                {t.produce(plata(receta.cantidadProducida))}
                {receta.foco !== null && ` · ${t.focoBase(plata(receta.foco))}`}
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{t.material}</TableHead>
                    <TableHead className="text-right">{t.cantidad}</TableHead>
                    <TableHead className="text-right">{t.seGasta}</TableHead>
                    <TableHead className="text-right">{t.precio}</TableHead>
                    <TableHead className="text-right">{t.subtotal}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receta.materiales.map((m) => {
                    const elegido = elegidos[m.id] ?? null;
                    const linea = calculo.costo.ok
                      ? calculo.costo.lineas.find((l) => l.id === m.id)
                      : undefined;
                    const efectiva = m.seRegresa ? m.cantidad * (1 - calculo.rrr) : m.cantidad;
                    return (
                      <TableRow key={m.id} className="hover:bg-transparent">
                        <TableCell className="align-top">
                          {nombreConNivel(POR_ID.get(m.id), m.id)}
                          {!m.seRegresa && (
                            <Badge variant="outline" className="ml-2">
                              {t.noSeRegresa}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right align-top tabular-nums">
                          {plata(m.cantidad)}
                        </TableCell>
                        <TableCell className="text-right align-top tabular-nums">
                          {efectiva.toLocaleString('es-MX', { maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right align-top">
                          {elegido ? (
                            <Precio
                              punto={elegido.punto}
                              ciudad={elegido.ciudad}
                              className="items-end"
                            />
                          ) : (
                            <span className="text-xs text-amber-300">{t.sinPrecio}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right align-top tabular-nums">
                          {linea ? plata(linea.subtotal) : textos.sinDato}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {!calculo.costo.ok && (
            <p className="text-sm text-amber-300">
              {t.faltanPrecios(
                calculo.costo.sinPrecio.map((m) => nombreConNivel(POR_ID.get(m), m)).join(', '),
              )}
            </p>
          )}
          {calculo.costo.ok && !puntoVenta && (
            <p className="text-sm text-amber-300">{t.sinPrecioVenta}</p>
          )}

          {calculo.costo.ok && (
            <div className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
              <Dato titulo={t.costoUnidad}>{plata(calculo.costo.porUnidad)}</Dato>
              <Dato titulo={t.teQueda}>
                {calculo.venta ? plata(calculo.venta.neto) : textos.sinDato}
                {puntoVenta && (
                  <Precio punto={puntoVenta} ciudad={venderEn} className="text-sm font-normal" />
                )}
              </Dato>
              <Dato titulo={t.ganancia}>
                {calculo.gananciaUnidad === null ? (
                  textos.sinDato
                ) : (
                  <span
                    className={calculo.gananciaUnidad >= 0 ? 'text-emerald-400' : 'text-red-400'}
                  >
                    {plata(calculo.gananciaUnidad)}
                    {calculo.costo.porUnidad > 0 && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {textos.radar.margen(pct(calculo.gananciaUnidad / calculo.costo.porUnidad))}
                      </span>
                    )}
                  </span>
                )}
              </Dato>
              <Dato titulo={t.valorFoco}>
                <span title={t.valorFocoAyuda}>
                  {valorFoco === null
                    ? textos.sinDato
                    : valorFoco.toLocaleString('es-MX', { maximumFractionDigits: 2 })}
                </span>
              </Dato>
            </div>
          )}
          {calculo.gananciaUnidad !== null && calculo.gananciaUnidad < 0 && (
            <p className="text-sm text-red-400">{t.perdida}</p>
          )}

          <footer className="space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
            <LeyendaFrescura />
            <p>{t.valorFocoAyuda}</p>
            <p>{t.notaDiarios}</p>
            <p>{t.notaCalidad}</p>
          </footer>
        </>
      )}
    </div>
  );
}
