import {
  catalogoDesdeSupabase,
  catalogoParaSupabase,
  colaboradorDesdeSupabase,
  colaboradorParaSupabase,
  movimientoDesdeSupabase,
  movimientoParaSupabase,
  productoDesdeSupabase,
  productoParaSupabase,
} from "./inventarioSupabase"
import { rpcAutenticado } from "./supabase"
import { numeroSeguro, textoLargoSeguro, textoSeguro, uuidValido } from "../utils/seguridad"

export async function guardarProductoMovimientoRpc({
  productoId = null,
  productoPayload,
  movimiento = null,
}) {
  const { data, error } = await rpcAutenticado("guardar_producto_movimiento_rpc", {
    p_producto_id: productoId,
    p_producto: productoParaSupabase(productoPayload),
    p_movimiento: movimiento ? movimientoParaSupabase(movimiento, null) : null,
  })

  if (error) throw error

  return {
    producto: productoDesdeSupabase(data.producto),
    movimiento: data.movimiento ? movimientoDesdeSupabase(data.movimiento) : null,
  }
}

export async function eliminarProductoAdminRpc(productoId) {
  if (!uuidValido(productoId)) throw new Error("Producto inválido.")

  const { data, error } = await rpcAutenticado("eliminar_producto_admin_rpc", {
    p_producto_id: productoId,
  })

  if (error) throw error

  return data
}

export async function guardarCatalogoProductoRpc({
  catalogoId = null,
  catalogoPayload,
}) {
  const { data, error } = await rpcAutenticado("guardar_catalogo_producto_rpc", {
    p_catalogo_id: catalogoId,
    p_catalogo: catalogoParaSupabase(catalogoPayload),
  })

  if (error) throw error

  return catalogoDesdeSupabase(data)
}

export async function guardarColaboradorRpc({
  colaboradorId = null,
  colaboradorPayload,
}) {
  const { data, error } = await rpcAutenticado("guardar_colaborador_rpc", {
    p_colaborador_id: colaboradorId,
    p_colaborador: colaboradorParaSupabase(colaboradorPayload),
  })

  if (error) throw error

  return colaboradorDesdeSupabase(data)
}

export async function eliminarColaboradorRpc(colaboradorId) {
  if (!uuidValido(colaboradorId)) throw new Error("Colaborador inválido.")

  const { data, error } = await rpcAutenticado("eliminar_colaborador_rpc", {
    p_colaborador_id: colaboradorId,
  })

  if (error) throw error

  return {
    accion: data?.accion || "eliminado",
    colaborador: data?.colaborador ? colaboradorDesdeSupabase(data.colaborador) : null,
    colaboradorId: data?.colaboradorId || colaboradorId,
  }
}

export async function registrarEntregaRpc({
  entrega,
  lineasEntregaDetalle,
}) {
  const { data, error } = await rpcAutenticado("registrar_entrega_rpc", {
    p_colaborador_id: entrega.colaboradorId,
    p_fecha: entrega.fecha,
    p_motivo: textoSeguro(entrega.motivo, 80),
    p_responsable: textoSeguro(entrega.responsable, 160),
    p_observacion: textoLargoSeguro(entrega.observacion),
    p_lineas: lineasEntregaDetalle.map((linea) => ({
      producto_id: linea.producto.id,
      cantidad: numeroSeguro(linea.cantidad, { minimo: 1 }),
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
  if (!uuidValido(entregaId)) throw new Error("Entrega inválida.")

  const { data, error } = await rpcAutenticado("anular_comprobante_rpc", {
    p_entrega_id: entregaId,
    p_motivo_anulacion: textoLargoSeguro(motivoAnulacion),
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
