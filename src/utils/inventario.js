export function obtenerStockMinimo(productoCatalogo) {
  if (!productoCatalogo) return ""
  const nombre = String(productoCatalogo.nombre || "").toLowerCase()
  const tipo = String(productoCatalogo.tipo || "").toLowerCase()

  if (productoCatalogo.stockMinimo !== undefined && productoCatalogo.stockMinimo !== "") {
    return Number(productoCatalogo.stockMinimo)
  }
  if (productoCatalogo.nombre === "Bono Sodexo") return 1
  if (productoCatalogo.nombre === "Bota de seguridad") return 4
  if (nombre.includes("tapabocas n95")) return 3
  if (nombre.includes("tapabocas")) return 5
  if (nombre.includes("guantes")) return 4
  if (["protección visual", "proteccion visual", "protección facial", "proteccion facial", "trabajo en alturas"].includes(tipo)) return 2
  if (productoCatalogo.categoria === "Dotación") return 2

  return 2
}
export function tallaValida(talla) {
  return Boolean(normalizarTalla(talla)) && normalizarTalla(talla) !== "N/A"
}

export function normalizarTalla(talla) {
  const valor = String(talla || "").trim()

  if (!valor) return ""

  const compacto = valor
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "")

  if (["NA", "N/A", "NOAPLICA"].includes(compacto)) return "N/A"
  if (["UNICA", "UNIC"].includes(compacto)) return "Única"
  if (["XS", "S", "M", "L", "XL"].includes(compacto)) return compacto

  const numeroXL = compacto.match(/^([2-9]\d*)X?L$/)
  if (numeroXL) return `${numeroXL[1]}XL`

  if (/^X{2,}L$/.test(compacto)) {
    return `${compacto.length - 1}XL`
  }

  return valor
}

function tallaCoincide(tallaColaborador, varianteProducto) {
  return tallaValida(tallaColaborador) &&
    normalizarTexto(normalizarTalla(tallaColaborador)) === normalizarTexto(normalizarTalla(varianteProducto))
}

export function productoAplicaSexoColaborador(producto, colaborador) {
  const nombre = String(producto.nombre || "").toLowerCase()
  const sexo = String(colaborador?.sexo || "").toLowerCase()

  if (nombre.includes("dama") || nombre.includes("mujer")) {
    return sexo === "femenino"
  }

  if (nombre.includes("hombre")) {
    return sexo === "masculino"
  }

  return true
}
export function productoIncluidoEnTipoDotacion(producto, tipoDotacion) {
  const partes = String(tipoDotacion || "")
    .split("+")
    .map((item) => normalizarTexto(item))
    .filter(Boolean)
  const nombreProducto = normalizarTexto(producto.nombre)
  const nombreProductoSinNumeros = nombreProducto.replace(/[0-9]/g, "")

  if (partes.length === 0 || partes.includes("noaplica")) return false

  return partes.some((parte) => {
    const parteSinNumeros = parte.replace(/[0-9]/g, "")

    return parte === nombreProducto ||
      parte.includes(nombreProducto) ||
      nombreProducto.includes(parte) ||
      (parteSinNumeros && parteSinNumeros === nombreProductoSinNumeros)
  })
}
export function productoRequiereTalla(producto) {
  const nombre = String(producto.nombre || "").toLowerCase()
  const tipo = String(producto.tipo || "").toLowerCase()

  return tipo === "calzado" ||
    tipo === "bata" ||
    tipo === "uniforme" ||
    tipo === "camisa" ||
    tipo === "camiseta" ||
    tipo === "pantalon" ||
    tipo === "jean" ||
    nombre.includes("camiseta") ||
    nombre.includes("antifluido")
}
export function productoSugeridoParaColaborador(producto, colaborador) {
  if (!colaborador) return false

  const nombre = producto.nombre.toLowerCase()
  const tipo = producto.tipo.toLowerCase()
  const variante = String(producto.variante)

  if (!productoAplicaSexoColaborador(producto, colaborador)) return false

  if (tipo === "calzado") {
    return tallaCoincide(colaborador.tallaBotas, variante)
  }

  if (tipo === "bata") {
    return tallaCoincide(colaborador.tallaBata, variante)
  }

  if (tipo === "uniforme" || nombre.includes("antifluido")) {
    return tallaCoincide(colaborador.tallaAntifluido, variante)
  }

  if (tipo === "camisa" || tipo === "camiseta" || nombre.includes("camiseta")) {
    const tallaCamiseta = tallaValida(colaborador.tallaCamisa)
      ? colaborador.tallaCamisa
      : colaborador.tallaAntifluido

    return tallaCoincide(tallaCamiseta, variante)
  }

  if (tipo === "pantalon" || tipo === "jean") {
    return tallaCoincide(colaborador.tallaPantalon, variante)
  }

  return !productoRequiereTalla(producto)
}

