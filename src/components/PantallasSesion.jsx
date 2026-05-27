import { Campo } from "./Campo"
import {
  botonPrincipal,
  botonSecundario,
  campoFormulario,
  mensajeApp,
} from "../styles"

export function PantallaCarga({ assetUrl }) {
  return (
    <main style={{ background: "#E0E5EB", minHeight: "100vh", display: "grid", placeItems: "center", padding: "32px" }}>
      <section style={{ background: "#FFFFFF", borderRadius: "12px", padding: "28px", width: "100%", maxWidth: "420px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
        <img src={assetUrl("logo-msl-Azul.jpg")} alt="MSL Group" style={{ width: "150px", display: "block", marginBottom: "18px" }} />
        <h1 style={{ margin: 0, fontSize: "26px" }}>Cargando inventario</h1>
        <p style={{ margin: "10px 0 0" }}>Estamos revisando tu Sesión.</p>
      </section>
    </main>
  )
}

export function PantallaLogin({
  assetUrl,
  credenciales,
  errorLogin,
  sesion,
  actualizarCredenciales,
  iniciarSesion,
  cerrarSesion,
}) {
  return (
    <main style={{ background: "#E0E5EB", minHeight: "100vh", display: "grid", placeItems: "center", padding: "32px" }}>
      <section style={{ background: "#FFFFFF", borderRadius: "12px", overflow: "hidden", width: "100%", maxWidth: "460px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
        <header style={{ background: "#000000", color: "#FFFFFF", padding: "26px" }}>
          <img src={assetUrl("logo-msl-blanco.png")} alt="MSL Group" style={{ width: "150px", display: "block", marginBottom: "18px" }} />
          <h1 style={{ margin: 0, color: "#FFFFFF", fontSize: "28px" }}>Inventario Dotación y EPP</h1>
          <p style={{ margin: "8px 0 0", color: "#E0E5EB" }}>Ingreso de usuarios autorizados</p>
        </header>

        <form onSubmit={iniciarSesion} style={{ display: "grid", gap: "16px", padding: "26px" }}>
          {errorLogin && (
            <div style={mensajeApp("error")}>
              <strong>{errorLogin}</strong>
            </div>
          )}

          <Campo texto="Correo">
            <input
              type="email"
              value={credenciales.correo}
              onChange={(e) => actualizarCredenciales("correo", e.target.value)}
              required
              autoComplete="email"
              style={campoFormulario}
            />
          </Campo>

          <Campo texto="Contraseña">
            <input
              type="password"
              value={credenciales.contrasena}
              onChange={(e) => actualizarCredenciales("contrasena", e.target.value)}
              required
              autoComplete="current-password"
              style={campoFormulario}
            />
          </Campo>

          <button style={botonPrincipal}>Ingresar</button>

          {sesion && (
            <button type="button" onClick={cerrarSesion} style={botonSecundario}>
              Cerrar Sesión actual
            </button>
          )}
        </form>
      </section>
    </main>
  )
}
