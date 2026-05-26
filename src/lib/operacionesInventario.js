import { ahoraISO } from "../utils/fechas"

import {
  comprobanteParaSupabase,
  entregaLineaParaSupabase,
  movimientoDesdeSupabase,
  movimientoParaSupabase,
  productoDesdeSupabase,
  productoParaSupabase,
} from "./inventarioSupabase"
import { supabase } from "./supabase"

async function ejecutarRollbacks(pasos) {
  const errores = []

  for (const paso of pasos) {
    try {
      const respuesta = await paso.ejecutar()

      if (respuesta?.error) throw respuesta.error
    } catch (error) {
      errores.push(`${paso.nombre}: ${error.message}`)
    }
  }

  return errores
}

function errorConRollback(error, erroresRollback) {
  if (!erroresRollback.length) return error

  return new Error(`${error.message}. Ademas, no se pudo revertir todo automaticamente: ${erroresRollback.join("; ")}`)
}

function restaurarProducto(producto) {
  return supabase
    .from("productos")
    .update({
      ...productoParaSupabase(producto),
      actualizado_en: ahoraISO(),
    })
    .eq("id", producto.id)
}

async function insertarMovimiento(movimiento, usuarioId) {
  const { data, error } = await supabase
    .from("movimientos")
    .insert(movimientoParaSupabase(movimiento, usuarioId))
    .select("*")
    .single()

  if (error) throw error

  return movimientoDesdeSupabase(data)
}

export async function actualizarProductoConMovimiento({
  productoAnterior,
  productoPayload,
  movimiento,
  usuarioId,
}) {
  let productoActualizado = null

  try {
    const { data, error } = await supabase
      .from("productos")
      .update({
        ...productoParaSupabase(productoPayload),
        actualizado_en: ahoraISO(),
      })
      .eq("id", productoAnterior.id)
      .select("*")
      .single()

    if (error) throw error

    productoActualizado = productoDesdeSupabase(data)

    if (!movimiento) {
      return { producto: productoActualizado, movimiento: null }
    }

    const movimientoCreado = await insertarMovimiento(movimiento, usuarioId)

    return { producto: productoActualizado, movimiento: movimientoCreado }
  } catch (error) {
    if (!productoActualizado) throw error

    const erroresRollback = await ejecutarRollbacks([
      {
        nombre: "restaurar producto",
        ejecutar: () => restaurarProducto(productoAnterior),
      },
    ])

    throw errorConRollback(error, erroresRollback)
  }
}

export async function crearProductoConMovimiento({
  productoPayload,
  crearMovimiento,
  usuarioId,
}) {
  let productoCreado = null

  try {
    const { data, error } = await supabase
      .from("productos")
      .insert(productoParaSupabase(productoPayload))
      .select("*")
      .single()

    if (error) throw error

    productoCreado = productoDesdeSupabase(data)

    const movimiento = crearMovimiento?.(productoCreado)

    if (!movimiento) {
      return { producto: productoCreado, movimiento: null }
    }

    const movimientoCreado = await insertarMovimiento(movimiento, usuarioId)

    return { producto: productoCreado, movimiento: movimientoCreado }
  } catch (error) {
    if (!productoCreado) throw error

    const erroresRollback = await ejecutarRollbacks([
      {
        nombre: "eliminar producto creado",
        ejecutar: () => supabase.from("productos").delete().eq("id", productoCreado.id),
      },
    ])

    throw errorConRollback(error, erroresRollback)
  }
}

export async function registrarEntregaConRollback({
  comprobante,
  nuevasEntregas,
  movimientosEntrega,
  stockFinalPorProducto,
  stockAnteriorPorProducto,
  usuarioId,
}) {
  let comprobanteCreado = false
  let productosActualizados = false
  let entregasCreadas = false

  try {
    const { error: comprobanteError } = await supabase
      .from("comprobantes")
      .insert(comprobanteParaSupabase(comprobante, usuarioId))

    if (comprobanteError) throw comprobanteError

    comprobanteCreado = true

    const actualizacionesProducto = await Promise.all(
      Array.from(stockFinalPorProducto.entries()).map(([productoId, stockFinal]) =>
        supabase
          .from("productos")
          .update({
            stock_actual: stockFinal,
            actualizado_en: ahoraISO(),
          })
          .eq("id", productoId)
      )
    )
    const errorProducto = actualizacionesProducto.find((respuesta) => respuesta.error)?.error
    productosActualizados = actualizacionesProducto.some((respuesta) => !respuesta.error)

    if (errorProducto) throw errorProducto

    const { error: entregasError } = await supabase
      .from("entregas")
      .insert(nuevasEntregas.map(entregaLineaParaSupabase))

    if (entregasError) throw entregasError

    entregasCreadas = true

    const { data: movimientosData, error: movimientosError } = await supabase
      .from("movimientos")
      .insert(movimientosEntrega.map((item) => movimientoParaSupabase(item, usuarioId)))
      .select("*")

    if (movimientosError) throw movimientosError

    return {
      movimientos: movimientosData.map(movimientoDesdeSupabase),
    }
  } catch (error) {
    const pasosRollback = []

    if (entregasCreadas) {
      pasosRollback.push({
        nombre: "eliminar entregas creadas",
        ejecutar: () => supabase
          .from("entregas")
          .delete()
          .in("id", nuevasEntregas.map((item) => item.id)),
      })
    }

    if (productosActualizados) {
      pasosRollback.push(
        ...Array.from(stockAnteriorPorProducto.entries()).map(([productoId, stockAnterior]) => ({
          nombre: `restaurar stock ${productoId}`,
          ejecutar: () => supabase
            .from("productos")
            .update({
              stock_actual: stockAnterior,
              actualizado_en: ahoraISO(),
            })
            .eq("id", productoId),
        }))
      )
    }

    if (comprobanteCreado) {
      pasosRollback.push({
        nombre: "eliminar comprobante creado",
        ejecutar: () => supabase.from("comprobantes").delete().eq("id", comprobante.id),
      })
    }

    const erroresRollback = await ejecutarRollbacks(pasosRollback)

    throw errorConRollback(error, erroresRollback)
  }
}

