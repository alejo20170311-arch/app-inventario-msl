import { catalogoProductosBase } from "../data/inventario"
import { obtenerStockMinimo } from "../utils/inventario"

import { supabase } from "./supabase"

function numero(valor, defecto = 0) {
  const convertido = Number(valor)

  return Number.isFinite(convertido) ? convertido : defecto
}

function texto(valor, defecto = "") {
  return valor ?? defecto
}

export function catalogoDesdeSupabase(item) {
  return {
    id: item.id,
    categoria: item.categoria,
    nombre: item.nombre,
    tipo: item.tipo,
    unidad: item.unidad,
    variantes: Array.isArray(item.variantes) ? item.variantes : [],
    stockMinimo: numero(item.stock_minimo),
  }
}

export function catalogoParaSupabase(item) {
  const stockMinimo = item.stockMinimo !== undefined && item.stockMinimo !== ""
    ? numero(item.stockMinimo)
    : numero(obtenerStockMinimo(item), 0)

  return {
    categoria: item.categoria,
    nombre: item.nombre,
    tipo: item.tipo,
    unidad: item.unidad,
    variantes: Array.isArray(item.variantes) ? item.variantes : [],
    stock_minimo: stockMinimo,
  }
}

export function productoDesdeSupabase(item) {
  return {
    id: item.id,
    nombre: item.nombre,
    categoria: item.categoria,
    tipo: item.tipo,
    variante: item.variante,
    unidad: item.unidad,
    stockActual: numero(item.stock_actual),
    stockMinimo: numero(item.stock_minimo),
    ubicacion: item.ubicacion,
    estado: item.estado,
  }
}

export function productoParaSupabase(producto) {
  const payload = {}

  if ("nombre" in producto) payload.nombre = producto.nombre
  if ("categoria" in producto) payload.categoria = producto.categoria
  if ("tipo" in producto) payload.tipo = producto.tipo
  if ("variante" in producto) payload.variante = producto.variante
  if ("unidad" in producto) payload.unidad = producto.unidad
  if ("stockActual" in producto) payload.stock_actual = numero(producto.stockActual)
  if ("stockMinimo" in producto) payload.stock_minimo = numero(producto.stockMinimo)
  if ("ubicacion" in producto) payload.ubicacion = producto.ubicacion
  if ("estado" in producto) payload.estado = producto.estado

  return payload
}

export function colaboradorDesdeSupabase(item) {
  return {
    id: item.id,
    identificacion: item.identificacion,
    nombreCompleto: item.nombre_completo,
    cargo: item.cargo,
    subArea: item.sub_area,
    grupo: item.grupo,
    centroCostos: item.centro_costos,
    nombreCentroCostos: item.nombre_centro_costos,
    sexo: item.sexo,
    estado: item.estado,
    tallaAntifluido: item.talla_antifluido,
    tallaBata: item.talla_bata,
    tallaCamisa: item.talla_camisa,
    tallaPantalon: item.talla_pantalon,
    tallaBotas: item.talla_botas,
  }
}

export function colaboradorParaSupabase(colaborador) {
  return {
    identificacion: colaborador.identificacion,
    nombre_completo: colaborador.nombreCompleto,
    cargo: colaborador.cargo,
    sub_area: colaborador.subArea,
    grupo: colaborador.grupo,
    centro_costos: colaborador.centroCostos,
    nombre_centro_costos: colaborador.nombreCentroCostos,
    sexo: colaborador.sexo,
    estado: colaborador.estado,
    talla_antifluido: colaborador.tallaAntifluido,
    talla_bata: colaborador.tallaBata,
    talla_camisa: colaborador.tallaCamisa,
    talla_pantalon: colaborador.tallaPantalon,
    talla_botas: colaborador.tallaBotas,
  }
}

export function movimientoDesdeSupabase(item) {
  return {
    id: item.id,
    comprobanteId: item.comprobante_id,
    productoId: item.producto_id,
    producto: item.producto,
    variante: item.variante,
    unidad: item.unidad,
    tipoMovimiento: item.tipo_movimiento,
    cantidad: numero(item.cantidad),
    fecha: item.fecha,
    observacion: texto(item.observacion),
    stockResultante: numero(item.stock_resultante),
  }
}

export function movimientoParaSupabase(item, usuarioId) {
  return {
    id: item.id,
    comprobante_id: item.comprobanteId || null,
    producto_id: item.productoId,
    producto: item.producto,
    variante: item.variante,
    unidad: item.unidad,
    tipo_movimiento: item.tipoMovimiento,
    cantidad: numero(item.cantidad),
    fecha: item.fecha,
    observacion: item.observacion || null,
    stock_resultante: numero(item.stockResultante),
    creado_por: usuarioId || null,
  }
}

