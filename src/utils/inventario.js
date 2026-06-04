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
  return talla && talla !== "N/A"
}
export function productoSugeridoParaColaborador(producto, colaborador) {
  if (!colaborador) return false

  const nombre = producto.nombre.toLowerCase()
  const tipo = producto.tipo.toLowerCase()
  const variante = String(producto.variante)

  if (tipo === "calzado") {
    return tallaValida(colaborador.tallaBotas) && variante === colaborador.tallaBotas
  }

  if (tipo === "bata") {
    return tallaValida(colaborador.tallaBata) && variante === colaborador.tallaBata
  }

  if (tipo === "uniforme" || nombre.includes("antifluido")) {
    return tallaValida(colaborador.tallaAntifluido) && variante === colaborador.tallaAntifluido
  }

  if (tipo === "camisa") {
    return tallaValida(colaborador.tallaCamisa) && variante === colaborador.tallaCamisa
  }

  if (tipo === "pantalon" || tipo === "jean") {
    return tallaValida(colaborador.tallaPantalon) && variante === colaborador.tallaPantalon
  }

  return false
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
