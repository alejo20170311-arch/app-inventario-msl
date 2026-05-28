import { useEffect, useState } from "react"
import { Camera, KeyRound, LogOut, Settings, Sparkles, UserRound } from "lucide-react"

import {
  accountMenu,
  accountMenuButton,
  accountMenuItem,
  accountMenuWrap,
  appShell,
  barraPestanas,
  botonCerrarMensaje,
  botonPestana,
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
  avatarUrl,
  cerrarSesion,
  abrirCambioContrasena,
  cambiarFotoPerfil,
  indicadoresPrincipales,
  renderIndicador,
  mensaje,
  cerrarMensaje,
  children,
}) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [esMovil, setEsMovil] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(max-width: 820px)")
    const actualizar = () => setEsMovil(media.matches)

    actualizar()
    media.addEventListener("change", actualizar)

    return () => media.removeEventListener("change", actualizar)
  }, [])

  const avatar = avatarUrl ? (
    <img src={avatarUrl} alt={perfil.nombre} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
  ) : (
    <UserRound size={22} />
  )

  return (
    <main style={esMovil ? { ...appShell, display: "block" } : appShell}>
      <aside style={esMovil ? { ...sidebar, position: "relative", height: "auto", padding: "18px", gap: "14px" } : sidebar}>
        <img
          src={assetUrl("logo-msl-blanco.png")}
          alt="MSL Group"
          style={esMovil ? { ...sidebarLogo, margin: 0, width: "118px" } : sidebarLogo}
        />

        <nav style={esMovil ? { ...sidebarNav, display: "flex", overflowX: "auto", paddingBottom: "4px" } : sidebarNav}>
          {pestanas.map(({ id, texto, icono: Icono }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPestanaActiva(id)}
              style={esMovil ? { ...sidebarButton(pestanaActiva === id), flex: "0 0 auto" } : sidebarButton(pestanaActiva === id)}
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

      <section style={esMovil ? { ...contentShell, padding: "18px" } : contentShell}>
        <header style={esMovil ? { ...topBar, display: "grid", alignItems: "start" } : topBar}>
          <div style={titleBlock}>
            <h1 style={{ margin: 0, color: "#070b1d", fontSize: "32px", lineHeight: 1.1 }}>
              Inventario Dotación y EPP
            </h1>
            <p style={{ margin: 0, color: "#5f6b85", fontWeight: 700 }}>
              Mercadeo Sin Límites - Gestión Humana
            </p>
          </div>

          <div style={esMovil ? { ...userSummary, justifyContent: "space-between" } : userSummary}>
            <span style={userAvatar}>
              {avatar}
            </span>
            <span style={{ textAlign: "left" }}>
              <strong style={{ display: "block" }}>{perfil.nombre}</strong>
              <span style={{ display: "block", color: "#5f6b85", fontSize: "13px" }}>{perfil.correo}</span>
              <span style={{ display: "block", color: "#5f6b85", fontSize: "13px" }}>{perfil.rol}</span>
            </span>
            <div style={accountMenuWrap}>
              <button
                type="button"
                onClick={() => setMenuAbierto(!menuAbierto)}
                style={accountMenuButton}
                aria-label="Opciones de cuenta"
              >
                <Settings size={20} />
              </button>
              {menuAbierto && (
                <div style={accountMenu}>
                  <label style={accountMenuItem}>
                    <Camera size={17} />
                    Cambiar foto
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        cambiarFotoPerfil(e.target.files?.[0])
                        e.target.value = ""
                        setMenuAbierto(false)
                      }}
                      style={{ display: "none" }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      abrirCambioContrasena()
                      setMenuAbierto(false)
                    }}
                    style={accountMenuItem}
                  >
                    <KeyRound size={17} />
                    Cambiar clave
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      cerrarSesion()
                      setMenuAbierto(false)
                    }}
                    style={accountMenuItem}
                  >
                    <LogOut size={17} />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
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