export function comprobanteParaSupabase(item, usuarioId) {
  return {
    id: item.id,
    numero: item.numero,
    colaborador_id: item.colaboradorId,
    fecha: item.fecha,
    motivo: item.motivo,
    responsable: item.responsable,
    observacion: item.observacion || null,
    estado: item.estado || "Activa",
    creado_por: usuarioId || null,
  }
}

export function entregaLineaParaSupabase(item) {
  return {
    id: item.id,
    comprobante_id: item.comprobanteId,
    colaborador_id: item.colaboradorId,
    producto_id: item.productoId,
    producto: item.producto,
    categoria: item.categoria,
    tipo: item.tipo,
    variante: item.variante,
    unidad: item.unidad,
    cantidad: numero(item.cantidad),
    stock_resultante: numero(item.stockResultante),
    estado: item.estado || "Activa",
  }
}

export function entregaDesdeSupabase(item) {
  const comprobante = item.comprobantes || {}
  const colaborador = item.colaboradores || {}

  return {
    id: item.id,
    comprobanteId: item.comprobante_id,
    numeroComprobante: comprobante.numero || item.comprobante_id,
    estado: item.estado || comprobante.estado || "Activa",
    colaboradorId: item.colaborador_id,
    colaborador: texto(colaborador.nombre_completo),
    identificacion: texto(colaborador.identificacion),
    grupo: texto(colaborador.grupo),
    centroCostos: texto(colaborador.centro_costos),
    nombreCentroCostos: texto(colaborador.nombre_centro_costos),
    productoId: item.producto_id,
    producto: item.producto,
    categoria: item.categoria,
    tipo: item.tipo,
    variante: item.variante,
    unidad: item.unidad,
    cantidad: numero(item.cantidad),
    fecha: comprobante.fecha || "",
    motivo: texto(comprobante.motivo),
    responsable: texto(comprobante.responsable),
    observacion: texto(comprobante.observacion),
    stockResultante: numero(item.stock_resultante),
    motivoAnulacion: texto(comprobante.motivo_anulacion),
  }
}

async function cargarCatalogoProductos() {
  const { data, error } = await supabase
    .from("catalogo_productos")
    .select("id, categoria, nombre, tipo, unidad, variantes, stock_minimo")
    .order("categoria")
    .order("nombre")

  if (error) throw error

  return data.length > 0 ? data.map(catalogoDesdeSupabase) : catalogoProductosBase
}

function lanzarSiError(respuesta) {
  if (respuesta.error) throw respuesta.error

  return respuesta.data || []
}

export async function cargarDatosInventario() {
  const [
    catalogoProductos,
    productosRespuesta,
    colaboradoresRespuesta,
    movimientosRespuesta,
    entregasRespuesta,
  ] = await Promise.all([
    cargarCatalogoProductos(),
    supabase
      .from("productos")
      .select("id, nombre, categoria, tipo, variante, unidad, stock_actual, stock_minimo, ubicacion, estado")
      .order("nombre"),
    supabase
      .from("colaboradores")
      .select("id, identificacion, nombre_completo, cargo, sub_area, grupo, centro_costos, nombre_centro_costos, sexo, estado, talla_antifluido, talla_bata, talla_camisa, talla_pantalon, talla_botas")
      .order("nombre_completo"),
    supabase
      .from("movimientos")
      .select("id, comprobante_id, producto_id, producto, variante, unidad, tipo_movimiento, cantidad, fecha, observacion, stock_resultante, creado_en")
      .order("fecha", { ascending: false })
      .order("creado_en", { ascending: false }),
    supabase
      .from("entregas")
      .select(`
        id,
        comprobante_id,
        colaborador_id,
        producto_id,
        producto,
        categoria,
        tipo,
        variante,
        unidad,
        cantidad,
        stock_resultante,
        estado,
        creado_en,
        comprobantes (
          numero,
          fecha,
          motivo,
          responsable,
          observacion,
          estado,
          motivo_anulacion
        ),
        colaboradores (
          identificacion,
          nombre_completo,
          grupo,
          centro_costos,
          nombre_centro_costos
        )
      `)
      .order("creado_en", { ascending: false }),
  ])

  const productos = lanzarSiError(productosRespuesta).map(productoDesdeSupabase)
  const colaboradores = lanzarSiError(colaboradoresRespuesta).map(colaboradorDesdeSupabase)
  const movimientos = lanzarSiError(movimientosRespuesta).map(movimientoDesdeSupabase)
  const entregas = lanzarSiError(entregasRespuesta).map(entregaDesdeSupabase)

  return {
    catalogoProductos,
    productos,
    colaboradores,
    movimientos,
    entregas,
  }
}
