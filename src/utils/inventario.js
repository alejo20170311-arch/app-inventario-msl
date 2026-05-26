export function obtenerStockMinimo(productoCatalogo) {
  if (!productoCatalogo) return ""
  if (productoCatalogo.stockMinimo !== undefined && productoCatalogo.stockMinimo !== "") {
    return Number(productoCatalogo.stockMinimo)
  }
  if (productoCatalogo.nombre === "Bono Sodexo") return 1
  if (productoCatalogo.nombre === "Bota de seguridad") return 4
  if (productoCatalogo.nombre.includes("Tapabocas N95")) return 3
  if (productoCatalogo.nombre.includes("Tapabocas quirurgico")) return 5
  if (productoCatalogo.nombre.includes("Guantes de nitrilo")) return 5
  if (["Casco", "Proteccion visual", "Proteccion facial", "Trabajo en alturas"].includes(productoCatalogo.tipo)) return 2
  if (productoCatalogo.categoria === "Dotacion") return 2

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
export function coincideFiltroProducto(producto, filtro) {
  if (filtro === "Stock bajo") return Number(producto.stockActual) <= Number(producto.stockMinimo)
  if (filtro === "Activos") return producto.estado === "Activo"
  if (filtro === "Inactivos") return producto.estado === "Inactivo"
  return true
}
export function coincideFiltroMovimiento(item, filtro) {
  if (filtro === "Entradas") return item.tipoMovimiento === "Entrada"
  if (filtro === "Devoluciones") return item.tipoMovimiento === "Devolucion"
  if (filtro === "Entregas") return item.tipoMovimiento === "Entrega"
  if (filtro === "Ajustes") return item.tipoMovimiento?.includes("Ajuste")
  if (filtro === "Anulaciones") return item.tipoMovimiento?.includes("Anulacion")
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
