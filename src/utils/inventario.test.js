import assert from "node:assert/strict"
import test from "node:test"

import {
  productoPedidoDotacionParaColaborador,
  productoSugeridoParaColaborador,
} from "./inventario.js"

const colaborador = {
  tipoDotacion: "MSL Operario azul dama uniforme+Bota de seguridad+MSL Cofia unisex",
  sexo: "Femenino",
  tallaAntifluido: "S",
  tallaCamisa: "S",
  tallaBotas: "35",
}

const uniforme = {
  categoria: "Dotaci\u00f3n",
  nombre: "MSL Operario azul dama uniforme",
  tipo: "Uniforme",
  variante: "S",
}

test("sugiere la dotacion asignada con la talla y el sexo del colaborador", () => {
  assert.equal(productoSugeridoParaColaborador(uniforme, colaborador), true)
  assert.equal(productoSugeridoParaColaborador({ ...uniforme, variante: "M" }, colaborador), false)
  assert.equal(productoSugeridoParaColaborador(uniforme, { ...colaborador, sexo: "Masculino" }), false)
  assert.equal(productoPedidoDotacionParaColaborador(uniforme, colaborador), true)
})

test("no sugiere prendas de otras dotaciones aunque coincida la talla", () => {
  for (const nombre of ["MSL Camisa azul clara dama p. venta", "Camiseta Cuello Redondo Unisex Negra"]) {
    assert.equal(productoSugeridoParaColaborador({ ...uniforme, nombre, tipo: "Camisa" }, colaborador), false)
  }
})

test("solo sugiere botas y prendas sin tallaje cuando estan asignadas", () => {
  const botas = { ...uniforme, nombre: "Bota de seguridad", tipo: "Calzado", variante: "35" }
  const cofia = { ...uniforme, nombre: "MSL Cofia unisex", tipo: "Cofia", variante: "Unica" }
  const bono = { ...uniforme, nombre: "Bono Sodexo", tipo: "Bono", variante: "Unica" }
  assert.equal(productoSugeridoParaColaborador(botas, colaborador), true)
  assert.equal(productoSugeridoParaColaborador({ ...botas, variante: "36" }, colaborador), false)
  assert.equal(productoSugeridoParaColaborador(cofia, colaborador), true)
  assert.equal(productoSugeridoParaColaborador(bono, colaborador), false)
  assert.equal(productoSugeridoParaColaborador(bono, { ...colaborador, tipoDotacion: "Bono Sodexo" }), true)
})

test("no marca EPP ni productos sin asignacion como sugeridos", () => {
  const epp = { categoria: "EPP", nombre: "Careta Esmerilar", tipo: "Proteccion facial", variante: "Unica" }
  assert.equal(productoSugeridoParaColaborador(epp, { ...colaborador, tipoDotacion: epp.nombre }), false)
  for (const tipoDotacion of ["No aplica", "", undefined]) {
    assert.equal(productoSugeridoParaColaborador(uniforme, { ...colaborador, tipoDotacion }), false)
  }
  assert.equal(productoSugeridoParaColaborador(uniforme, null), false)
})

test("una camiseta asignada conserva la talla de camisa o antifluido", () => {
  const camiseta = { ...uniforme, nombre: "Camiseta Cuello Redondo Unisex Negra", tipo: "Camiseta" }
  const asignado = { ...colaborador, tipoDotacion: camiseta.nombre, tallaCamisa: "N/A" }
  assert.equal(productoSugeridoParaColaborador(camiseta, asignado), true)
  assert.equal(productoPedidoDotacionParaColaborador(camiseta, asignado), true)
  assert.equal(productoSugeridoParaColaborador({ ...camiseta, variante: "M" }, asignado), false)
})
