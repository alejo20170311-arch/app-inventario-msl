import { camposTallasColaborador } from "../data/tallas.js"
import { normalizarTalla, normalizarTexto } from "./inventario.js"

const columnas = {
  identificacion: ["Identificacion", "Cedula", "Documento", "Numero de documento", "Colaborador - Numero de Documento"],
  nombreCompleto: ["Nombre completo", "Nombre", "Colaborador - Nombre Completo"],
  cargo: ["Cargo"],
  subArea: ["Sub-Area", "Sub area", "Subarea"],
  grupo: ["Grupo"],
  centroCostos: ["Centro de costos", "Centro costos", "Ceco"],
  nombreCentroCostos: ["Nombre centro de costos", "Nombre de centro de costos", "Nombre centro"],
  tipoDotacion: ["Tipo dotacion"],
  sexo: ["Sexo"],
  estado: ["Estado"],
}

function encabezado(valor) {
  return normalizarTexto(String(valor || "").replace(/^\s*\d+\s*[.-]+\s*/, ""))
}

export function normalizarDocumento(valor) {
  return String(valor ?? "").trim().replace(/[.\s]/g, "")
}

export function interpretarColaboradores(filas, { soloTallas = false } = {}) {
  const indiceEncabezado = filas.findIndex(fila =>
    fila.some(valor => columnas.identificacion.map(encabezado).includes(encabezado(valor)))
  )
  if (indiceEncabezado < 0) throw new Error("Falta la columna de identificacion o numero de documento.")
  const titulos = filas[indiceEncabezado].map(encabezado)
  const leer = (fila, aliases) => {
    const indices = aliases.map(encabezado).map(alias => titulos.indexOf(alias)).filter(indice => indice >= 0)
    return indices.map(indice => String(fila[indice] ?? "").trim()).find(Boolean)
  }
  const documentos = new Set()
  return filas.slice(indiceEncabezado + 1).flatMap((fila, indice) => {
    if (!fila.some(valor => String(valor ?? "").trim())) return []
    const numeroFila = indiceEncabezado + indice + 2
    const identificacion = normalizarDocumento(leer(fila, columnas.identificacion))
    if (!identificacion) throw new Error(`Fila ${numeroFila}: falta el documento.`)
    if (documentos.has(identificacion)) throw new Error(`Fila ${numeroFila}: el documento ${identificacion} esta repetido.`)
    documentos.add(identificacion)
    const datos = {}
    if (!soloTallas) {
      for (const [campo, aliases] of Object.entries(columnas)) {
        const valor = leer(fila, aliases)
        if (valor !== undefined) datos[campo] = valor
      }
    }
    for (const { campo, titulo, aliases } of camposTallasColaborador) {
      const valor = leer(fila, [titulo, ...aliases])
      if (valor !== undefined) datos[campo] = normalizarTalla(valor)
    }
    const batas = [datos.tallaBata,
      leer(fila, ["Bata Area de Calidad", "Bata Area Calidad"]),
      leer(fila, ["Bata Area Administrativa"]),
    ].filter(valor => valor !== undefined).map(normalizarTalla)
    const batasAplicables = [...new Set(batas.filter(valor => valor && valor !== "N/A"))]
    if (batasAplicables.length > 1) throw new Error(`Fila ${numeroFila}: las tallas de bata Calidad y Admon son diferentes. Define una sola talla.`)
    if (batas.length) datos.tallaBata = batasAplicables[0] || "N/A"
    datos.identificacion = identificacion
    if (soloTallas && !camposTallasColaborador.some(({ campo }) => campo in datos)) {
      throw new Error(`Fila ${numeroFila}: no se encontraron columnas de tallas.`)
    }
    return [{ fila: numeroFila, identificacion, datos }]
  })
}
