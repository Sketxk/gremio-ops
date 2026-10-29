import { frescura, type Frescura } from '@gremio/core';
import { useQuery } from '@tanstack/react-query';
import items from './datos/items.json';
import { SinSnapshot, traerPrecios, type Punto } from './precios';
import { textos } from './textos/es';

const t = textos.pruebaDeVida;

/** Selección fija para la prueba de vida: arcos largos, arcos, tablas y troncos. */
const MUESTRA = [
  'T4_2H_LONGBOW',
  'T5_2H_LONGBOW',
  'T6_2H_LONGBOW',
  'T7_2H_LONGBOW',
  'T8_2H_LONGBOW',
  'T4_2H_LONGBOW@1',
  'T4_2H_LONGBOW@2',
  'T4_2H_LONGBOW@3',
  'T4_2H_BOW',
  'T5_2H_BOW',
  'T4_PLANKS',
  'T5_PLANKS',
  'T6_PLANKS',
  'T7_PLANKS',
  'T8_PLANKS',
  'T4_WOOD',
  'T5_WOOD',
  'T6_WOOD',
  'T7_WOOD',
  'T8_WOOD',
];

/** La descarga corre cada 15 minutos y GitHub a veces la retrasa; 45 min sin actualizar ya es para avisar. */
const MINUTOS_DESCARGA_ATRASADA = 45;

const porId = new Map(items.map((i) => [i.id, i]));
const formato = new Intl.NumberFormat('es-MX');

const COLOR: Record<Frescura, string> = {
  verde: 'text-emerald-400',
  amarillo: 'text-amber-300',
  rojo: 'text-red-400',
};

function minutosDesde(fecha: string, ahora: Date): number {
  return (ahora.getTime() - new Date(fecha).getTime()) / 60_000;
}

function Celda({ punto, tipo, ahora }: { punto: Punto | null; tipo: string; ahora: Date }) {
  if (punto === null) return <span className="text-zinc-600">{t.sinDato}</span>;
  const hace = textos.tiempo.hace(minutosDesde(punto.fecha, ahora));
  return (
    <span
      className={`tabular-nums ${COLOR[frescura(new Date(punto.fecha), ahora)]}`}
      title={t.tooltip(tipo, formato.format(punto.precio), hace)}
    >
      {formato.format(punto.precio)}
    </span>
  );
}

function nombreItem(id: string): string {
  const item = porId.get(id);
  const nombre = item?.nombre ?? t.sinNombre;
  const tier = item?.tier ?? '?';
  return `${nombre} ${tier}.${item?.encantamiento ?? 0}`;
}

export function App() {
  const consulta = useQuery({
    queryKey: ['precios'],
    queryFn: traerPrecios,
    refetchInterval: 60_000,
    retry: (intentos, error) => !(error instanceof SinSnapshot) && intentos < 2,
  });
  const ahora = new Date();

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-4">
        <p className="text-sm text-amber-300/80">{textos.app.nombre}</p>
        <h1 className="text-2xl font-semibold">{t.titulo}</h1>
        <p className="mt-1 text-sm text-zinc-400">{t.subtitulo}</p>
      </header>

      {consulta.isPending && <p className="text-zinc-400">{t.cargando}</p>}
      {consulta.isError && (
        <p className="text-amber-300">
          {consulta.error instanceof SinSnapshot ? t.sinSnapshot : t.error}
        </p>
      )}

      {consulta.data && (
        <>
          <p className="mb-2 text-sm text-zinc-400">
            {t.actualizado(textos.tiempo.hace(minutosDesde(consulta.data.generado, ahora)))}
          </p>
          {minutosDesde(consulta.data.generado, ahora) > MINUTOS_DESCARGA_ATRASADA && (
            <p className="mb-2 text-sm text-amber-300">
              {t.descargaAtrasada(textos.tiempo.hace(minutosDesde(consulta.data.generado, ahora)))}
            </p>
          )}
          {consulta.data.lotes.fallidos > 0 && (
            <p className="mb-2 text-sm text-amber-300">{t.lotesFallidos}</p>
          )}
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 text-zinc-300">
                <tr>
                  <th className="sticky left-0 bg-zinc-900 px-3 py-2 text-left font-medium">
                    {t.columnaItem}
                  </th>
                  {consulta.data.ubicaciones.map((ciudad) => (
                    <th key={ciudad} className="px-3 py-2 text-right font-medium whitespace-nowrap">
                      {ciudad}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MUESTRA.map((id) => {
                  const porCiudad = consulta.data.precios[id]?.['1'] ?? {};
                  return (
                    <tr key={id} className="border-t border-zinc-800">
                      <td className="sticky left-0 bg-zinc-950 px-3 py-2 whitespace-nowrap">
                        {nombreItem(id)}
                      </td>
                      {consulta.data.ubicaciones.map((ciudad) => {
                        const precio = porCiudad[ciudad];
                        return (
                          <td key={ciudad} className="px-3 py-2 text-right whitespace-nowrap">
                            <div>
                              <span className="mr-1 text-xs text-zinc-500">{t.venta}</span>
                              <Celda punto={precio?.venta ?? null} tipo={t.venta} ahora={ahora} />
                            </div>
                            <div>
                              <span className="mr-1 text-xs text-zinc-500">{t.compra}</span>
                              <Celda punto={precio?.compra ?? null} tipo={t.compra} ahora={ahora} />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <section className="mt-4 text-sm text-zinc-400">
            <h2 className="mb-1 font-medium text-zinc-300">{t.leyenda.titulo}</h2>
            <ul className="space-y-0.5">
              <li className={COLOR.verde}>{t.leyenda.verde}</li>
              <li className={COLOR.amarillo}>{t.leyenda.amarillo}</li>
              <li className={COLOR.rojo}>{t.leyenda.rojo}</li>
              <li>{t.leyenda.venta}</li>
              <li>{t.leyenda.compra}</li>
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
