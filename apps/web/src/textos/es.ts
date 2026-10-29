/** Todos los textos visibles de la app. Tono: compañero de gremio, de tú, frases cortas. */
export const textos = {
  app: {
    nombre: 'Gremio Ops',
  },
  pruebaDeVida: {
    titulo: 'Precios en vivo',
    subtitulo:
      'Página de prueba: 20 ítems con su precio en cada ciudad. Todavía no es el diseño final.',
    actualizado: (hace: string) => `Precios actualizados ${hace}.`,
    cargando: 'Trayendo precios…',
    error:
      'No pudimos traer los precios. Puede que el servidor esté despertando; recarga en un minuto.',
    sinSnapshot:
      'Todavía no hay precios guardados. Se actualizan cada 15 minutos; vuelve en un ratito.',
    descargaAtrasada: (hace: string) =>
      `Ojo: los precios no se actualizan desde ${hace}. Puede que la API de precios esté saturada; ves el último precio conocido con su antigüedad real.`,
    lotesFallidos:
      'Ojo: en la última actualización algunos ítems no se pudieron bajar; ves su último precio conocido con su antigüedad real.',
    columnaItem: 'Ítem',
    venta: 'Venta',
    compra: 'Compra',
    sinDato: '—',
    sinNombre: 'Sin nombre',
    leyenda: {
      titulo: 'Qué significan los colores',
      verde: 'Visto hace menos de 1 hora',
      amarillo: 'Entre 1 y 6 horas',
      rojo: 'Más de 6 horas: tómalo con pinzas',
      venta: 'Venta: lo que pagas si compras al instante (orden de venta más barata).',
      compra: 'Compra: lo que te pagan si vendes al instante (orden de compra más alta).',
    },
    tooltip: (tipo: string, precio: string, hace: string) =>
      `${tipo}: ${precio} de plata, visto ${hace}`,
  },
  tiempo: {
    hace: (minutos: number) => {
      if (minutos < 1) return 'hace un momento';
      if (minutos < 60) return `hace ${Math.round(minutos)} min`;
      const horas = minutos / 60;
      if (horas < 24) return `hace ${Math.round(horas)} h`;
      return `hace ${Math.round(horas / 24)} días`;
    },
  },
} as const;