export function tallaProductoParaColaborador(producto, colaborador) {
  if (!colaborador) return ""

  const nombre = String(producto.nombre || "").toLowerCase()
  const tipo = String(producto.tipo || "").toLowerCase()

  if (tipo === "calzado") return normalizarTalla(colaborador.tallaBotas)
  if (tipo === "bata") return normalizarTalla(colaborador.tallaBata)
  if (tipo === "uniforme" || nombre.includes("antifluido")) return normalizarTalla(colaborador.tallaAntifluido)

  if (tipo === "camisa" || tipo === "camiseta" || nombre.includes("camiseta")) {
    return normalizarTalla(tallaValida(colaborador.tallaCamisa)
      ? colaborador.tallaCamisa
      : colaborador.tallaAntifluido)
  }

  if (tipo === "pantalon" || tipo === "jean") return normalizarTalla(colaborador.tallaPantalon)

  return productoRequiereTalla(producto) ? "" : normalizarTalla(producto.variante || "Única")
}

export function productoPedidoDotacionSinTallaParaColaborador(producto, colaborador) {
  return productoIncluidoEnTipoDotacion(producto, colaborador?.tipoDotacion) &&
    productoAplicaSexoColaborador(producto, colaborador) &&
    (!productoRequiereTalla(producto) || tallaValida(tallaProductoParaColaborador(producto, colaborador)))
}

export function productoPedidoDotacionParaColaborador(producto, colaborador) {
  return productoIncluidoEnTipoDotacion(producto, colaborador?.tipoDotacion) &&
    productoSugeridoParaColaborador(producto, colaborador)
}
export function normalizarBusqueda(texto) {
  return String(texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}
export function coincideBusqueda(item, busqueda, campos) {
  const textoBusqueda = normalizarBusqueda(busqueda)

  if (!textoBusqueda) return true

  return campos.some((campo) =>
    normalizarBusqueda(item[campo]).includes(textoBusqueda)
  )
}
export function esProductoStockBajo(producto) {
  const stockMinimo = Number(producto.stockMinimo)

  return stockMinimo > 0 && Number(producto.stockActual) <= stockMinimo
}
export function esProductoStockCritico(producto) {
  const stockMinimo = Number(producto.stockMinimo)

  return esProductoStockBajo(producto) && Number(producto.stockActual) <= Math.max(1, stockMinimo / 2)
}
export function coincideFiltroProducto(producto, filtro) {
  if (filtro === "Stock bajo") return esProductoStockBajo(producto)
  if (filtro === "Activos") return producto.estado === "Activo"
  if (filtro === "Inactivos") return producto.estado === "Inactivo"
  return true
}
export function coincideFiltroMovimiento(item, filtro) {
  if (filtro === "Entradas") return item.tipoMovimiento === "Entrada"
  if (filtro === "Devoluciones") return ["Devolucion", "Devolución"].includes(item.tipoMovimiento)
  if (filtro === "Entregas") return item.tipoMovimiento === "Entrega"
  if (filtro === "Ajustes") return item.tipoMovimiento?.includes("Ajuste")
  if (filtro === "Anulaciones") return normalizarBusqueda(item.tipoMovimiento).includes("anulacion")
  return true
}
export function coincideFiltroColaborador(item, filtro) {
  if (filtro === "Activos") return item.estado === "Activo"
  if (filtro === "Retirados") return item.estado === "Retirado"
  return true
}
export function coincideFiltroEntrega(item, filtro) {
  const estado = item.estado || "Activa"

  if (filtro === "Activas") return estado === "Activa"
  if (filtro === "Anuladas") return estado === "Anulada"
  return true
}
export function limpiarObservacion(texto) {
  return String(texto || "").replace(/^undefined:\s*/i, "")
}
export function valorSeguro(valor) {
  return String(valor || "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
export function normalizarTexto(texto) {
    return String(texto || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "")
  }
