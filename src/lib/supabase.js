import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const posibleServiceRole = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local")
}

if (posibleServiceRole || String(supabaseAnonKey).toLowerCase().includes("service_role")) {
  throw new Error("La service role key no puede usarse en el frontend.")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export async function obtenerSesionActiva() {
  const { data, error } = await supabase.auth.getSession()

  if (error || !data.session?.user) {
    throw new Error("Usuario no autenticado.")
  }

  return data.session
}

export async function rpcAutenticado(nombre, parametros = {}) {
  await obtenerSesionActiva()

  return supabase.rpc(nombre, parametros)
}
