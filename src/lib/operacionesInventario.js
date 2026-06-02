import {
  catalogoDesdeSupabase,
  catalogoParaSupabase,
  colaboradorDesdeSupabase,
  colaboradorParaSupabase,
  movimientoDesdeSupabase,
  movimientoParaSupabase,
  compraDesdeSupabase,
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

export async function registrarCompraRpc({
  compra,
  lineasCompraDetalle,
}) {
  const { data, error } = await rpcAutenticado("registrar_compra_rpc", {
    p_compra: {
      numero_factura: textoSeguro(compra.numeroFactura, 80),
      fecha: compra.fecha,
      proveedor: textoSeguro(compra.proveedor, 160),
      responsable: textoSeguro(compra.responsable, 160),
      observacion: textoLargoSeguro(compra.observacion || ""),
    },
    p_lineas: lineasCompraDetalle.map((linea) => {
      if (!uuidValido(linea.producto.id)) throw new Error("Producto inválido.")

      return {
        producto_id: linea.producto.id,
        cantidad: numeroSeguro(linea.cantidad, { minimo: 1 }),
        valor_unitario: numeroSeguro(linea.valorUnitario || 0, { minimo: 0, maximo: 1000000000 }),
        observacion: textoSeguro(linea.observacion || "", 220),
      }
    }),
  })

  if (error) throw error

  return {
    compra: data?.compra ? compraDesdeSupabase(data.compra) : null,
    movimientos: Array.isArray(data?.movimientos)
      ? data.movimientos.map(movimientoDesdeSupabase)
      : [],
    productos: Array.isArray(data?.productos)
      ? data.productos.map(productoDesdeSupabase)
      : [],
  }
}

export async function adjuntarFacturaCompraRpc({
  compraId,
  facturaUrl,
  facturaRuta,
}) {
  if (!uuidValido(compraId)) throw new Error("Compra inválida.")

  const { data, error } = await rpcAutenticado("adjuntar_factura_compra_rpc", {
    p_compra_id: compraId,
    p_factura_url: textoSeguro(facturaUrl || "", 500),
    p_factura_ruta: textoSeguro(facturaRuta || "", 500),
  })

  if (error) throw error
  if (!data) {
    throw new Error("No se pudo asociar la factura a la compra. Verifica permisos y que la compra exista.")
  }

  return compraDesdeSupabase(data)
}
