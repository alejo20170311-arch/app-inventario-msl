function normalizarEncabezado(texto) {
  return String(texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
}

function indiceColumna(referencia) {
  const letras = String(referencia || "").match(/[A-Z]+/i)?.[0] || ""

  return letras
    .toUpperCase()
    .split("")
    .reduce((total, letra) => total * 26 + letra.charCodeAt(0) - 64, 0) - 1
}

function textoXml(nodo) {
  return nodo?.textContent ?? ""
}

function objetivoHojaPrincipal(archivos, parser) {
  const workbookXml = archivos["xl/workbook.xml"]
  const relsXml = archivos["xl/_rels/workbook.xml.rels"]

  if (!workbookXml || !relsXml) return "xl/worksheets/sheet1.xml"

  const workbook = parser.parseFromString(workbookXml, "application/xml")
  const rels = parser.parseFromString(relsXml, "application/xml")
  const primeraHoja = workbook.querySelector("sheet")
  const relacionId = primeraHoja?.getAttribute("r:id") || primeraHoja?.getAttribute("id")
  const relacion = Array.from(rels.querySelectorAll("Relationship"))
    .find((item) => item.getAttribute("Id") === relacionId)
  const target = relacion?.getAttribute("Target") || "worksheets/sheet1.xml"

  return `xl/${target.replace(/^\/?xl\//, "")}`
}

function serialExcelAFecha(valor) {
  const numero = Number(valor)

  if (!Number.isFinite(numero) || numero < 1) return String(valor || "")

  const fecha = new Date(Date.UTC(1899, 11, 30))
  fecha.setUTCDate(fecha.getUTCDate() + Math.floor(numero))

  return fecha.toISOString().slice(0, 10)
}

async function leerXlsx(archivo) {
  const { strFromU8, unzipSync } = await import("fflate")
  const bytes = new Uint8Array(await archivo.arrayBuffer())
  const zip = unzipSync(bytes)
  const archivos = Object.fromEntries(
    Object.entries(zip).map(([ruta, contenido]) => [ruta, strFromU8(contenido)])
  )
  const parser = new DOMParser()
  const sharedStringsXml = archivos["xl/sharedStrings.xml"]
  const sharedStrings = sharedStringsXml
    ? Array.from(parser.parseFromString(sharedStringsXml, "application/xml").querySelectorAll("si"))
      .map((item) => textoXml(item))
    : []
  const hojaRuta = objetivoHojaPrincipal(archivos, parser)
  const hojaXml = archivos[hojaRuta] || archivos["xl/worksheets/sheet1.xml"]

  if (!hojaXml) return []

  const hoja = parser.parseFromString(hojaXml, "application/xml")

  return Array.from(hoja.querySelectorAll("sheetData row")).map((fila) => {
    const celdas = []

    Array.from(fila.querySelectorAll("c")).forEach((celda) => {
      const indice = indiceColumna(celda.getAttribute("r"))
      const tipo = celda.getAttribute("t")
      const valor = textoXml(celda.querySelector("v"))
      const inline = textoXml(celda.querySelector("is"))

      if (tipo === "s") {
        celdas[indice] = sharedStrings[Number(valor)] || ""
      } else if (tipo === "inlineStr") {
        celdas[indice] = inline
      } else {
        celdas[indice] = valor
      }
    })

    return celdas.map((valor) => String(valor ?? "").trim())
  }).filter((fila) => fila.some(Boolean))
}

async function leerFilasArchivo(archivo) {
  const nombre = archivo.name.toLowerCase()

  if (nombre.endsWith(".xlsx")) {
    return leerXlsx(archivo)
  }

  const { leerCsv } = await import("./csv")

  return leerCsv(await archivo.text())
}

export async function leerFilasCompra(archivo) {
  const filas = await leerFilasArchivo(archivo)

  if (filas.length < 2) {
    return []
  }

  const encabezados = filas[0].map(normalizarEncabezado)

  function valor(fila, opciones) {
    const indice = opciones
      .map(normalizarEncabezado)
      .map((opcion) => encabezados.indexOf(opcion))
      .find((posicion) => posicion >= 0)

    return indice >= 0 ? String(fila[indice] || "").trim() : ""
  }

  return filas.slice(1).map((fila, indice) => {
    const fecha = valor(fila, ["fecha", "fecha factura", "fecha_factura"])

    return {
      fila: indice + 2,
      factura: valor(fila, ["factura", "numero factura", "n factura", "numero_factura"]),
      fecha: /^\d+(\.\d+)?$/.test(fecha) ? serialExcelAFecha(fecha) : fecha,
      proveedor: valor(fila, ["proveedor"]),
      responsable: valor(fila, ["responsable"]),
      categoria: valor(fila, ["categoria", "categoría"]),
      producto: valor(fila, ["producto", "nombre", "item"]),
      tipo: valor(fila, ["tipo"]),
      variante: valor(fila, ["variante", "talla", "talla variante"]),
      unidad: valor(fila, ["unidad"]),
      cantidad: valor(fila, ["cantidad", "cant"]),
      valorUnitario: valor(fila, ["valor unitario", "valor_unitario", "precio", "precio unitario"]),
      observacion: valor(fila, ["observacion", "observación", "nota"]),
    }
  }).filter((fila) =>
    Object.entries(fila).some(([clave, valor]) => clave !== "fila" && String(valor || "").trim())
  )
}

export async function leerFilasEntrega(archivo) {
  const filas = await leerFilasArchivo(archivo)

  if (filas.length < 2) {
    return []
  }

  const encabezados = filas[0].map(normalizarEncabezado)

  function valor(fila, opciones) {
    const indice = opciones
      .map(normalizarEncabezado)
      .map((opcion) => encabezados.indexOf(opcion))
      .find((posicion) => posicion >= 0)

    return indice >= 0 ? String(fila[indice] || "").trim() : ""
  }

  return filas.slice(1).map((fila, indice) => {
    const fecha = valor(fila, ["fecha", "fecha entrega", "fecha_entrega"])

    return {
      fila: indice + 2,
      grupo: valor(fila, ["grupo", "grupo entrega", "grupo_entrega", "comprobante"]),
      identificacion: valor(fila, ["identificacion", "identificación", "cedula", "cédula", "documento"]),
      fecha: /^\d+(\.\d+)?$/.test(fecha) ? serialExcelAFecha(fecha) : fecha,
      motivo: valor(fila, ["motivo"]),
      responsable: valor(fila, ["responsable"]),
      categoria: valor(fila, ["categoria", "categoría"]),
      producto: valor(fila, ["producto", "nombre", "item"]),
      tipo: valor(fila, ["tipo"]),
      variante: valor(fila, ["variante", "talla", "talla variante"]),
      unidad: valor(fila, ["unidad"]),
      cantidad: valor(fila, ["cantidad", "cant"]),
      observacion: valor(fila, ["observacion", "observación", "nota"]),
    }
  }).filter((fila) =>
    Object.entries(fila).some(([clave, valor]) => clave !== "fila" && String(valor || "").trim())
  )
}

export async function leerFilasProducto(archivo) {
  const filas = await leerFilasArchivo(archivo)

  if (filas.length < 2) {
    return []
  }

  const encabezados = filas[0].map(normalizarEncabezado)

  function valor(fila, opciones) {
    const indice = opciones
      .map(normalizarEncabezado)
      .map((opcion) => encabezados.indexOf(opcion))
      .find((posicion) => posicion >= 0)

    return indice >= 0 ? String(fila[indice] || "").trim() : ""
  }

  return filas.slice(1).map((fila, indice) => ({
    fila: indice + 2,
    categoria: valor(fila, ["categoria", "categorÃ­a"]),
    nombre: valor(fila, ["producto", "nombre", "item", "nombre producto"]),
    tipo: valor(fila, ["tipo"]),
    variante: valor(fila, ["variante", "talla", "talla variante"]),
    unidad: valor(fila, ["unidad"]),
    stockActual: valor(fila, ["stock actual", "stock inicial", "entrada", "cantidad"]),
    stockMinimo: valor(fila, ["stock minimo", "stock mÃ­nimo", "minimo", "mÃ­nimo"]),
    ubicacion: valor(fila, ["ubicacion", "ubicaciÃ³n", "bodega"]),
    estado: valor(fila, ["estado"]),
    motivoEntrada: valor(fila, ["motivo entrada", "motivo de entrada", "motivo"]),
    observacion: valor(fila, ["observacion", "observaciÃ³n", "nota"]),
  })).filter((fila) =>
    Object.entries(fila).some(([clave, valor]) => clave !== "fila" && String(valor || "").trim())
  )
}
