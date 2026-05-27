const azul = "#0500ff"
const azulOscuro = "#02009b"
const azulSuave = "#eef3ff"
const borde = "#dbe3f0"
const texto = "#070b1d"
const textoSuave = "#5f6b85"
const sombra = "0 14px 34px rgba(15, 23, 42, 0.08)"

export const appShell = {
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns: "220px minmax(0, 1fr)",
  background: "#f5f7fb",
  color: texto,
}

export const sidebar = {
  position: "sticky",
  top: 0,
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  background: `linear-gradient(180deg, ${azul} 0%, #001fbd 52%, ${azulOscuro} 100%)`,
  color: "#ffffff",
  padding: "24px 18px",
  overflowY: "auto",
}

export const sidebarLogo = {
  width: "134px",
  display: "block",
  margin: "12px 0 28px",
}

export const sidebarNav = {
  display: "grid",
  gap: "8px",
}

export function sidebarButton(activo) {
  return {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    width: "100%",
    background: activo ? "rgba(255,255,255,0.17)" : "transparent",
    color: "#ffffff",
    border: activo ? "1px solid rgba(255,255,255,0.16)" : "1px solid transparent",
    borderRadius: "8px",
    padding: "12px 14px",
    fontWeight: 800,
    textAlign: "left",
    boxShadow: activo ? "inset 4px 0 0 rgba(255,255,255,0.85)" : "none",
  }
}

export const sidebarFooter = {
  marginTop: "auto",
  paddingTop: "18px",
  borderTop: "1px solid rgba(255,255,255,0.25)",
}

export const sidebarUser = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  minWidth: 0,
}

export const contentShell = {
  minWidth: 0,
  padding: "30px 40px 42px",
}

export const topBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "24px",
  marginBottom: "26px",
}

export const titleBlock = {
  display: "grid",
  gap: "8px",
}

export const userSummary = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  flexWrap: "wrap",
  justifyContent: "flex-end",
}

export const userAvatar = {
  width: "44px",
  height: "44px",
  display: "grid",
  placeItems: "center",
  borderRadius: "50%",
  background: "#050505",
  color: "#ffffff",
  flex: "0 0 auto",
}

export const gridFormulario = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "16px 18px",
  marginTop: "14px",
  alignItems: "end",
}

export const dashboardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "18px",
  marginTop: "16px",
}

export const panelGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: "18px",
  marginTop: "18px",
}

export const panelBloque = {
  background: "#ffffff",
  border: `1px solid ${borde}`,
  borderRadius: "8px",
  padding: "20px",
  overflowX: "auto",
  boxShadow: sombra,
}

export const campoFormulario = {
  width: "100%",
  minHeight: "40px",
  padding: "10px 12px",
  border: `1px solid ${borde}`,
  borderRadius: "6px",
  background: "#ffffff",
  color: texto,
  fontSize: "14px",
  outlineColor: azul,
}

export const campoBusqueda = {
  ...campoFormulario,
  width: "100%",
  maxWidth: "520px",
  marginTop: "8px",
}

export const grupoFiltros = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "12px",
}

export const resumenHistorial = {
  display: "grid",
  gridTemplateColumns: "2fr repeat(3, 1fr)",
  gap: "12px",
  marginTop: "16px",
  padding: "16px",
  border: `1px solid ${borde}`,
  borderLeft: `5px solid ${azul}`,
  borderRadius: "8px",
  background: "#ffffff",
}

export function botonFiltro(activo) {
  return {
    background: activo ? azul : "#ffffff",
    color: activo ? "#ffffff" : texto,
    border: activo ? `1px solid ${azul}` : `1px solid ${borde}`,
    padding: "8px 12px",
    borderRadius: "6px",
    fontWeight: 800,
  }
}

export const tabla = {
  width: "100%",
  minWidth: "760px",
  borderCollapse: "separate",
  borderSpacing: 0,
  marginTop: "14px",
  border: `1px solid ${borde}`,
  borderRadius: "8px",
  overflow: "hidden",
}

export const encabezadoTabla = {
  background: "#f8faff",
  color: texto,
}

export const filaBotones = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  alignItems: "center",
}

export const ayudaFormulario = {
  gridColumn: "1 / -1",
  background: azulSuave,
  border: `1px solid ${borde}`,
  borderLeft: `5px solid ${azul}`,
  borderRadius: "8px",
  padding: "12px",
  margin: 0,
}

