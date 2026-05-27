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

function escaparXml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function nombreColumna(indice) {
  let nombre = ""
  let numero = indice + 1

  while (numero > 0) {
    const residuo = (numero - 1) % 26
    nombre = String.fromCharCode(65 + residuo) + nombre
    numero = Math.floor((numero - 1) / 26)
  }

  return nombre
}

function crearHojaXml({ columnas, filas }) {
  const encabezado = columnas.map((columna, indice) => (
    `<c r="${nombreColumna(indice)}1" t="inlineStr"><is><t>${escaparXml(columna.titulo)}</t></is></c>`
  )).join("")
  const filasXml = filas.map((fila, filaIndice) => {
    const numeroFila = filaIndice + 2
    const celdas = columnas.map((columna, columnaIndice) => {
      const valor = fila[columna.campo] ?? ""
      const referencia = `${nombreColumna(columnaIndice)}${numeroFila}`

      if (typeof valor === "number" && Number.isFinite(valor)) {
        return `<c r="${referencia}"><v>${valor}</v></c>`
      }

      return `<c r="${referencia}" t="inlineStr"><is><t>${escaparXml(valor)}</t></is></c>`
    }).join("")

    return `<row r="${numeroFila}">${celdas}</row>`
  }).join("")

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">${encabezado}</row>
    ${filasXml}
  </sheetData>
</worksheet>`
}

function crc32(bytes) {
  let crc = 0xffffffff

  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }

  return (crc ^ 0xffffffff) >>> 0
}

function uint16(valor) {
  return [valor & 0xff, (valor >>> 8) & 0xff]
}

function uint32(valor) {
  return [
    valor & 0xff,
    (valor >>> 8) & 0xff,
    (valor >>> 16) & 0xff,
    (valor >>> 24) & 0xff,
  ]
}

function unirBytes(...bloques) {
  const total = bloques.reduce((suma, bloque) => suma + bloque.length, 0)
  const unido = new Uint8Array(total)
  let offset = 0

  bloques.forEach((bloque) => {
    unido.set(bloque, offset)
    offset += bloque.length
  })

  return unido
}

function crearZip(archivos) {
  const codificador = new TextEncoder()
  const partes = []
  const centrales = []
  let offset = 0

  archivos.forEach(({ ruta, contenido }) => {
    const nombreBytes = codificador.encode(ruta)
    const contenidoBytes = codificador.encode(contenido)
    const crc = crc32(contenidoBytes)
    const local = unirBytes(new Uint8Array([
      ...uint32(0x04034b50),
      ...uint16(20),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint32(crc),
      ...uint32(contenidoBytes.length),
      ...uint32(contenidoBytes.length),
      ...uint16(nombreBytes.length),
      ...uint16(0),
      ...nombreBytes,
    ]), contenidoBytes)

    partes.push(local)
    centrales.push({
      ruta,
      nombreBytes,
      crc,
      tamano: contenidoBytes.length,
      offset,
    })
    offset += local.length
  })

  const inicioCentral = offset

  centrales.forEach(({ nombreBytes, crc, tamano, offset: offsetLocal }) => {
    const central = new Uint8Array([
      ...uint32(0x02014b50),
      ...uint16(20),
      ...uint16(20),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint32(crc),
      ...uint32(tamano),
      ...uint32(tamano),
      ...uint16(nombreBytes.length),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint32(0),
      ...uint32(offsetLocal),
      ...nombreBytes,
    ])

    partes.push(central)
    offset += central.length
  })

  partes.push(new Uint8Array([
    ...uint32(0x06054b50),
    ...uint16(0),
    ...uint16(0),
    ...uint16(centrales.length),
    ...uint16(centrales.length),
    ...uint32(offset - inicioCentral),
    ...uint32(inicioCentral),
    ...uint16(0),
  ]))

  return new Blob(partes, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}

export function exportarXlsx(nombreArchivo, hojas) {
  const hojasNormalizadas = hojas.map((hoja, indice) => ({
    ...hoja,
    nombre: hoja.nombre || `Hoja ${indice + 1}`,
  }))
  const archivos = [
    {
      ruta: "[Content_Types].xml",
      contenido: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  ${hojasNormalizadas.map((_, indice) => `<Override PartName="/xl/worksheets/sheet${indice + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}
</Types>`,
    },
    {
      ruta: "_rels/.rels",
      contenido: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      ruta: "xl/workbook.xml",
      contenido: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${hojasNormalizadas.map((hoja, indice) => `<sheet name="${escaparXml(hoja.nombre.slice(0, 31))}" sheetId="${indice + 1}" r:id="rId${indice + 1}"/>`).join("")}
  </sheets>
</workbook>`,
    },
    {
      ruta: "xl/_rels/workbook.xml.rels",
      contenido: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${hojasNormalizadas.map((_, indice) => `<Relationship Id="rId${indice + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${indice + 1}.xml"/>`).join("")}
</Relationships>`,
    },
    ...hojasNormalizadas.map((hoja, indice) => ({
      ruta: `xl/worksheets/sheet${indice + 1}.xml`,
      contenido: crearHojaXml(hoja),
    })),
  ]
  const archivo = crearZip(archivos)
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
