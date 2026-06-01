const LONGITUD_TEXTO_CORTO = 120
const LONGITUD_TEXTO_MEDIO = 280
const LONGITUD_TEXTO_LARGO = 1000
const CARACTERES_CONTROL = /[\u0000-\u001F\u007F]/g // eslint-disable-line no-control-regex

export class ErrorValidacion extends Error {
  constructor(mensaje) {
    super(mensaje)
    this.name = "ErrorValidacion"
  }
}

export function textoSeguro(valor, maximo = LONGITUD_TEXTO_MEDIO) {
  return String(valor ?? "")
    .replace(CARACTERES_CONTROL, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximo)
}

export function textoLargoSeguro(valor) {
  return textoSeguro(valor, LONGITUD_TEXTO_LARGO)
}

export function correoValido(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(correo || "").trim())
}

export function uuidValido(valor) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(valor || ""))
}

export function numeroSeguro(valor, { minimo = 0, maximo = 1000000 } = {}) {
  const numero = Number(valor)

  if (!Number.isFinite(numero) || numero < minimo || numero > maximo) {
    throw new ErrorValidacion("El valor numérico no es válido.")
  }

  return numero
}

export function fechaIsoValida(valor) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(valor || ""))
}

export function validarCamposRequeridos(campos) {
  const faltante = campos.find((campo) => !textoSeguro(campo.valor, LONGITUD_TEXTO_CORTO))

  if (faltante) {
    throw new ErrorValidacion(faltante.mensaje)
  }
}

export function validarArchivoCsv(archivo) {
  if (!archivo) return

  const nombre = archivo.name || ""
  const tipo = archivo.type || ""
  const esCsv = nombre.toLowerCase().endsWith(".csv") ||
    ["text/csv", "application/vnd.ms-excel", ""].includes(tipo)

  if (!esCsv) {
    throw new ErrorValidacion("Selecciona un archivo CSV válido.")
  }

  if (archivo.size > 2 * 1024 * 1024) {
    throw new ErrorValidacion("El archivo supera el tamaño permitido de 2 MB.")
  }
}

export function mensajeSeguroError(error) {
  const mensaje = String(error?.message || error || "").toLowerCase()

  if (mensaje.includes("row-level security") || mensaje.includes("permission denied")) {
    return "tu rol no tiene permiso para esta acción."
  }

  if (mensaje.includes("duplicate key") || mensaje.includes("unique constraint")) {
    return "ya existe un registro con esos datos."
  }

  if (mensaje.includes("could not find the function") || (mensaje.includes("function") && mensaje.includes("does not exist"))) {
    return "falta aplicar una función RPC en Supabase."
  }

  if (mensaje.includes("jwt") || mensaje.includes("session") || mensaje.includes("no autenticado")) {
    return "la sesión venció o no está activa. Cierra sesión e ingresa de nuevo."
  }

  if (error instanceof ErrorValidacion) {
    return error.message
  }

  return "ocurrió un error inesperado. Revisa los datos e intenta de nuevo."
}
