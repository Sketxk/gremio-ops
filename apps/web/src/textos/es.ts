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
  ajustes: {
    titulo: 'Tus números',
    explicacion:
      'Con esto ajustamos todas las cuentas a ti. Se guardan en este navegador; cuando haya inicio de sesión, pasan a tu perfil.',
    capital: 'Plata con la que cuentas',
    premium: 'Tengo premium',
    ayudaPremium: 'Con premium pagas 4% de impuesto al vender; sin premium, 8%.',
    modoCompra: 'Cómo compras',
    instantanea: 'Al instante',
    orden: 'Poniendo orden de compra',
    ayudaModoCompra:
      'Al instante pagas la orden de venta más barata. Con orden pagas menos, pero 2.5% de comisión y tienes que esperar a que alguien te venda.',
    riesgo: 'Probabilidad de morir en el viaje (%)',
    ayudaRiesgo:
      'Qué tan seguido te matan yendo a Caerleon. Si no lo sabes, déjalo en 0 y lleva poca carga.',
    costoSet: 'Lo que vale tu equipo',
    exposicion: 'Máximo de tu plata por viaje (%)',
    ayudaExposicion:
      'Regla de seguridad: si te matan, solo pierdes esta parte. Comprar en Caerleon no cuenta porque no viajas.',
    carga: 'Carga de tu montura (kg)',
    ayudaCarga: 'Déjalo vacío si no te quieres limitar por peso.',
    dias: 'Días para terminar de vender',
    miembros: 'Del gremio haciendo lo mismo',
    ayudaMiembros: 'Si varios compran lo mismo, se reparten lo que el Mercado Negro compra.',
    tarifaEstacion: 'Tarifa de la estación por crafteo',
    ayudaTarifa:
      'La ves en la ventana de crafteo del juego. Cambia según quién sea dueño de la estación.',
  },
  radar: {
    titulo: 'Mercado Negro',
    subtitulo:
      'Qué comprar en las ciudades para vendérselo al Mercado Negro de Caerleon, ajustado a tu plata.',
    recomendacion: (
      unidades: string,
      item: string,
      ciudad: string,
      precio: string,
      paga: string,
      ganancia: string,
    ) =>
      `Con tu plata: compra ${unidades} ${item} en ${ciudad} a ${precio} cada uno y véndelos al Mercado Negro en ${paga}. Te quedan unos ${ganancia} limpios, ya sin impuestos.`,
    sinRecomendacion:
      'Ahorita no hay una jugada confiable con estos números: o los precios están viejos, o no hay volumen, o algo se ve raro. Vuelve en un rato; los precios se renuevan cada 15 minutos.',
    sinVolumen:
      'Todavía no tenemos el volumen de ventas del Mercado Negro, así que no sabemos cuántos compra al día. Mientras llega (se baja una vez al día), compra pocos.',
    soloConfiables: 'Solo jugadas confiables',
    ayudaConfiables:
      'Confiable = sabemos cuántos compra el Mercado Negro al día y ningún precio se ve fuera de lo normal.',
    columnas: {
      item: 'Ítem',
      compraEn: 'Compra en',
      mnPaga: 'Mercado Negro paga',
      ganasUnidad: 'Te queda por unidad',
      cuantas: 'Cuántas',
      inversion: 'Inviertes',
      ganancia: 'Ganancia esperada',
    },
    margen: (pct: string) => `${pct} de lo que pones`,
    vendeDia: (n: string) => `Compra ~${n} al día`,
    sinVolumenCorto: 'Sin dato de volumen',
    raro: 'Precio raro',
    ayudaRaro:
      'Este precio está a más de la mitad de distancia de su mediana de 7 días. Puede ser un error o una trampa; revísalo en el juego antes de comprar.',
    viaje: 'Viaje',
    sinViaje: 'Sin viaje',
    limitante: {
      capital: 'tu plata',
      carga: 'tu montura',
      exposicion: 'tu máximo por viaje',
      mercado: 'lo que compra el Mercado Negro',
    } as Record<string, string>,
    limitadoPor: (que: string) => `Limita: ${que}`,
    sinResultados:
      'Con estos filtros no hay nada que deje ganancia con precios recientes. Prueba con otro grupo o quita "Solo jugadas confiables".',
    nota: 'Cada fila supone que usas toda tu plata en esa jugada; no se suman entre sí. Solo usamos precios de menos de 6 horas. Ojo: no sabemos cuántas unidades hay en cada orden, así que si compras muchas, el precio puede subir.',
  },
  cuenta: {
    titulo: '¿De dónde sale este número?',
    compra: (unidades: string, precio: string, ciudad: string) =>
      `Compras ${unidades} a ${precio} cada uno en ${ciudad}.`,
    comision: (monto: string) => `Poner la orden de compra cuesta 2.5%: ${monto} más por unidad.`,
    sinComision: 'Comprar al instante no paga comisión.',
    venta: (precio: string) => `El Mercado Negro paga ${precio} por unidad.`,
    impuesto: (pct: string, monto: string) =>
      `Al vender pagas ${pct} de impuesto: ${monto} por unidad.`,
    neto: (monto: string) => `Te quedan ${monto} limpios por unidad.`,
    porUnidad: (monto: string, pct: string) =>
      `Ganas ${monto} por unidad (${pct} de lo que pones).`,
    total: (inversion: string, ganancia: string) =>
      `Inviertes ${inversion} y, si llegas, ganas ${ganancia}.`,
    riesgo: (pct: string, esperada: string) =>
      `Con ${pct} de probabilidad de morir en el camino, la ganancia esperada es ${esperada}.`,
    limites: 'Cuántas puedes comprar según cada límite:',
    infinito: 'sin límite',
    otrasCiudades: 'Otras ciudades donde también conviene',
  },
  crafteo: {
    titulo: 'Crafteo y refinado',
    subtitulo:
      'Cuánto te cuesta de verdad hacer un ítem y cuánto te queda al venderlo, con el retorno de materiales, foco e impuestos.',
    elegir: 'Elige qué quieres craftear',
    buscar: 'Ej.: arco largo 4.1, tablas t5…',
    sinElegir: 'Busca un ítem para empezar.',
    noCrafteable: 'Ese ítem no tiene receta en el catálogo.',
    receta: 'Receta',
    opcion: (n: number) => `Opción ${n}`,
    ciudad: 'Ciudad donde crafteas',
    foco: 'Usar foco',
    materialesEn: 'Compro los materiales en',
    laMasBarata: 'La ciudad más barata',
    venderEn: 'Vendo en',
    modoVenta: 'Cómo vendes',
    ventaInstantanea: 'Al instante (a la mejor oferta)',
    ventaOrden: 'Poniendo orden de venta',
    material: 'Material',
    cantidad: 'Cantidad',
    precio: 'Precio',
    seGasta: 'Gastas de verdad',
    subtotal: 'Subtotal',
    noSeRegresa: 'No se regresa',
    sinPrecio: 'Sin precio reciente',
    faltanPrecios: (lista: string) =>
      `No hay precio de menos de 6 horas para: ${lista}. Sin eso no podemos sacar el costo; prueba con otra ciudad o vuelve en un rato.`,
    sinPrecioVenta:
      'No hay precio de venta reciente en esa ciudad. Elige otra para ver cuánto te queda.',
    retorno: (pct: string) => `El juego te regresa ${pct} de los materiales`,
    explicaRetorno: (base: string, especialidad: string, foco: string) =>
      `Bono de la ciudad ${base}, especialidad ${especialidad}, foco ${foco}.`,
    costoUnidad: 'Te cuesta cada uno',
    teQueda: 'Te queda al venderlo',
    ganancia: 'Ganas por unidad',
    valorFoco: 'Cada punto de foco vale',
    valorFocoAyuda:
      'Comparamos la misma receta con y sin foco. Usamos el foco base de la receta; tus especializaciones lo bajan, así que en tu caso vale igual o más.',
    focoBase: (n: string) => `Foco base: ${n} por crafteo`,
    produce: (n: string) => `Produce ${n} por crafteo`,
    perdida: 'Ojo: así pierdes plata. Revisa otra ciudad para vender o compra más barato.',
    notaDiarios:
      'No descontamos los bonos diarios de producción porque todavía no están verificados.',
    notaCalidad: 'Calculado con calidad normal. Si te sale de mejor calidad, puede valer más.',
  },
  grupos: {
    arcos: 'Arcos',
    recursos: 'Recursos',
    cuero: 'Armaduras de cuero',
    'capas-bolsas': 'Capas y bolsas',
    consumibles: 'Comida y pociones',
    lujo: 'Bienes de lujo',
    materiales: 'Materiales de recetas',
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
