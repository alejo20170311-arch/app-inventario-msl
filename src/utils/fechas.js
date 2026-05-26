const ZONA_HORARIA_APP = "America/Bogota"

const formateadorFechaLocal = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_HORARIA_APP,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

export function fechaLocalISO(fecha = new Date()) {
  return formateadorFechaLocal.format(fecha)
}

export function mesLocalISO(fecha = new Date()) {
  return fechaLocalISO(fecha).slice(0, 7)
}

export function ahoraISO() {
  return new Date().toISOString()
}
