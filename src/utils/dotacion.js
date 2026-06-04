const CICLOS_DOTACION = [
  { mes: 4, dia: 30, nombre: "Abril" },
  { mes: 8, dia: 31, nombre: "Agosto" },
  { mes: 12, dia: 20, nombre: "Diciembre" },
]

function fechaUtc(anio, mes, dia) {
  return new Date(Date.UTC(anio, mes - 1, dia, 12))
}

function fechaDesdeISO(fechaISO) {
  const [anio, mes, dia] = String(fechaISO || "").split("-").map(Number)

  if (!anio || !mes || !dia) return fechaUtc(new Date().getUTCFullYear(), 1, 1)

  return fechaUtc(anio, mes, dia)
}

function fechaISO(fecha) {
  return fecha.toISOString().slice(0, 10)
}

function restarMeses(fecha, meses) {
  const anio = fecha.getUTCFullYear()
  const mes = fecha.getUTCMonth()
  const dia = fecha.getUTCDate()
  const objetivo = new Date(Date.UTC(anio, mes - meses, 1, 12))
  const ultimoDiaObjetivo = new Date(
    Date.UTC(objetivo.getUTCFullYear(), objetivo.getUTCMonth() + 1, 0, 12)
  ).getUTCDate()

  objetivo.setUTCDate(Math.min(dia, ultimoDiaObjetivo))

  return objetivo
}

function diferenciaDias(desde, hasta) {
  const msDia = 24 * 60 * 60 * 1000

  return Math.ceil((hasta.getTime() - desde.getTime()) / msDia)
}

function ciclosParaAnio(anio) {
  return CICLOS_DOTACION.map((ciclo) => {
    const entrega = fechaUtc(anio, ciclo.mes, ciclo.dia)
    const solicitud = restarMeses(entrega, 2)

    return {
      ...ciclo,
      anio,
      fechaEntrega: fechaISO(entrega),
      fechaSolicitud: fechaISO(solicitud),
      entrega,
      solicitud,
    }
  })
}

export function siguienteCicloDotacion(fechaBaseISO) {
  const base = fechaDesdeISO(fechaBaseISO)
  const anio = base.getUTCFullYear()
  const ciclos = [...ciclosParaAnio(anio), ...ciclosParaAnio(anio + 1)]

  return ciclos.find((ciclo) => ciclo.entrega >= base) || ciclos[ciclos.length - 1]
}

export function cicloDotacionParaFecha(fechaBaseISO) {
  const base = fechaDesdeISO(fechaBaseISO)
  const anio = base.getUTCFullYear()
  const ciclos = [...ciclosParaAnio(anio - 1), ...ciclosParaAnio(anio), ...ciclosParaAnio(anio + 1)]
  const ciclo = ciclos.find((item) => base <= item.entrega)

  return ciclo || ciclos[ciclos.length - 1]
}

export function esEntregaDotacion(entrega) {
  return (entrega.estado || "Activa") === "Activa" && entrega.categoria === "Dotación"
}

export function ultimaDotacionColaborador(entregas, colaboradorId) {
  return entregas
    .filter((item) =>
      esEntregaDotacion(item) &&
      String(item.colaboradorId) === String(colaboradorId)
    )
    .sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")))[0] || null
}

export function crearAlertaDotacionEntrega({
  colaborador,
  entregas,
  fechaEntrega,
  entregaTieneDotacion,
}) {
  if (!colaborador) return null
  if (!entregaTieneDotacion) return null

  const ciclo = cicloDotacionParaFecha(fechaEntrega)
  const ultima = ultimaDotacionColaborador(entregas, colaborador.id)
  const fechaActual = fechaDesdeISO(fechaEntrega)
  const diasParaSolicitud = diferenciaDias(fechaActual, ciclo.solicitud)
  const fechaUltima = ultima ? fechaDesdeISO(ultima.fecha) : null
  const diasDesdeUltima = fechaUltima ? diferenciaDias(fechaUltima, fechaActual) : null
  const yaRecibioCiclo = Boolean(
    ultima &&
    fechaUltima >= ciclo.solicitud &&
    fechaUltima <= ciclo.entrega
  )

  if (yaRecibioCiclo && entregaTieneDotacion) {
    return {
      tipo: "error",
      titulo: "Alerta de dotación",
      texto: `Este colaborador ya recibió dotación para el ciclo de ${ciclo.nombre} ${ciclo.anio} el ${ultima.fecha}. Revisa antes de entregar de nuevo.`,
      ciclo,
      ultima,
    }
  }

  if (entregaTieneDotacion && diasDesdeUltima !== null && diasDesdeUltima < 120) {
    return {
      tipo: "error",
      titulo: "Entrega reciente",
      texto: `La última dotación fue el ${ultima.fecha}, hace ${diasDesdeUltima} días. La regla general es cada cuatro meses.`,
      ciclo,
      ultima,
    }
  }

  if (diasParaSolicitud <= 0 && !yaRecibioCiclo) {
    return {
      tipo: "info",
      titulo: "Solicitud de dotación",
      texto: `Para el ciclo de ${ciclo.nombre} ${ciclo.anio}, la dotación debía solicitarse desde el ${ciclo.fechaSolicitud} y entregarse máximo el ${ciclo.fechaEntrega}.`,
      ciclo,
      ultima,
    }
  }

  return {
    tipo: "exito",
    titulo: "Planeación de dotación",
    texto: `Próxima entrega legal: ${ciclo.fechaEntrega}. Solicitud recomendada: ${ciclo.fechaSolicitud}. Faltan ${Math.max(0, diasParaSolicitud)} días para solicitar.`,
    ciclo,
    ultima,
  }
}

export function planearDotacionColaboradores({
  colaboradores,
  entregas,
  fechaBaseISO,
}) {
  const hoy = fechaDesdeISO(fechaBaseISO)
  const ciclo = siguienteCicloDotacion(fechaBaseISO)

  return colaboradores
    .filter((colaborador) => colaborador.estado === "Activo")
    .map((colaborador) => {
      const ultima = ultimaDotacionColaborador(entregas, colaborador.id)
      const fechaUltima = ultima ? fechaDesdeISO(ultima.fecha) : null
      const yaRecibioCiclo = Boolean(
        fechaUltima &&
        fechaUltima >= ciclo.solicitud &&
        fechaUltima <= ciclo.entrega
      )
      const diasParaSolicitud = diferenciaDias(hoy, ciclo.solicitud)
      const diasParaEntrega = diferenciaDias(hoy, ciclo.entrega)
      const estado = yaRecibioCiclo
        ? "Entregado ciclo"
        : diasParaSolicitud <= 0
          ? "Solicitar ahora"
          : "Programar"
      const prioridad = estado === "Solicitar ahora" ? 0 : estado === "Programar" ? 1 : 2

      return {
        colaboradorId: colaborador.id,
        identificacion: colaborador.identificacion,
        colaborador: colaborador.nombreCompleto,
        cargo: colaborador.cargo,
        centroCostos: colaborador.centroCostos,
        nombreCentroCostos: colaborador.nombreCentroCostos,
        ciclo: `${ciclo.nombre} ${ciclo.anio}`,
        fechaSolicitud: ciclo.fechaSolicitud,
        fechaEntrega: ciclo.fechaEntrega,
        ultimaDotacion: ultima?.fecha || "Sin registro",
        diasParaSolicitud,
        diasParaEntrega,
        estado,
        prioridad,
      }
    })
    .sort((a, b) =>
      a.prioridad - b.prioridad ||
      a.diasParaSolicitud - b.diasParaSolicitud ||
      a.colaborador.localeCompare(b.colaborador)
    )
}
