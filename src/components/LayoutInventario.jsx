import { LogOut, Sparkles, UserRound } from "lucide-react"

import {
  appShell,
  barraPestanas,
  botonCerrarMensaje,
  botonPestana,
  botonPrincipal,
  contentShell,
  dashboardGrid,
  mensajeApp,
  sidebar,
  sidebarButton,
  sidebarFooter,
  sidebarLogo,
  sidebarNav,
  sidebarUser,
  titleBlock,
  topBar,
  userAvatar,
  userSummary,
} from "../styles"

export function LayoutInventario({
  assetUrl,
  pestanas,
  pestanaActiva,
  setPestanaActiva,
  perfil,
  cerrarSesion,
  indicadoresPrincipales,
  renderIndicador,
  mensaje,
  cerrarMensaje,
  children,
}) {
  return (
    <main style={appShell}>
      <aside style={sidebar}>
        <img
          src={assetUrl("logo-msl-blanco.png")}
          alt="MSL Group"
          style={sidebarLogo}
        />

        <nav style={sidebarNav}>
          {pestanas.map(({ id, texto, icono: Icono }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPestanaActiva(id)}
              style={sidebarButton(pestanaActiva === id)}
            >
              <Icono size={20} strokeWidth={2.4} />
              {texto}
            </button>
          ))}
        </nav>

        <div style={sidebarFooter}>
          <div style={sidebarUser}>
            <span style={userAvatar}>
              <Sparkles size={22} />
            </span>
            <span style={{ minWidth: 0 }}>
              <strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{perfil.nombre}</strong>
              <span style={{ display: "block", color: "rgba(255,255,255,0.78)", fontSize: "12px" }}>{perfil.rol}</span>
            </span>
          </div>
        </div>
      </aside>

      <section style={contentShell}>
        <header style={topBar}>
          <div style={titleBlock}>
            <h1 style={{ margin: 0, color: "#070b1d", fontSize: "32px", lineHeight: 1.1 }}>
              Inventario Dotación y EPP
            </h1>
            <p style={{ margin: 0, color: "#5f6b85", fontWeight: 700 }}>
              Mercadeo Sin Límites - Gestión Humana
            </p>
          </div>

          <div style={userSummary}>
            <span style={userAvatar}>
              <UserRound size={22} />
            </span>
            <span style={{ textAlign: "left" }}>
              <strong style={{ display: "block" }}>{perfil.nombre}</strong>
              <span style={{ display: "block", color: "#5f6b85", fontSize: "13px" }}>{perfil.correo}</span>
              <span style={{ display: "block", color: "#5f6b85", fontSize: "13px" }}>{perfil.rol}</span>
            </span>
            <button type="button" onClick={cerrarSesion} style={botonPrincipal}>
              Cerrar Sesión
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div style={dashboardGrid}>
          {indicadoresPrincipales.map(renderIndicador)}
        </div>

        <nav style={barraPestanas}>
          {pestanas
            .filter(({ id }) => id !== "panel")
            .map(({ id, texto }) => (
              <button
                key={id}
                type="button"
                onClick={() => setPestanaActiva(id)}
                style={botonPestana(pestanaActiva === id)}
              >
                {texto}
              </button>
            ))}
        </nav>

        {mensaje && (
          <div style={mensajeApp(mensaje.tipo)}>
            <strong>{mensaje.texto}</strong>
            <button type="button" onClick={cerrarMensaje} style={botonCerrarMensaje}>
              Cerrar
            </button>
          </div>
        )}

        {children}
      </section>
    </main>
  )
}
