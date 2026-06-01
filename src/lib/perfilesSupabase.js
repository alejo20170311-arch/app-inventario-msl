import { correoValido, textoSeguro, uuidValido } from "../utils/seguridad"

import { obtenerSesionActiva, rpcAutenticado, supabase } from "./supabase"

const COLUMNAS_PERFIL = "id, nombre, correo, rol, estado, creado_en"

export async function cargarPerfilUsuario(usuarioId) {
  if (!uuidValido(usuarioId)) throw new Error("Usuario inválido.")

  const { data, error } = await supabase
    .from("perfiles")
    .select("nombre, correo, rol, estado")
    .eq("id", usuarioId)
    .single()

  if (error) throw error

  return data
}

export async function cargarAdministracionUsuarios() {
  await obtenerSesionActiva()

  const [perfilesRespuesta, auditoriaRespuesta] = await Promise.all([
    supabase
      .from("perfiles")
      .select(COLUMNAS_PERFIL)
      .order("nombre"),
    supabase
      .from("auditoria")
      .select("id, usuario_id, accion, tabla, registro_id, detalle, creado_en")
      .order("creado_en", { ascending: false })
      .limit(200),
  ])

  if (perfilesRespuesta.error) throw perfilesRespuesta.error
  if (auditoriaRespuesta.error) throw auditoriaRespuesta.error

  return {
    perfiles: perfilesRespuesta.data || [],
    auditoria: auditoriaRespuesta.data || [],
  }
}

export async function guardarPerfilUsuarioSeguro(perfil) {
  await obtenerSesionActiva()

  const payload = {
    id: textoSeguro(perfil.id, 80),
    nombre: textoSeguro(perfil.nombre, 120),
    correo: textoSeguro(perfil.correo, 160).toLowerCase(),
    rol: textoSeguro(perfil.rol, 40),
    estado: textoSeguro(perfil.estado, 20),
  }

  if (!uuidValido(payload.id)) throw new Error("ID de usuario inválido.")
  if (!payload.nombre || !correoValido(payload.correo)) throw new Error("Datos de perfil inválidos.")

  const { data, error } = await rpcAutenticado("guardar_perfil_rpc", {
    p_perfil: payload,
  })

  if (error) throw error

  return data
}

export async function cambiarEstadoPerfilSeguro(perfilId, estado) {
  await obtenerSesionActiva()

  if (!uuidValido(perfilId)) throw new Error("ID de usuario inválido.")

  const { data, error } = await rpcAutenticado("cambiar_estado_perfil_rpc", {
    p_perfil_id: perfilId,
    p_estado: estado,
  })

  if (error) throw error

  return data
}
