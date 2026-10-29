/** Todos los textos visibles de la app. Tono: compañero de gremio, de tú, frases cortas. */
export const textos = {
  app: {
    nombre: 'Gremio Ops',
    lema: 'Economía de gremio para Albion',
  },
  menu: {
    abrir: 'Abrir menú',
    titulo: 'Menú',
    pronto: 'Pronto',
    secciones: {
      precios: 'Precios',
      mercadoNegro: 'Mercado Negro',
      crafteo: 'Crafteo',
      bitacora: 'Bitácora',
      aprende: 'Aprende',
    },
  },
  estado: {
    cargando: 'Trayendo precios…',
    error:
      'No pudimos traer los precios. Puede que el servidor esté despertando; recarga en un minuto.',
    sinSnapshot:
      'Todavía no hay precios guardados. Se actualizan cada 15 minutos; vuelve en un ratito.',
    actualizado: (hace: string) => `Precios actualizados ${hace}`,
    descargaAtrasada: (hace: string) =>
      `Ojo: los precios no se actualizan desde ${hace}. Puede que la API de precios esté saturada o que la descarga automática esté pausada; ves el último precio conocido con su antigüedad real.`,
    lotesFallidos:
      'Ojo: en la última actualización algunos ítems no se pudieron bajar; ves su último precio conocido con su antigüedad real.',
  },
  precios: {
    titulo: 'Precios',
    subtitulo: (total: string) =>
      `Busca cualquiera de los ${total} ítems que seguimos y mira cuánto cuesta en cada ciudad.`,
    calidad: 'Calidad normal',
    buscar: 'Buscar ítem',
    buscarEjemplo: 'Ej.: arco largo 6.1, tablas t5, corona…',
    grupo: 'Grupo',
    todos: 'Todos los grupos',
    resultados: (n: string) => `${n} ítems`,
    sinResultados:
      'No encontramos nada con esa búsqueda. Prueba con menos palabras o quita el filtro de grupo.',
    columnas: {
      item: 'Ítem',
      nivel: 'Nivel',
      masBarato: 'Más barato',
      mejorOferta: 'Mejor oferta',
      mercadoNegro: 'Mercado Negro paga',
    },
    ayudaColumnas: {
      masBarato: 'La orden de venta más barata entre las ciudades: lo que pagas si compras ya.',
      mejorOferta: 'La orden de compra más alta entre las ciudades: lo que te pagan si vendes ya.',
      mercadoNegro: 'Lo que paga el Mercado Negro de Caerleon si le vendes ya.',
    },
    sinReciente: 'Sin precio reciente',
    pagina: (actual: number, total: number) => `Página ${actual} de ${total}`,
    anterior: 'Anterior',
    siguiente: 'Siguiente',
    nota: 'Los resúmenes de la tabla solo usan precios de menos de 6 horas, para que un precio viejo no te engañe. Abre un ítem para ver todas las ciudades con la antigüedad de cada precio.',
  },
  detalle: {
    ciudad: 'Ciudad',
    venta: 'Venta',
    compra: 'Compra',
    ayudaVenta: 'Venta: lo que pagas si compras al instante (orden de venta más barata).',
    ayudaCompra: 'Compra: lo que te pagan si vendes al instante (orden de compra más alta).',
    masBarato: 'Más barato',
    mejorOferta: 'Mejor oferta',
    noEncontrado: 'Ese ítem no está en la lista que seguimos.',
    sinDatos:
      'Nadie ha visto este ítem en el mercado últimamente. Los precios los suben jugadores con el cliente del Albion Data Project; si nadie pasa por esa ciudad, no hay dato.',
    origen:
      'Los precios los suben jugadores con el cliente del Albion Data Project. Una ciudad vacía significa que nadie la ha visto, no que valga cero.',
  },
  frescura: {
    titulo: 'Qué significan los colores',
    verde: 'Visto hace menos de 1 hora',
    amarillo: 'Entre 1 y 6 horas',
    rojo: 'Más de 6 horas: tómalo con pinzas',
  },
  grupos: {
    arcos: 'Arcos',
    recursos: 'Recursos',
    cuero: 'Armaduras de cuero',
    'capas-bolsas': 'Capas y bolsas',
    consumibles: 'Comida y pociones',
    lujo: 'Bienes de lujo',
  } as Record<string, string>,
  ciudades: {
    'Black Market': 'Mercado Negro',
  } as Record<string, string>,
  sinDato: '—',
  sinNombre: 'Sin nombre en el catálogo',
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
