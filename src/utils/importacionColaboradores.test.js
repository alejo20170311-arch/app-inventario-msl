import assert from "node:assert/strict"
import test from "node:test"
import { interpretarColaboradores } from "./importacionColaboradores.js"
import { normalizarTalla, tallaProductoParaColaborador, productoSugeridoParaColaborador } from "./inventario.js"

test("lee el reporte de tallas por documento sin cambiar los datos personales", () => {
  const [fila] = interpretarColaboradores([
    ["Colaborador - Numero de Documento", "Colaborador - Nombre Completo", "Uniforme Antifluido", "Camiseta Cuello Redondo Manufactura", "Camisa Manga Larga Tipo Polo", "Chaqueta Jean Mantenimiento", "Pantalon Jean Hombre y Mujer", "Bata Calidad y Admon", "Botas de Seguridad"],
    ["1.234.567", "Persona ejemplo", "Talla M", "Talla L", "No Aplica", "Talla S", "Talla 32", "XL", "Talla 44"],
  ], { soloTallas: true })
  assert.deepEqual(fila.datos, {
    identificacion: "1234567", tallaAntifluido: "M", tallaCamisetaManufactura: "L",
    tallaCamisaPolo: "N/A", tallaChaquetaJean: "S", tallaPantalon: "32", tallaBata: "XL", tallaBotas: "44",
  })
  assert.equal("nombreCompleto" in fila.datos, false)
  assert.equal("tallaCamisa" in fila.datos, false)
})

test("une las dos batas y detecta las tallas contradictorias", () => {
  const headers = ["Documento", "8.- Bata Area de Calidad", "9.- Bata Area Administrativa"]
  assert.equal(interpretarColaboradores([headers, ["123", "No Aplica", "Talla L"]])[0].datos.tallaBata, "L")
  assert.equal(interpretarColaboradores([headers, ["123", "M", "M"]])[0].datos.tallaBata, "M")
  assert.throws(() => interpretarColaboradores([headers, ["123", "S", "L"]]), /diferentes/)
})

test("conserva columnas ausentes y celdas vacias; No Aplica si actualiza", () => {
  const [fila] = interpretarColaboradores([
    ["Identificacion", "Talla camisa", "Talla bata"], ["123", "", "No aplica"],
  ])
  assert.deepEqual(fila.datos, { identificacion: "123", tallaBata: "N/A" })
})

test("mantiene compatibilidad con los archivos anteriores de personal", () => {
  const [fila] = interpretarColaboradores([
    ["Identificacion", "Nombre completo", "Talla antifluido", "Talla camisa", "Talla de botas"],
    ["123", "Persona", "2XL", "M", "40"],
  ])
  assert.equal(fila.datos.nombreCompleto, "Persona")
  assert.equal(fila.datos.tallaCamisa, "M")
  assert.equal(fila.datos.tallaAntifluido, "2XL")
  assert.equal(fila.datos.tallaBotas, "40")
  assert.equal("tallaCamisetaManufactura" in fila.datos, false)
})

test("rechaza documentos duplicados incluso con distinta puntuacion", () => {
  assert.throws(() => interpretarColaboradores([["Documento", "Talla bata"], ["1.234", "S"], ["1234", "M"]]), /repetido/)
})

test("las prendas usan tallas independientes sin mezclar manufactura, polo y promotor", () => {
  const colaborador = {
    tallaCamisetaManufactura: "L", tallaCamisaPolo: "M", tallaChaquetaJean: "S", tallaCamisa: "XL",
    tallaAntifluido: "2XL", tallaBata: "3XL", tallaPantalon: "32", tallaBotas: "44",
  }
  for (const [nombre, tipo, talla] of [
    ["Camiseta Cuello Redondo Unisex Negra", "Camiseta", "L"],
    ["Camiseta Cuello Redondo Unisex Negra", "Uniforme", "L"],
    ["MSL Camisa polo hombre", "Camisa", "M"],
    ["MSL Camisa jean hombre mtto", "Camisa", "S"],
    ["Chaqueta Jean Mantenimiento", "Chaqueta", "S"],
    ["Camiseta promotor de venta", "Camiseta", "XL"],
    ["MSL Camisa azul clara dama p. venta", "Camisa", "XL"],
    ["MSL Bata azul oscura dama admon", "Bata", "3XL"],
    ["MSL Bata azul oscura dama calidad", "Bata", "3XL"],
  ]) assert.equal(tallaProductoParaColaborador({ nombre, tipo }, colaborador), talla, nombre)
  const camiseta = { categoria: "Dotacion", nombre: "Camiseta Cuello Redondo Unisex Negra", tipo: "Camiseta", variante: "L" }
  assert.equal(productoSugeridoParaColaborador(camiseta, { ...colaborador, tipoDotacion: camiseta.nombre }), true)
  assert.equal(productoSugeridoParaColaborador(camiseta, { ...colaborador, tipoDotacion: camiseta.nombre, tallaCamisetaManufactura: "N/A" }), false)
})

test("normaliza tallas del formulario y respeta las antiguas cuando falta el campo nuevo", () => {
  assert.equal(normalizarTalla("Talla 2XL"), "2XL")
  assert.equal(normalizarTalla("No Aplica"), "N/A")
  assert.equal(tallaProductoParaColaborador({ nombre: "Camiseta Negra", tipo: "Camiseta" }, { tallaCamisa: "N/A", tallaAntifluido: "S" }), "S")
})
