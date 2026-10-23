import assert from "node:assert/strict"
import test from "node:test"
import { precioPedidoSugerido } from "./preciosPedido.js"
import { nombreProductoActual, productoPedidoDotacionParaColaborador } from "./inventario.js"

const producto = (nombre, variante = "M") => ({ nombre, variante, categoria: "Dotacion" })

test("aplica las tarifas cotizadas de dotacion", () => {
  for (const [nombre, precio] of [
    ["MSL Bata azul oscura dama admon", 43698],
    ["MSL Bata verde oscura dama calidad", 43698],
    ["MSL Bata azul oscura hombre calidad", 43698],
    ["MSL Camisa azul 3/4 clara dama p. venta", 45096],
    ["MSL Camisa blanca dama p. venta", 45096],
    ["MSL Camisa jean hombre mtto", 54622],
    ["Chaqueta Jean Mantenimiento", 54622],
    ["MSL Camisa polo hombre", 47059],
    ["Pantalon Jean Hombre Cinta Reflectiva", 35294],
    ["Jean Hombre Licrado", 31933],
    ["Jean Mujer Licrado", 33613],
    ["MSL Jean hombre", 35294],
    ["Jean hombre", 31933],
    ["MSL Jean mujer", 33613],
    ["Uniforme antifluido", 56303],
    ["Sombrero Safari", 24370],
  ]) assert.equal(precioPedidoSugerido(producto(nombre), 999), precio, nombre)
  assert.equal(precioPedidoSugerido({ ...producto("MSL Operario azul dama uniforme"), tipo: "Uniforme" }), 56303)
})

test("camisetas cuello redondo cambian de precio desde 2XL", () => {
  for (const talla of ["XS", "S", "M", "L", "XL"]) {
    assert.equal(precioPedidoSugerido(producto("Camiseta Cuello Redondo Unisex Negra", talla)), 15966)
  }
  for (const talla of ["2XL", "XXL", "3XL", "XXXL", "4XL", "10XL", "Talla 2XL"]) {
    assert.equal(precioPedidoSugerido(producto("Camiseta Cuello Redondo Unisex Azul Oscuro", talla)), 18487)
  }
})

test("no confunde chaqueta, polo, jean licrado y cinta reflectiva", () => {
  assert.equal(precioPedidoSugerido(producto("Camisa tipo polo promotor")), 47059)
  assert.equal(precioPedidoSugerido(producto("Jean hombre licrado con cinta reflectiva")), 35294)
  assert.equal(precioPedidoSugerido(producto("Chaqueta jean hombre mttoo cinta reflectiva")), 54622)
})

test("conserva el ultimo precio de compra de articulos sin cotizacion y de EPP", () => {
  assert.equal(precioPedidoSugerido(producto("Bota de seguridad"), 90000), 90000)
  assert.equal(precioPedidoSugerido({ ...producto("Sombrero Safari"), categoria: "EPP" }, 7000), 7000)
  assert.equal(precioPedidoSugerido(producto("Chaleco Home Center")), 0)
})

test("renombra los jeans sin mezclar los items ni perder las asignaciones anteriores", () => {
  assert.equal(nombreProductoActual("MSL Jean hombre"), "Pantalon Jean Hombre Cinta Reflectiva")
  assert.equal(nombreProductoActual("Jean hombre"), "Jean Hombre Licrado")
  assert.equal(nombreProductoActual("MSL Jean mujer"), "Jean Mujer Licrado")
  const persona = { tipoDotacion: "MSL Camisa jean hombre mtto+MSL Jean hombre", tallaPantalon: "32", sexo: "Masculino" }
  const pantalon = { ...producto("Pantalon Jean Hombre Cinta Reflectiva", "32"), tipo: "Jean" }
  assert.equal(productoPedidoDotacionParaColaborador(pantalon, persona), true)
  assert.equal(productoPedidoDotacionParaColaborador({ ...pantalon, nombre: "Jean Hombre Licrado" }, persona), false)
  const promotor = { ...persona, tipoDotacion: "Jean hombre" }
  assert.equal(productoPedidoDotacionParaColaborador({ ...pantalon, nombre: "Jean Hombre Licrado" }, promotor), true)
  assert.equal(productoPedidoDotacionParaColaborador(pantalon, promotor), false)
})