export function mensajeApp(tipo = "info") {
  const estilos = {
    info: { background: "#eff6ff", border: "#78aaff", color: texto },
    exito: { background: "#ecfdf5", border: "#008a4c", color: "#064e3b" },
    error: { background: "#fef2f2", border: "#b91c1c", color: "#7f1d1d" },
  }
  const estilo = estilos[tipo] || estilos.info

  return {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center",
    background: estilo.background,
    color: estilo.color,
    border: `1px solid ${estilo.border}`,
    borderLeft: `5px solid ${estilo.border}`,
    borderRadius: "8px",
    padding: "12px 14px",
    marginTop: "18px",
  }
}

export const botonCerrarMensaje = {
  background: "transparent",
  color: "inherit",
  border: "none",
  padding: "4px 6px",
  fontWeight: 800,
}

export const barraPestanas = {
  display: "flex",
  gap: "12px",
  marginTop: "24px",
  borderBottom: `1px solid ${borde}`,
  paddingBottom: "10px",
  overflowX: "auto",
}

export const accionesModulo = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  marginTop: "22px",
}

export function botonPestana(activa) {
  return {
    background: activa ? azul : "#ffffff",
    color: activa ? "#ffffff" : texto,
    border: activa ? `1px solid ${azul}` : "1px solid transparent",
    padding: "10px 18px",
    borderRadius: "6px",
    fontWeight: 800,
    boxShadow: activa ? "0 8px 18px rgba(5, 0, 255, 0.22)" : "none",
  }
}

export const botonSecundario = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  background: "#ffffff",
  color: azul,
  border: `1px solid ${azul}`,
  padding: "10px 16px",
  borderRadius: "6px",
  fontWeight: 800,
}

export const resumenTallas = {
  display: "grid",
  gap: "4px",
  background: azulSuave,
  borderLeft: `5px solid ${azul}`,
  padding: "12px",
  borderRadius: "8px",
  fontSize: "14px",
}

export const resumenLineasEntrega = {
  gridColumn: "1 / -1",
  border: `1px solid ${borde}`,
  borderLeft: `5px solid ${azul}`,
  borderRadius: "8px",
  padding: "14px",
  overflowX: "auto",
  background: "#ffffff",
}

export const modalBackdrop = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  display: "grid",
  placeItems: "center",
  padding: "24px",
  background: "rgba(7, 11, 29, 0.46)",
}

export const modalPanel = {
  width: "min(540px, 100%)",
  background: "#ffffff",
  border: `1px solid ${borde}`,
  borderRadius: "8px",
  padding: "22px",
  boxShadow: "0 24px 70px rgba(7, 11, 29, 0.24)",
}

export const modalResumen = {
  display: "grid",
  gap: "6px",
  margin: "14px 0",
  padding: "12px",
  border: `1px solid ${borde}`,
  borderLeft: `5px solid ${azul}`,
  borderRadius: "8px",
  background: azulSuave,
}

export const modalAcciones = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "16px",
}

export const celdaTabla = {
  padding: "12px 14px",
  borderBottom: `1px solid ${borde}`,
  textAlign: "left",
  fontSize: "13px",
  color: texto,
}

export const filaAnulada = {
  background: "#f3f4f6",
  color: textoSuave,
  textDecoration: "line-through",
}

export const botonPrincipal = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  background: azul,
  color: "#ffffff",
  border: "none",
  padding: "12px 18px",
  borderRadius: "6px",
  fontWeight: 800,
  boxShadow: "0 10px 20px rgba(5, 0, 255, 0.24)",
}

export const botonEditar = {
  background: azul,
  color: "#ffffff",
  border: "none",
  padding: "8px 12px",
  borderRadius: "6px",
  fontWeight: 800,
  marginRight: "8px",
}

export const botonEliminar = {
  background: "#050505",
  color: "#ffffff",
  border: "none",
  padding: "8px 12px",
  borderRadius: "6px",
  fontWeight: 800,
}

export function tarjetaIndicador(color) {
  return {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    minHeight: "112px",
    background: "#ffffff",
    border: `1px solid ${borde}`,
    borderBottom: `4px solid ${color}`,
    padding: "18px 22px",
    borderRadius: "8px",
    boxShadow: sombra,
  }
}

export function iconoIndicador(color = azul) {
  return {
    width: "52px",
    height: "52px",
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background: azulSuave,
    color,
    flex: "0 0 auto",
  }
}
