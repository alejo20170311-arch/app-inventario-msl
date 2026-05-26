export function exportarCsv(nombreArchivo, columnas, filas) {
  const encabezados = columnas.map((columna) => columna.titulo).join(";")
  const contenido = filas.map((fila) =>
    columnas
      .map((columna) => {
        const valor = fila[columna.campo] ?? ""
        return `"${String(valor).replaceAll('"', '""')}"`
      })
      .join(";")
  )
  const csv = [encabezados, ...contenido].join("\n")
  const archivo = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  const enlace = document.createElement("a")

  enlace.href = URL.createObjectURL(archivo)
  enlace.download = nombreArchivo
  enlace.click()
  URL.revokeObjectURL(enlace.href)
}

export function leerCsv(texto) {
  const primeraLinea = texto.split(/\r?\n/)[0] || ""
  const separador = primeraLinea.split(";").length >= primeraLinea.split(",").length ? ";" : ","
  const filas = []
  let fila = []
  let celda = ""
  let entreComillas = false

  for (let i = 0; i < texto.length; i += 1) {
    const caracter = texto[i]
    const siguiente = texto[i + 1]

    if (caracter === '"' && entreComillas && siguiente === '"') {
      celda += '"'
      i += 1
    } else if (caracter === '"') {
      entreComillas = !entreComillas
    } else if (caracter === separador && !entreComillas) {
      fila.push(celda.trim())
      celda = ""
    } else if ((caracter === "\n" || caracter === "\r") && !entreComillas) {
      if (caracter === "\r" && siguiente === "\n") {
        i += 1
      }

      fila.push(celda.trim())
      if (fila.some((valor) => valor !== "")) {
        filas.push(fila)
      }
      fila = []
      celda = ""
    } else {
      celda += caracter
    }
  }

  fila.push(celda.trim())
  if (fila.some((valor) => valor !== "")) {
    filas.push(fila)
  }

  return filas
}
