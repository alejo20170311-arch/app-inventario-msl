import { nombreProductoActual, normalizarTalla, normalizarTexto } from "./inventario.js"

// Quoted prices for suggested orders; purchase history keeps its recorded values.
export function precioPedidoSugerido(producto, precioCompra = 0) {
  if (normalizarTexto(producto.categoria) !== "dotacion") return precioCompra
  const nombre = normalizarTexto(nombreProductoActual(producto.nombre))
  const tipo = normalizarTexto(producto.tipo)

  if (nombre.includes("bata") && /admon|administrativ|calidad/.test(nombre)) return 43698
  if (nombre.includes("sombrero") && nombre.includes("safari")) return 24370
  if (nombre.includes("camiseta") && nombre.includes("cuelloredondo")) {
    const tallaXL = normalizarTalla(producto.variante).match(/^(\d+)XL$/)
    return tallaXL && Number(tallaXL[1]) >= 2 ? 18487 : 15966
  }
  if (nombre.includes("polo")) return 47059
  if (nombre.includes("jean") && /chaqueta|mtto|mantenimiento/.test(nombre)) return 54622
  if (nombre.includes("jean") && /reflectiv/.test(nombre)) return 35294
  if (nombre.includes("jean") && nombre.includes("licrado")) {
    if (/mujer|dama/.test(nombre)) return 33613
    if (nombre.includes("hombre")) return 31933
  }
  if (/camisa|camiseta/.test(nombre) && /pventa|promotor/.test(nombre)) return 45096
  if (nombre.includes("antifluido") || (tipo === "uniforme" && nombre.includes("operario"))) return 56303
  return precioCompra
}
