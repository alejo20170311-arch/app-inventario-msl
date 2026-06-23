import { rpcAutenticado } from "./supabase"

function responsableDesdePerfil(item) {
  return {
    id: item.id,
    nombre: item.nombre,
    correo: item.correo,
    identificacion: item.identificacion || item.documento || item.numero_documento || "",
    rol: item.rol,
    estado: item.estado,
  }
}

function fallbackResponsable(perfilActual) {
  if (!perfilActual?.nombre) return []

  return [responsableDesdePerfil({
    id: "usuario-actual",
    nombre: perfilActual.nombre,
    correo: perfilActual.correo,
    rol: perfilActual.rol,
    estado: perfilActual.estado || "Activo",
  })]
}

export async function cargarResponsablesEntrega(perfilActual) {
  const respaldo = fallbackResponsable(perfilActual)

  try {
    const { data, error } = await rpcAutenticado("listar_responsables_entrega_rpc")

    if (error) return respaldo

    const responsables = (data || [])
      .filter((item) => item?.nombre && item.estado === "Activo")
      .map(responsableDesdePerfil)
      .sort((a, b) => a.nombre.localeCompare(b.nombre))

    return responsables.length > 0 ? responsables : respaldo
  } catch {
    return respaldo
  }
}
