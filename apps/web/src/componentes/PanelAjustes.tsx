import { useId, type ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useAjustes, type Ajustes } from '@/ajustes';
import { textos } from '@/textos/es';

const t = textos.ajustes;

function Campo({
  etiqueta,
  ayuda,
  children,
  id,
}: {
  etiqueta: string;
  ayuda?: string;
  children: ReactNode;
  id: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{etiqueta}</Label>
      {children}
      {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
    </div>
  );
}

/** Campo numérico; `porcentaje` muestra 0.1 como 10. Vacío = null solo si `vacio` lo permite. */
function CampoNumero({
  etiqueta,
  ayuda,
  valor,
  cambiar,
  porcentaje = false,
  vacio = false,
  minimo = 0,
  maximo,
}: {
  etiqueta: string;
  ayuda?: string;
  valor: number | null;
  cambiar: (v: number | null) => void;
  porcentaje?: boolean;
  vacio?: boolean;
  minimo?: number;
  maximo?: number;
}) {
  const id = useId();
  const mostrado = valor === null ? '' : porcentaje ? Math.round(valor * 1000) / 10 : valor;
  return (
    <Campo etiqueta={etiqueta} {...(ayuda ? { ayuda } : {})} id={id}>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={minimo}
        {...(maximo !== undefined ? { max: maximo } : {})}
        value={mostrado}
        onChange={(e) => {
          if (e.target.value === '') {
            cambiar(vacio ? null : minimo);
            return;
          }
          const n = Number(e.target.value);
          if (!Number.isFinite(n)) return;
          const acotado = Math.min(Math.max(n, minimo), maximo ?? Infinity);
          cambiar(porcentaje ? acotado / 100 : acotado);
        }}
      />
    </Campo>
  );
}

export type CampoAjuste = keyof Ajustes;

/** Los ajustes que usa una pantalla; cada cambio se guarda y aplica en toda la app. */
export function PanelAjustes({ campos }: { campos: readonly CampoAjuste[] }) {
  const [a, cambiar] = useAjustes();
  const idPremium = useId();
  const idModo = useId();
  const mostrar = (c: CampoAjuste) => campos.includes(c);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t.titulo}</CardTitle>
        <CardDescription>{t.explicacion}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mostrar('capital') && (
          <CampoNumero
            etiqueta={t.capital}
            valor={a.capital}
            cambiar={(v) => cambiar({ capital: v ?? 0 })}
          />
        )}
        {mostrar('premium') && (
          <Campo etiqueta={t.premium} ayuda={t.ayudaPremium} id={idPremium}>
            <div className="flex h-9 items-center">
              <Switch
                id={idPremium}
                checked={a.premium}
                onCheckedChange={(premium) => cambiar({ premium })}
              />
            </div>
          </Campo>
        )}
        {mostrar('modoCompra') && (
          <Campo etiqueta={t.modoCompra} ayuda={t.ayudaModoCompra} id={idModo}>
            <Select
              value={a.modoCompra}
              onValueChange={(v) =>
                cambiar({ modoCompra: v === 'orden' ? 'orden' : 'instantanea' })
              }
            >
              <SelectTrigger id={idModo} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instantanea">{t.instantanea}</SelectItem>
                <SelectItem value="orden">{t.orden}</SelectItem>
              </SelectContent>
            </Select>
          </Campo>
        )}
        {mostrar('riesgoViaje') && (
          <CampoNumero
            etiqueta={t.riesgo}
            ayuda={t.ayudaRiesgo}
            valor={a.riesgoViaje}
            cambiar={(v) => cambiar({ riesgoViaje: v ?? 0 })}
            porcentaje
            maximo={100}
          />
        )}
        {mostrar('costoSet') && (
          <CampoNumero
            etiqueta={t.costoSet}
            valor={a.costoSet}
            cambiar={(v) => cambiar({ costoSet: v ?? 0 })}
          />
        )}
        {mostrar('exposicion') && (
          <CampoNumero
            etiqueta={t.exposicion}
            ayuda={t.ayudaExposicion}
            valor={a.exposicion}
            cambiar={(v) => cambiar({ exposicion: v ?? 0 })}
            porcentaje
            maximo={100}
          />
        )}
        {mostrar('carga') && (
          <CampoNumero
            etiqueta={t.carga}
            ayuda={t.ayudaCarga}
            valor={a.carga}
            cambiar={(v) => cambiar({ carga: v })}
            vacio
          />
        )}
        {mostrar('diasParaVender') && (
          <CampoNumero
            etiqueta={t.dias}
            valor={a.diasParaVender}
            cambiar={(v) => cambiar({ diasParaVender: v ?? 1 })}
            minimo={1}
          />
        )}
        {mostrar('miembros') && (
          <CampoNumero
            etiqueta={t.miembros}
            ayuda={t.ayudaMiembros}
            valor={a.miembros}
            cambiar={(v) => cambiar({ miembros: Math.round(v ?? 1) })}
            minimo={1}
          />
        )}
        {mostrar('tarifaEstacion') && (
          <CampoNumero
            etiqueta={t.tarifaEstacion}
            ayuda={t.ayudaTarifa}
            valor={a.tarifaEstacion}
            cambiar={(v) => cambiar({ tarifaEstacion: v ?? 0 })}
          />
        )}
      </CardContent>
    </Card>
  );
}