export async function anularEntregaConRollback({
  entregaSeleccionada,
  entregasComprobante,
  productosActualizados,
  productosAnteriores,
  movimientosAnulacion,
  motivoAnulacion,
  usuarioId,
}) {
  let estadoActualizado = false
  let productosGuardados = false

  try {
    if (entregaSeleccionada.comprobanteId) {
      const { error: comprobanteError } = await supabase
        .from("comprobantes")
        .update({
          estado: "Anulada",
          motivo_anulacion: motivoAnulacion,
          anulado_en: ahoraISO(),
        })
        .eq("id", entregaSeleccionada.comprobanteId)

      if (comprobanteError) throw comprobanteError

      const { error: entregasError } = await supabase
        .from("entregas")
        .update({ estado: "Anulada" })
        .eq("comprobante_id", entregaSeleccionada.comprobanteId)

      if (entregasError) throw entregasError
    } else {
      const { error: entregaError } = await supabase
        .from("entregas")
        .update({ estado: "Anulada" })
        .eq("id", entregaSeleccionada.id)

      if (entregaError) throw entregaError
    }

    estadoActualizado = true

    const actualizacionesProducto = await Promise.all(
      productosActualizados.map((producto) =>
        supabase
          .from("productos")
          .update({
            stock_actual: producto.stockActual,
            actualizado_en: ahoraISO(),
          })
          .eq("id", producto.id)
      )
    )
    const errorProducto = actualizacionesProducto.find((respuesta) => respuesta.error)?.error
    productosGuardados = actualizacionesProducto.some((respuesta) => !respuesta.error)

    if (errorProducto) throw errorProducto

    const { data: movimientosData, error: movimientosError } = await supabase
      .from("movimientos")
      .insert(movimientosAnulacion.map((item) => movimientoParaSupabase(item, usuarioId)))
      .select("*")

    if (movimientosError) throw movimientosError

    return {
      movimientos: movimientosData.map(movimientoDesdeSupabase),
    }
  } catch (error) {
    const pasosRollback = []

    if (productosGuardados) {
      pasosRollback.push(
        ...productosAnteriores.map((producto) => ({
          nombre: `restaurar stock ${producto.id}`,
          ejecutar: () => supabase
            .from("productos")
            .update({
              stock_actual: producto.stockActual,
              actualizado_en: ahoraISO(),
            })
            .eq("id", producto.id),
        }))
      )
    }

    if (estadoActualizado) {
      if (entregaSeleccionada.comprobanteId) {
        pasosRollback.push(
          {
            nombre: "restaurar comprobante",
            ejecutar: () => supabase
              .from("comprobantes")
              .update({
                estado: "Activa",
                motivo_anulacion: null,
                anulado_en: null,
              })
              .eq("id", entregaSeleccionada.comprobanteId),
          },
          {
            nombre: "restaurar entregas",
            ejecutar: () => supabase
              .from("entregas")
              .update({ estado: "Activa" })
              .in("id", entregasComprobante.map((item) => item.id)),
          }
        )
      } else {
        pasosRollback.push({
          nombre: "restaurar entrega",
          ejecutar: () => supabase
            .from("entregas")
            .update({ estado: "Activa" })
            .eq("id", entregaSeleccionada.id),
        })
      }
    }

    const erroresRollback = await ejecutarRollbacks(pasosRollback)

    throw errorConRollback(error, erroresRollback)
  }
}

export async function registrarEntregaRpc({
  entrega,
  lineasEntregaDetalle,
}) {
  const { data, error } = await supabase.rpc("registrar_entrega_rpc", {
    p_colaborador_id: entrega.colaboradorId,
    p_fecha: entrega.fecha,
    p_motivo: entrega.motivo,
    p_responsable: entrega.responsable,
    p_observacion: entrega.observacion || "",
    p_lineas: lineasEntregaDetalle.map((linea) => ({
      producto_id: linea.producto.id,
      cantidad: Number(linea.cantidad),
    })),
  })

  if (error) throw error

  return {
    comprobante: data?.comprobante || null,
    entregas: Array.isArray(data?.entregas) ? data.entregas : [],
    movimientos: Array.isArray(data?.movimientos) ? data.movimientos : [],
  }
}

export async function anularComprobanteRpc({
  entregaId,
  motivoAnulacion,
}) {
  const { data, error } = await supabase.rpc("anular_comprobante_rpc", {
    p_entrega_id: entregaId,
    p_motivo_anulacion: motivoAnulacion,
  })

  if (error) throw error

  return {
    comprobanteId: data?.comprobanteId,
    numeroComprobante: data?.numeroComprobante,
    estado: data?.estado || "Anulada",
    motivoAnulacion: data?.motivoAnulacion || motivoAnulacion,
    movimientos: Array.isArray(data?.movimientos) ? data.movimientos : [],
    productos: Array.isArray(data?.productos) ? data.productos : [],
  }
}
