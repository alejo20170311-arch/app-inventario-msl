import { useCallback, useEffect, useState } from "react"
import {
  ArrowLeftRight,
  BarChart3,
  Boxes,
  ClipboardCheck,
  Download,
  Home,
  LogOut,
  Package,
  Plus,
  ShieldAlert,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react"

import { Campo } from "./components/Campo"
import {
  catalogoProductosBase,
  centrosCostos,
  colaboradorVacio,
  crearEntregaVacia,
  crearMovimientoVacio,
  formularioVacio,
  gruposDisponibles,
  itemCatalogoVacio,
  lineaEntregaVacia,
  subAreasDisponibles,
} from "./data/inventario"
import {
  cargarDatosInventario,
  catalogoDesdeSupabase,
  catalogoParaSupabase,
  colaboradorDesdeSupabase,
  colaboradorParaSupabase,
  productoDesdeSupabase,
  productoParaSupabase,
} from "./lib/inventarioSupabase"
import {
  actualizarProductoConMovimiento,
  anularComprobanteRpc,
  crearProductoConMovimiento,
  registrarEntregaRpc,
} from "./lib/operacionesInventario"
import { supabase } from "./lib/supabase"
import { abrirComprobanteEntrega } from "./utils/comprobanteEntrega"
import { exportarCsv, leerCsv } from "./utils/csv"
import { ahoraISO, fechaLocalISO, mesLocalISO } from "./utils/fechas"
import {
  coincideBusqueda,
  coincideFiltroColaborador,
  coincideFiltroEntrega,
  coincideFiltroMovimiento,
  coincideFiltroProducto,
  limpiarObservacion,
  normalizarTexto,
  obtenerStockMinimo,
  productoSugeridoParaColaborador,
} from "./utils/inventario"
import {
  accionesModulo,
  appShell,
  ayudaFormulario,
  barraPestanas,
  botonCerrarMensaje,
  botonEditar,
  botonEliminar,
  botonFiltro,
  botonPestana,
  botonPrincipal,
  filaBotones,
  botonSecundario,
  campoBusqueda,
  campoFormulario,
  celdaTabla,
  contentShell,
  dashboardGrid,
  encabezadoTabla,
  filaAnulada,
  gridFormulario,
  grupoFiltros,
  iconoIndicador,
  mensajeApp,
  panelBloque,
  panelGrid,
  resumenHistorial,
  resumenLineasEntrega,
  resumenTallas,
  sidebar,
  sidebarButton,
  sidebarFooter,
  sidebarLogo,
  sidebarNav,
  sidebarUser,
  tabla,
  tarjetaIndicador,
  titleBlock,
  topBar,
  userAvatar,
  userSummary,
} from "./styles"
function App() {
  const [catalogoProductos, setCatalogoProductos] = useState(catalogoProductosBase)
  const [productos, setProductos] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [entregas, setEntregas] = useState([])
  const [productoEditandoId, setProductoEditandoId] = useState(null)
  const [colaboradorEditandoId, setColaboradorEditandoId] = useState(null)
  const [itemCatalogoEditandoClave, setItemCatalogoEditandoClave] = useState(null)
  const [mostrarFormularioItem, setMostrarFormularioItem] = useState(false)
  const [formulario, setFormulario] = useState(formularioVacio)
  const [itemCatalogo, setItemCatalogo] = useState(itemCatalogoVacio)
  const [movimiento, setMovimiento] = useState(() => crearMovimientoVacio())
  const [entrega, setEntrega] = useState(() => crearEntregaVacia())
  const [lineaEntrega, setLineaEntrega] = useState(lineaEntregaVacia)
  const [lineasEntrega, setLineasEntrega] = useState([])
  const [colaborador, setColaborador] = useState(colaboradorVacio)
  const [mensaje, setMensaje] = useState(null)
  const [sesion, setSesion] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [cargandoSesion, setCargandoSesion] = useState(true)
  const [cargandoDatos, setCargandoDatos] = useState(false)
  const [credenciales, setCredenciales] = useState({
    correo: "",
    contrasena: "",
  })
  const [errorLogin, setErrorLogin] = useState("")
  const [pestanaActiva, setPestanaActiva] = useState("panel")
  const [busquedaProductos, setBusquedaProductos] = useState("")
  const [busquedaCatalogo, setBusquedaCatalogo] = useState("")
  const [busquedaMovimientos, setBusquedaMovimientos] = useState("")
  const [busquedaColaboradores, setBusquedaColaboradores] = useState("")
  const [busquedaEntregas, setBusquedaEntregas] = useState("")
  const [filtroProductos, setFiltroProductos] = useState("Todos")
  const [filtroMovimientos, setFiltroMovimientos] = useState("Todos")
  const [filtroColaboradores, setFiltroColaboradores] = useState("Todos")
  const [filtroEntregas, setFiltroEntregas] = useState("Todas")
  const [mesActual] = useState(() => mesLocalISO())
  const [filtrosReporte, setFiltrosReporte] = useState(() => {
    const hoy = fechaLocalISO()
    const mes = hoy.slice(0, 7)

    return {
      desde: `${mes}-01`,
      hasta: hoy,
      centroCostos: "Todos",
      categoria: "Todas",
    }
  })
  const [colaboradorHistorialId, setColaboradorHistorialId] = useState("")
  const [colaboradores, setColaboradores] = useState([])

  const cargarPerfil = useCallback(async (usuarioId) => {
    const { data, error } = await supabase
      .from("perfiles")
      .select("nombre, correo, rol, estado")
      .eq("id", usuarioId)
      .single()

    if (error || !data) {
      setPerfil(null)
      setErrorLogin("Tu usuario existe, pero no tiene perfil activo en la app.")
      return null
    }

    if (data.estado !== "Activo") {
      setPerfil(null)
      setErrorLogin("Tu usuario está¡ inactivo. Contacta al administrador.")
      return null
    }

    setPerfil(data)
    setErrorLogin("")
    return data
  }, [])

  useEffect(() => {
    if (!mensaje) return undefined

    const temporizador = window.setTimeout(() => {
      setMensaje(null)
    }, 4500)

    return () => window.clearTimeout(temporizador)
  }, [mensaje])

  useEffect(() => {
    let activo = true

    async function prepararSesion() {
      const { data, error } = await supabase.auth.getSession()

      if (!activo) return

      if (error) {
        setErrorLogin("No se pudo revisar la Sesión. Intenta ingresar de nuevo.")
        setCargandoSesion(false)
        return
      }

      setSesion(data.session)

      if (data.session?.user) {
        await cargarPerfil(data.session.user.id)
      } else {
        setPerfil(null)
      }

      if (activo) {
        setCargandoSesion(false)
      }
    }

    prepararSesion()

    const { data: listener } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSesion(nuevaSesion)

      if (nuevaSesion?.user) {
        cargarPerfil(nuevaSesion.user.id)
      } else {
        setPerfil(null)
      }
    })

    return () => {
      activo = false
      listener.subscription.unsubscribe()
    }
  }, [cargarPerfil])

  useEffect(() => {
    if (!sesion || !perfil) {
      return undefined
    }

    let activo = true

    async function cargarInventario() {
      setCargandoDatos(true)

      try {
        const datos = await cargarDatosInventario()

        if (!activo) return

        setCatalogoProductos(datos.catalogoProductos)
        setProductos(datos.productos)
        setMovimientos(datos.movimientos)
        setEntregas(datos.entregas)
        setColaboradores(datos.colaboradores)
      } catch (error) {
        if (activo) {
          setMensaje({
            texto: `No se pudo cargar la información de Supabase: ${error.message}`,
            tipo: "error",
          })
        }
      } finally {
        if (activo) {
          setCargandoDatos(false)
        }
      }
    }

    cargarInventario()

    return () => {
      activo = false
    }
  }, [sesion, perfil])

  if (cargandoSesion || cargandoDatos) {
    return (
      <main style={{ background: "#E0E5EB", minHeight: "100vh", display: "grid", placeItems: "center", padding: "32px" }}>
        <section style={{ background: "#FFFFFF", borderRadius: "12px", padding: "28px", width: "100%", maxWidth: "420px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
          <img src="/logo-msl-Azul.jpg" alt="MSL Group" style={{ width: "150px", display: "block", marginBottom: "18px" }} />
          <h1 style={{ margin: 0, fontSize: "26px" }}>Cargando inventario</h1>
          <p style={{ margin: "10px 0 0" }}>Estamos revisando tu Sesión.</p>
        </section>
      </main>
    )
  }

  if (!sesion || !perfil) {
    return (
      <main style={{ background: "#E0E5EB", minHeight: "100vh", display: "grid", placeItems: "center", padding: "32px" }}>
        <section style={{ background: "#FFFFFF", borderRadius: "12px", overflow: "hidden", width: "100%", maxWidth: "460px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
          <header style={{ background: "#000000", color: "#FFFFFF", padding: "26px" }}>
            <img src="/logo-msl-blanco.png" alt="MSL Group" style={{ width: "150px", display: "block", marginBottom: "18px" }} />
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

  const productosCategoria = catalogoProductos.filter(
    (producto) => producto.categoria === formulario.categoria
  )
  const productoSeleccionado = catalogoProductos.find(
    (producto) =>
      producto.categoria === formulario.categoria &&
      producto.nombre === formulario.nombre
  )
  const tiposCategoria = [...new Set(productosCategoria.map((producto) => producto.tipo))]
  const variantesProducto = productoSeleccionado?.variantes ?? []
  const productosStockBajo = productos.filter(
    (producto) => Number(producto.stockActual) <= Number(producto.stockMinimo)
  )
  const productoMovimiento = productos.find(
    (producto) => String(producto.id) === movimiento.productoId
  )
  const productoEditando = productos.find(
    (producto) => producto.id === productoEditandoId
  )
  const productoEditandoTieneHistorial = Boolean(productoEditandoId) && (
    movimientos.some((item) => item.productoId === productoEditandoId) ||
    entregas.some((item) => item.productoId === productoEditandoId)
  )
  const colaboradorEditando = colaboradores.find(
    (item) => item.id === colaboradorEditandoId
  )
  const colaboradorEditandoTieneHistorial = Boolean(colaboradorEditandoId) &&
    entregas.some((item) => item.colaboradorId === colaboradorEditandoId)
  const productosPorId = new Map(
    productos.map((producto) => [String(producto.id), producto])
  )
  const colaboradorEntrega = colaboradores.find(
    (item) => String(item.id) === entrega.colaboradorId
  )
  const productoLineaEntrega = productos.find(
    (producto) => String(producto.id) === lineaEntrega.productoId
  )
  const lineasEntregaDetalle = lineasEntrega.map((linea) => ({
    ...linea,
    producto: productosPorId.get(String(linea.productoId)),
    cantidad: Number(linea.cantidad),
  }))
  const totalLineasEntrega = lineasEntregaDetalle.reduce(
    (total, linea) => total + Number(linea.cantidad || 0),
    0
  )
  const productosOrdenadosParaEntrega = [...productos].sort((a, b) => {
    const aSugerido = productoSugeridoParaColaborador(a, colaboradorEntrega)
    const bSugerido = productoSugeridoParaColaborador(b, colaboradorEntrega)

    if (aSugerido === bSugerido) return a.nombre.localeCompare(b.nombre)

    return aSugerido ? -1 : 1
  })
  const productosFiltrados = productos.filter((producto) =>
    coincideFiltroProducto(producto, filtroProductos) &&
    coincideBusqueda(producto, busquedaProductos, ["nombre", "categoria", "tipo", "variante", "unidad", "ubicacion", "estado"])
  )
  const movimientosFiltrados = movimientos.filter((item) =>
    coincideFiltroMovimiento(item, filtroMovimientos) &&
    coincideBusqueda(item, busquedaMovimientos, ["fecha", "producto", "variante", "unidad", "tipoMovimiento", "cantidad", "stockResultante", "observacion"])
  )
  const colaboradoresFiltrados = colaboradores.filter((item) =>
    coincideFiltroColaborador(item, filtroColaboradores) &&
    coincideBusqueda(item, busquedaColaboradores, ["identificacion", "nombreCompleto", "cargo", "subArea", "grupo", "centroCostos", "nombreCentroCostos", "sexo", "estado", "tallaAntifluido", "tallaBata", "tallaCamisa", "tallaPantalon", "tallaBotas"])
  )
  const entregasFiltradas = entregas.filter((item) =>
    coincideFiltroEntrega(item, filtroEntregas) &&
    coincideBusqueda(item, busquedaEntregas, ["numeroComprobante", "fecha", "colaborador", "identificacion", "grupo", "centroCostos", "nombreCentroCostos", "producto", "variante", "unidad", "cantidad", "motivo", "responsable", "observacion", "estado", "motivoAnulacion"])
  )
  const colaboradorHistorial = colaboradores.find(
    (item) => String(item.id) === colaboradorHistorialId
  )
  const entregasColaborador = colaboradorHistorial
    ? entregas.filter((item) => String(item.colaboradorId) === colaboradorHistorialId)
    : []
  const entregasActivasColaborador = entregasColaborador.filter(
    (item) => (item.estado || "Activa") === "Activa"
  )
  const entregasAnuladasColaborador = entregasColaborador.filter(
    (item) => item.estado === "Anulada"
  )
  const entregasActivas = entregas.filter(
    (item) => (item.estado || "Activa") === "Activa"
  )
  const entregasMes = entregasActivas.filter(
    (item) => String(item.fecha || "").slice(0, 7) === mesActual
  )
  const productosMasEntregados = Object.values(
    entregasMes.reduce((acumulado, item) => {
      const clave = `${item.producto} - ${item.variante}`

      acumulado[clave] = acumulado[clave] || {
        producto: item.producto,
        variante: item.variante,
        unidad: item.unidad,
        cantidad: 0,
      }
      acumulado[clave].cantidad += Number(item.cantidad || 0)

      return acumulado
    }, {})
  )
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5)
  const entregasPorCentroCostos = Object.values(
    entregasMes.reduce((acumulado, item) => {
      const clave = item.nombreCentroCostos || item.centroCostos || "Sin centro"

      acumulado[clave] = acumulado[clave] || {
        centro: clave,
        codigo: item.centroCostos || "-",
        cantidad: 0,
      }
      acumulado[clave].cantidad += Number(item.cantidad || 0)

      return acumulado
    }, {})
  )
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5)
  const entregasRecientes = entregas.slice(0, 5)
  const totalEntregadoMes = entregasMes.reduce(
    (total, item) => total + Number(item.cantidad || 0),
    0
  )
  const dotacionEntregadaMes = entregasMes.filter((item) => {
    const producto = productosPorId.get(String(item.productoId))

    return (item.categoria || producto?.categoria) === "Dotación"
  }).length
  const eppEntregadoMes = entregasMes.filter((item) => {
    const producto = productosPorId.get(String(item.productoId))

    return (item.categoria || producto?.categoria) === "EPP"
  }).length
  const entregasReporte = entregasActivas.filter((item) => {
    const fecha = String(item.fecha || "")
    const coincideDesde = !filtrosReporte.desde || fecha >= filtrosReporte.desde
    const coincideHasta = !filtrosReporte.hasta || fecha <= filtrosReporte.hasta
    const coincideCentro = filtrosReporte.centroCostos === "Todos" ||
      item.centroCostos === filtrosReporte.centroCostos
    const categoriaEntrega = item.categoria || productosPorId.get(String(item.productoId))?.categoria || ""
    const coincideCategoria = filtrosReporte.categoria === "Todas" ||
      categoriaEntrega === filtrosReporte.categoria

    return coincideDesde && coincideHasta && coincideCentro && coincideCategoria
  })
  const totalEntregadoReporte = entregasReporte.reduce(
    (total, item) => total + Number(item.cantidad || 0),
    0
  )
  const productosReporte = Object.values(
    entregasReporte.reduce((acumulado, item) => {
      const clave = `${item.producto}__${item.variante}`

      acumulado[clave] = acumulado[clave] || {
        producto: item.producto,
        variante: item.variante,
        categoria: item.categoria || productosPorId.get(String(item.productoId))?.categoria || "-",
        unidad: item.unidad,
        cantidad: 0,
      }
      acumulado[clave].cantidad += Number(item.cantidad || 0)

      return acumulado
    }, {})
  ).sort((a, b) => b.cantidad - a.cantidad)
  const centrosReporte = Object.values(
    entregasReporte.reduce((acumulado, item) => {
      const clave = item.centroCostos || "Sin centro"

      acumulado[clave] = acumulado[clave] || {
        codigo: item.centroCostos || "-",
        centro: item.nombreCentroCostos || "Sin centro",
        cantidad: 0,
      }
      acumulado[clave].cantidad += Number(item.cantidad || 0)

      return acumulado
    }, {})
  ).sort((a, b) => b.cantidad - a.cantidad)
  const colaboradoresReporte = Object.values(
    entregasReporte.reduce((acumulado, item) => {
      const clave = item.identificacion || item.colaborador

      acumulado[clave] = acumulado[clave] || {
        identificacion: item.identificacion,
        colaborador: item.colaborador,
        centroCostos: item.centroCostos,
        cantidad: 0,
      }
      acumulado[clave].cantidad += Number(item.cantidad || 0)

      return acumulado
    }, {})
  ).sort((a, b) => b.cantidad - a.cantidad)
  const pestanas = [
    { id: "panel", texto: "Panel", icono: Home },
    { id: "productos", texto: "Productos", icono: Package },
    { id: "movimientos", texto: "Movimientos", icono: ArrowLeftRight },
    { id: "colaboradores", texto: "Colaboradores", icono: Users },
    { id: "entregas", texto: "Entregas", icono: ClipboardCheck },
    { id: "reportes", texto: "Reportes", icono: BarChart3 },
  ]
  const indicadoresPrincipales = [
    { texto: "Productos", valor: productos.length, icono: Package, color: "#0500ff" },
    { texto: "Colaboradores", valor: colaboradores.length, icono: Users, color: "#5b8dff" },
    { texto: "Entregas", valor: entregas.length, icono: ClipboardCheck, color: "#5b8dff" },
    { texto: "Stock bajo", valor: productosStockBajo.length, icono: Boxes, color: "#0500ff" },
  ]
  const indicadoresPanel = [
    { texto: "Entregas activas", valor: entregasActivas.length, icono: ClipboardCheck, color: "#0500ff" },
    { texto: "Itéms entregados este mes", valor: totalEntregadoMes, icono: Boxes, color: "#5b8dff" },
    { texto: "Dotación este mes", valor: dotacionEntregadaMes, icono: Package, color: "#0500ff" },
    { texto: "EPP este mes", valor: eppEntregadoMes, icono: ShieldAlert, color: "#050505" },
  ]
  const renderIndicador = ({ texto, valor, icono: Icono, color }) => (
    <div key={texto} style={tarjetaIndicador(color)}>
      <span style={iconoIndicador(color)}>
        <Icono size={27} strokeWidth={2.4} />
      </span>
      <span>
        <strong style={{ display: "block", fontSize: "15px" }}>{texto}</strong>
        <span style={{ display: "block", marginTop: "8px", color, fontSize: "30px", lineHeight: 1, fontWeight: 900 }}>
          {valor}
        </span>
      </span>
    </div>
  )

  function mostrarMensaje(texto, tipo = "info") {
    setMensaje({ texto, tipo })
  }

  function mostrarErrorSupabase(error, accion = "guardar la información") {
    mostrarMensaje(`No se pudo ${accion}: ${error.message}`, "error")
  }

  function actualizarCredenciales(campo, valor) {
    setCredenciales({
      ...credenciales,
      [campo]: valor,
    })
  }

  async function iniciarSesion(evento) {
    evento.preventDefault()
    setErrorLogin("")
    setCargandoSesion(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: credenciales.correo.trim(),
      password: credenciales.contrasena,
    })

    if (error) {
      setCargandoSesion(false)
      setErrorLogin("Correo o Contraseña incorrectos.")
      return
    }

    setSesion(data.session)
    await cargarPerfil(data.user.id)
    setCredenciales({ correo: "", contrasena: "" })
    setCargandoSesion(false)
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
    setSesion(null)
    setPerfil(null)
    setCargandoDatos(false)
    setCatalogoProductos(catalogoProductosBase)
    setProductos([])
    setMovimientos([])
    setEntregas([])
    setColaboradores([])
    setPestanaActiva("panel")
    mostrarMensaje("Sesión cerrada correctamente.", "exito")
  }

  function actualizarFiltroReporte(campo, valor) {
    setFiltrosReporte({
      ...filtrosReporte,
      [campo]: valor,
    })
  }

  function actualizarCampo(campo, valor) {
    if (campo === "categoria") {
      setFormulario({
        ...formulario,
        categoria: valor,
        nombre: "",
        tipo: "",
        variante: "",
        unidad: "Unidad",
        stockMinimo: "",
      })
      return
    }

    if (campo === "nombre") {
      const productoCatalogo = catalogoProductos.find(
        (producto) =>
          producto.categoria === formulario.categoria && producto.nombre === valor
      )

      setFormulario({
        ...formulario,
        nombre: valor,
        tipo: productoCatalogo?.tipo ?? "",
        variante: "",
        unidad: productoCatalogo?.unidad ?? "Unidad",
        stockMinimo: obtenerStockMinimo(productoCatalogo),
      })
      return
    }

    setFormulario({
      ...formulario,
      [campo]: valor,
    })
  }

  function actualizarMovimiento(campo, valor) {
    setMovimiento({
      ...movimiento,
      [campo]: valor,
    })
  }

  function actualizarItemCatalogo(campo, valor) {
    setItemCatalogo({
      ...itemCatalogo,
      [campo]: valor,
    })
  }

  function claveItemCatalogo(item) {
    return `${item.categoria}__${normalizarTexto(item.nombre)}`
  }

  function prepararEdicionItemCatalogo(item) {
    setItemCatalogoEditandoClave(claveItemCatalogo(item))
    setItemCatalogo({
      categoria: item.categoria,
      nombre: item.nombre,
      tipo: item.tipo,
      unidad: item.unidad,
      variantes: item.variantes.join(", "),
      stockMinimo: obtenerStockMinimo(item),
    })
    setMostrarFormularioItem(true)
  }

  function cancelarEdicionItemCatalogo() {
    setItemCatalogoEditandoClave(null)
    setItemCatalogo(itemCatalogoVacio)
  }

  async function registrarItemCatalogo(evento) {
    evento.preventDefault()

    const variantes = itemCatalogo.variantes
      .split(",")
      .map((variante) => variante.trim())
      .filter(Boolean)

    if (variantes.length === 0) {
      mostrarMensaje("Agrega al menos una variante. Si no aplica, escribe Única.")
      return
    }

    const itemExistente = catalogoProductos.find(
      (item) =>
        item.categoria === itemCatalogo.categoria &&
        normalizarTexto(item.nombre) === normalizarTexto(itemCatalogo.nombre) &&
        claveItemCatalogo(item) !== itemCatalogoEditandoClave
    )

    if (itemExistente) {
      mostrarMensaje("Ya existe un item con ese nombre en esa categoría.")
      return
    }

    const nuevoItem = {
      categoria: itemCatalogo.categoria,
      nombre: itemCatalogo.nombre.trim(),
      tipo: itemCatalogo.tipo.trim(),
      unidad: itemCatalogo.unidad,
      variantes,
      stockMinimo: Number(itemCatalogo.stockMinimo),
    }

    try {
      if (itemCatalogoEditandoClave) {
        const itemOriginal = catalogoProductos.find(
          (item) => claveItemCatalogo(item) === itemCatalogoEditandoClave
        )

        if (!itemOriginal) {
          mostrarMensaje("No encontró el item original para actualizar.", "error")
          return
        }

        let consulta = supabase
          .from("catalogo_productos")
          .update(catalogoParaSupabase(nuevoItem))
          .select("*")

        consulta = itemOriginal.id
          ? consulta.eq("id", itemOriginal.id)
          : consulta
              .eq("categoria", itemOriginal.categoria)
              .eq("nombre", itemOriginal.nombre)

        const { data, error } = await consulta.single()

        if (error) throw error

        const itemActualizado = catalogoDesdeSupabase(data)

        setCatalogoProductos(
          catalogoProductos.map((item) =>
            claveItemCatalogo(item) === itemCatalogoEditandoClave ? itemActualizado : item
          )
        )
        mostrarMensaje("Item actualizado. Los cambios ya aparecen en el formulario de productos.")
      } else {
        const { data, error } = await supabase
          .from("catalogo_productos")
          .insert(catalogoParaSupabase(nuevoItem))
          .select("*")
          .single()

        if (error) throw error

        setCatalogoProductos([...catalogoProductos, catalogoDesdeSupabase(data)])
        mostrarMensaje("Item nuevo creado. Ya aparece en el formulario de productos.")
      }
    } catch (error) {
      mostrarErrorSupabase(error, "guardar el catálogo")
      return
    }

    setItemCatalogo(itemCatalogoVacio)
    setItemCatalogoEditandoClave(null)
    setMostrarFormularioItem(false)
  }

  function actualizarEntrega(campo, valor) {
    setEntrega({
      ...entrega,
      [campo]: valor,
    })
  }

  function actualizarLineaEntrega(campo, valor) {
    setLineaEntrega({
      ...lineaEntrega,
      [campo]: valor,
    })
  }

  function agregarLineaEntrega() {
    if (!productoLineaEntrega) {
      mostrarMensaje("Selecciona un producto para agregarlo a la entrega.")
      return
    }

    if (productoLineaEntrega.estado === "Inactivo") {
      mostrarMensaje("No se puede entregar un producto inactivo.")
      return
    }

    const cantidad = Number(lineaEntrega.cantidad)

    if (cantidad <= 0) {
      mostrarMensaje("La cantidad debe ser mayor a cero.")
      return
    }

    const cantidadYaAgregada = lineasEntrega
      .filter((linea) => linea.productoId === lineaEntrega.productoId)
      .reduce((total, linea) => total + Number(linea.cantidad || 0), 0)

    if (cantidadYaAgregada + cantidad > Number(productoLineaEntrega.stockActual)) {
      mostrarMensaje("No hay stock suficiente para agregar esa cantidad a la entrega.")
      return
    }

    const lineaExistente = lineasEntrega.find(
      (linea) => linea.productoId === lineaEntrega.productoId
    )

    if (lineaExistente) {
      setLineasEntrega(
        lineasEntrega.map((linea) => {
          if (linea.productoId === lineaEntrega.productoId) {
            return {
              ...linea,
              cantidad: Number(linea.cantidad) + cantidad,
            }
          }

          return linea
        })
      )
    } else {
      setLineasEntrega([
        ...lineasEntrega,
        {
          productoId: lineaEntrega.productoId,
          cantidad,
        },
      ])
    }

    setLineaEntrega(lineaEntregaVacia)
  }

  function quitarLineaEntrega(productoId) {
    setLineasEntrega(
      lineasEntrega.filter((linea) => linea.productoId !== productoId)
    )
  }

  function actualizarColaborador(campo, valor) {
    if (campo === "nombreCentroCostos") {
      const centroSeleccionado = centrosCostos.find(
        (centro) => centro.nombre === valor
      )

      setColaborador({
        ...colaborador,
        nombreCentroCostos: valor,
        centroCostos: centroSeleccionado?.codigo ?? "",
      })
      return
    }

    setColaborador({
      ...colaborador,
      [campo]: valor,
    })
  }

  function prepararEdicion(producto) {
    const tieneHistorial = movimientos.some((item) => item.productoId === producto.id) ||
      entregas.some((item) => item.productoId === producto.id)

    setProductoEditandoId(producto.id)
    const productoCatalogo = catalogoProductos.find(
      (item) =>
        item.categoria === producto.categoria && item.nombre === producto.nombre
    )

    setFormulario({
      nombre: producto.nombre,
      categoria: producto.categoria,
      tipo: producto.tipo,
      variante: producto.variante,
      unidad: producto.unidad,
      stockActual: producto.stockActual,
      stockMinimo: obtenerStockMinimo(productoCatalogo) || producto.stockMinimo,
      motivoEntrada: "Compra",
      observacionEntrada: "",
      ubicacion: producto.ubicacion,
      estado: producto.estado,
    })

    if (tieneHistorial) {
      mostrarMensaje("Este producto tiene historial. Solo se recomienda cambiar ubicación o estado.", "info")
    }
  }

  function cancelarEdicionProducto() {
    setProductoEditandoId(null)
    setFormulario(formularioVacio)
    mostrarMensaje("Edición de producto cancelada.")
  }

  async function eliminarProducto(idProducto) {
    const productoTieneMovimientos = movimientos.some(
      (item) => item.productoId === idProducto
    )
    const productoTieneEntregas = entregas.some(
      (item) => item.productoId === idProducto
    )

    if (productoTieneMovimientos || productoTieneEntregas) {
      const confirmarInactivar = window.confirm("Este producto ya tiene movimientos o entregas. Para conservar el historial no se puede eliminar. Â¿Quieres marcarlo como inactivo?")

      if (confirmarInactivar) {
        const { data, error } = await supabase
          .from("productos")
          .update({ estado: "Inactivo", actualizado_en: ahoraISO() })
          .eq("id", idProducto)
          .select("*")
          .single()

        if (error) {
          mostrarErrorSupabase(error, "inactivar el producto")
          return
        }

        const productoActualizado = productoDesdeSupabase(data)

        setProductos(
          productos.map((producto) =>
            producto.id === idProducto ? productoActualizado : producto
          )
        )
      }

      return
    }

    const confirmar = window.confirm("Â¿Seguro que quieres eliminar este producto?")

    if (confirmar) {
      const { error } = await supabase
        .from("productos")
        .delete()
        .eq("id", idProducto)

      if (error) {
        mostrarErrorSupabase(error, "eliminar el producto")
        return
      }

      setProductos(productos.filter((producto) => producto.id !== idProducto))
    }
  }

  function prepararEdicionColaborador(item) {
    const tieneEntregas = entregas.some((entregaItem) => entregaItem.colaboradorId === item.id)

    setColaboradorEditandoId(item.id)
    setColaborador({
      identificacion: item.identificacion,
      nombreCompleto: item.nombreCompleto,
      cargo: item.cargo,
      subArea: item.subArea,
      grupo: item.grupo,
      centroCostos: item.centroCostos,
      nombreCentroCostos: item.nombreCentroCostos,
      sexo: item.sexo,
      estado: item.estado,
      tallaAntifluido: item.tallaAntifluido,
      tallaBata: item.tallaBata,
      tallaCamisa: item.tallaCamisa,
      tallaPantalon: item.tallaPantalon,
      tallaBotas: item.tallaBotas,
    })

    if (tieneEntregas) {
      mostrarMensaje("Este colaborador tiene entregas. La identificación queda protegida para conservar el historial.", "info")
    }
  }

  function cancelarEdicionColaborador() {
    setColaboradorEditandoId(null)
    setColaborador(colaboradorVacio)
    mostrarMensaje("Edición de colaborador cancelada.")
  }

  async function eliminarColaborador(idColaborador) {
    const colaboradorTieneEntregas = entregas.some(
      (item) => item.colaboradorId === idColaborador
    )

    if (colaboradorTieneEntregas) {
      const confirmarRetirar = window.confirm("Este colaborador ya tiene entregas. Para conservar el historial no se puede eliminar. Â¿Quieres marcarlo como retirado?")

      if (confirmarRetirar) {
        const { data, error } = await supabase
          .from("colaboradores")
          .update({ estado: "Retirado", actualizado_en: ahoraISO() })
          .eq("id", idColaborador)
          .select("*")
          .single()

        if (error) {
          mostrarErrorSupabase(error, "retirar el colaborador")
          return
        }

        const colaboradorActualizado = colaboradorDesdeSupabase(data)

        setColaboradores(
          colaboradores.map((item) =>
            item.id === idColaborador ? colaboradorActualizado : item
          )
        )
      }

      return
    }

    const confirmar = window.confirm("Â¿Seguro que quieres eliminar este colaborador?")

    if (confirmar) {
      const { error } = await supabase
        .from("colaboradores")
        .delete()
        .eq("id", idColaborador)

      if (error) {
        mostrarErrorSupabase(error, "eliminar el colaborador")
        return
      }

      setColaboradores(colaboradores.filter((item) => item.id !== idColaborador))
    }
  }

  async function registrarProducto(evento) {
    evento.preventDefault()
    const cantidadEntrada = Number(formulario.stockActual)
    const motivoEntrada = formulario.motivoEntrada || "Compra"
    const observacionEntrada = formulario.observacionEntrada
      ? `${motivoEntrada}: ${formulario.observacionEntrada}`
      : motivoEntrada
    const datosProducto = {
      nombre: formulario.nombre,
      categoria: formulario.categoria,
      tipo: formulario.tipo,
      variante: formulario.variante,
      unidad: formulario.unidad,
      stockMinimo: Number(formulario.stockMinimo),
      ubicacion: formulario.ubicacion,
      estado: formulario.estado,
    }

    try {
      if (productoEditandoId) {
        if (productoEditandoTieneHistorial && productoEditando) {
          const cambioDatoSensible = ["nombre", "categoria", "tipo", "variante", "unidad"].some(
            (campo) => datosProducto[campo] !== productoEditando[campo]
          )

          if (cambioDatoSensible) {
            mostrarMensaje("No se pueden cambiar nombre, categoría, tipo, variante o unidad cuando el producto ya tiene historial.", "error")
            return
          }
        }

        const { data, error } = await supabase
          .from("productos")
          .update({
            ...productoParaSupabase(datosProducto),
            actualizado_en: ahoraISO(),
          })
          .eq("id", productoEditandoId)
          .select("*")
          .single()

        if (error) throw error

        const productoActualizado = productoDesdeSupabase(data)

        setProductos(
          productos.map((producto) =>
            producto.id === productoEditandoId ? productoActualizado : producto
          )
        )
        setProductoEditandoId(null)
        setFormulario(formularioVacio)
        mostrarMensaje("Producto actualizado correctamente.", "exito")
        return
      }

      const productoExistente = productos.find(
        (producto) =>
          producto.categoria === formulario.categoria &&
          producto.nombre === formulario.nombre &&
          producto.variante === formulario.variante &&
          producto.unidad === formulario.unidad
      )

      if (productoExistente) {
        const nuevoStock = Number(productoExistente.stockActual) + cantidadEntrada
        const nuevoMovimiento = cantidadEntrada > 0
          ? {
            id: crypto.randomUUID(),
            productoId: productoExistente.id,
            producto: productoExistente.nombre,
            variante: productoExistente.variante,
            unidad: productoExistente.unidad,
            tipoMovimiento: "Entrada",
            cantidad: cantidadEntrada,
            fecha: fechaLocalISO(),
            observacion: observacionEntrada,
            stockResultante: nuevoStock,
          }
          : null

        const {
          producto: productoActualizado,
          movimiento: movimientoCreado,
        } = await actualizarProductoConMovimiento({
          productoAnterior: productoExistente,
          productoPayload: {
            ...datosProducto,
            stockActual: nuevoStock,
          },
          movimiento: nuevoMovimiento,
          usuarioId: sesion?.user?.id,
        })

        setProductos(
          productos.map((producto) =>
            producto.id === productoExistente.id ? productoActualizado : producto
          )
        )
        if (movimientoCreado) {
          setMovimientos([movimientoCreado, ...movimientos])
        }
        mostrarMensaje("El producto ya existé. Se sumá la cantidad al stock actual.")
      } else {
        const {
          producto: nuevoProducto,
          movimiento: movimientoCreado,
        } = await crearProductoConMovimiento({
          productoPayload: {
            ...datosProducto,
            stockActual: cantidadEntrada,
          },
          crearMovimiento: cantidadEntrada > 0
            ? (productoCreado) => ({
                id: crypto.randomUUID(),
                productoId: productoCreado.id,
                producto: productoCreado.nombre,
                variante: productoCreado.variante,
                unidad: productoCreado.unidad,
                tipoMovimiento: "Entrada",
                cantidad: cantidadEntrada,
                fecha: fechaLocalISO(),
                observacion: observacionEntrada,
                stockResultante: productoCreado.stockActual,
              })
            : null,
          usuarioId: sesion?.user?.id,
        })

        setProductos([...productos, nuevoProducto])
        if (movimientoCreado) {
          setMovimientos([movimientoCreado, ...movimientos])
        }
        mostrarMensaje("Producto registrado correctamente.", "exito")
      }

      setFormulario(formularioVacio)
    } catch (error) {
      mostrarErrorSupabase(error, "guardar el producto")
    }
  }

  async function registrarMovimiento(evento) {
    evento.preventDefault()

    if (!productoMovimiento) {
      mostrarMensaje("Selecciona un producto para registrar el movimiento.")
      return
    }

    if (productoMovimiento.estado === "Inactivo") {
      mostrarMensaje("No se pueden registrar movimientos sobre un producto inactivo.", "error")
      return
    }

    const cantidad = Number(movimiento.cantidad)
    const observacionMovimiento = movimiento.observacion.trim()
    const esSalida = movimiento.tipoMovimiento === "Ajuste negativo"
    const requiereObservacion = movimiento.tipoMovimiento.includes("Ajuste") ||
      movimiento.tipoMovimiento === "Devolución"
    const nuevoStock = esSalida
      ? Number(productoMovimiento.stockActual) - cantidad
      : Number(productoMovimiento.stockActual) + cantidad

    if (cantidad <= 0) {
      mostrarMensaje("La cantidad debe ser mayor a cero.")
      return
    }

    if (nuevoStock < 0) {
      mostrarMensaje("Este movimiento dejará el stock en negativo.", "error")
      return
    }

    if (requiereObservacion && observacionMovimiento.length < 8) {
      mostrarMensaje("Escribe una observación clara para devoluciones y ajustes.", "error")
      return
    }

    const nuevoMovimiento = {
      id: crypto.randomUUID(),
      productoId: productoMovimiento.id,
      producto: productoMovimiento.nombre,
      variante: productoMovimiento.variante,
      unidad: productoMovimiento.unidad,
      tipoMovimiento: movimiento.tipoMovimiento,
      cantidad,
      fecha: movimiento.fecha,
      observacion: observacionMovimiento,
      stockResultante: nuevoStock,
    }

    try {
      const {
        producto: productoActualizado,
        movimiento: movimientoCreado,
      } = await actualizarProductoConMovimiento({
        productoAnterior: productoMovimiento,
        productoPayload: {
          stockActual: nuevoStock,
        },
        movimiento: nuevoMovimiento,
        usuarioId: sesion?.user?.id,
      })

      setProductos(
        productos.map((producto) =>
          producto.id === productoMovimiento.id ? productoActualizado : producto
        )
      )
      setMovimientos([movimientoCreado, ...movimientos])
      setMovimiento(crearMovimientoVacio())
      mostrarMensaje("Movimiento registrado correctamente.", "exito")
    } catch (error) {
      mostrarErrorSupabase(error, "registrar el movimiento")
    }
  }

  async function registrarColaborador(evento) {
    evento.preventDefault()

    const colaboradorExistente = colaboradores.find(
      (item) =>
        item.identificacion === colaborador.identificacion &&
        item.id !== colaboradorEditandoId
    )

    if (colaboradorExistente) {
      mostrarMensaje("Ya existe un colaborador con esa identificación.", "error")
      return
    }

    try {
      if (colaboradorEditandoId) {
        if (
          colaboradorEditandoTieneHistorial &&
          colaboradorEditando &&
          colaborador.identificacion !== colaboradorEditando.identificacion
        ) {
          mostrarMensaje("No se puede cambiar la identificación de un colaborador con entregas registradas.", "error")
          return
        }

        const { data, error } = await supabase
          .from("colaboradores")
          .update({
            ...colaboradorParaSupabase(colaborador),
            actualizado_en: ahoraISO(),
          })
          .eq("id", colaboradorEditandoId)
          .select("*")
          .single()

        if (error) throw error

        const colaboradorActualizado = colaboradorDesdeSupabase(data)

        setColaboradores(
          colaboradores.map((item) =>
            item.id === colaboradorEditandoId ? colaboradorActualizado : item
          )
        )
        setColaboradorEditandoId(null)
        setColaborador(colaboradorVacio)
        mostrarMensaje("Colaborador actualizado correctamente.", "exito")
        return
      }

      const { data, error } = await supabase
        .from("colaboradores")
        .insert(colaboradorParaSupabase(colaborador))
        .select("*")
        .single()

      if (error) throw error

      setColaboradores([...colaboradores, colaboradorDesdeSupabase(data)])
      setColaborador(colaboradorVacio)
      mostrarMensaje("Colaborador registrado correctamente.", "exito")
    } catch (error) {
      mostrarErrorSupabase(error, "guardar el colaborador")
    }
  }

  async function registrarEntrega(evento) {
    evento.preventDefault()

    if (!colaboradorEntrega) {
      mostrarMensaje("Selecciona colaborador para registrar la entrega.")
      return
    }

    if (colaboradorEntrega.estado === "Retirado") {
      mostrarMensaje("No se puede registrar una entrega a un colaborador retirado.")
      return
    }

    if (lineasEntregaDetalle.length === 0) {
      mostrarMensaje("Agrega al menos un producto a la entrega.", "error")
      return
    }

    if (!entrega.responsable.trim()) {
      mostrarMensaje("Escribe el responsable de la entrega.", "error")
      return
    }

    if (["Deterioro", "Cambio de talla", "PÃ©rdida"].includes(entrega.motivo) && entrega.observacion.trim().length < 8) {
      mostrarMensaje("Para deterioro, cambio de talla o pÃ©rdida debes escribir una observación clara.", "error")
      return
    }

    const lineaInvalida = lineasEntregaDetalle.find(
      (linea) => !linea.producto || Number(linea.cantidad) <= 0
    )

    if (lineaInvalida) {
      mostrarMensaje("Revisa las cantidades de la entrega.")
      return
    }

    const lineaSinStock = lineasEntregaDetalle.find(
      (linea) => Number(linea.producto.stockActual) < Number(linea.cantidad)
    )

    if (lineaSinStock) {
      mostrarMensaje(`No hay stock suficiente para ${lineaSinStock.producto.nombre} - ${lineaSinStock.producto.variante}.`)
      return
    }

    try {
      const entregaGuardada = await registrarEntregaRpc({
        entrega,
        lineasEntregaDetalle,
      })
      const stockPorProducto = new Map(
        entregaGuardada.entregas.map((item) => [
          String(item.productoId),
          Number(item.stockResultante),
        ])
      )
      const productosActualizados = productos.map((producto) => {
        const stockActual = stockPorProducto.get(String(producto.id))

        if (stockActual === undefined) return producto

        return {
          ...producto,
          stockActual,
        }
      })
      const numeroComprobante = entregaGuardada.comprobante?.numero ||
        entregaGuardada.entregas[0]?.numeroComprobante

      setProductos(productosActualizados)
      setEntregas([...entregaGuardada.entregas, ...entregas])
      setMovimientos([...entregaGuardada.movimientos, ...movimientos])
      setEntrega(crearEntregaVacia())
      setLineaEntrega(lineaEntregaVacia)
      setLineasEntrega([])
      mostrarMensaje(`Entrega registrada correctamente. Comprobante: ${numeroComprobante || "creado"}`, "exito")
    } catch (error) {
      mostrarErrorSupabase(error, "registrar la entrega")
    }
  }

  async function anularEntrega(entregaId) {
    const entregaSeleccionada = entregas.find((item) => item.id === entregaId)

    if (!entregaSeleccionada || entregaSeleccionada.estado === "Anulada") {
      return
    }

    const entregasComprobante = entregaSeleccionada.comprobanteId
      ? entregas.filter(
          (item) =>
            item.comprobanteId === entregaSeleccionada.comprobanteId &&
            item.estado !== "Anulada"
        )
      : [entregaSeleccionada]

    if (entregasComprobante.length === 0) {
      return
    }

    const motivoAnulacion = window.prompt("Motivo de anulación (obligatorio, Mínimo 8 caracteres)")?.trim()

    if (!motivoAnulacion || motivoAnulacion.length < 8) {
      mostrarMensaje("La anulación necesita un motivo claro de al menos 8 caracteres.", "error")
      return
    }

    const totalDevuelto = entregasComprobante.reduce(
      (total, item) => total + Number(item.cantidad || 0),
      0
    )
    const confirmar = window.confirm(
      `Vas a anular todo el comprobante ${entregaSeleccionada.numeroComprobante || entregaSeleccionada.id}. Se devolverán ${totalDevuelto} Ítems al stock y quedarÃ¡ registro en movimientos. Â¿Continuar?`
    )

    if (!confirmar) {
      return
    }

    try {
      const anulacion = await anularComprobanteRpc({
        entregaId,
        motivoAnulacion,
      })
      const stockPorProducto = new Map(
        anulacion.productos.map((producto) => [
          String(producto.id),
          Number(producto.stockActual),
        ])
      )
      const productosActualizados = productos.map((producto) => {
        const stockActual = stockPorProducto.get(String(producto.id))

        if (stockActual === undefined) return producto

        return {
          ...producto,
          stockActual,
        }
      })
      const comprobanteAnuladoId = anulacion.comprobanteId || entregaSeleccionada.comprobanteId
      const entregasActualizadas = entregas.map((item) => {
        const perteneceAlComprobante = comprobanteAnuladoId
          ? item.comprobanteId === comprobanteAnuladoId
          : item.id === entregaId

        if (perteneceAlComprobante && item.estado !== "Anulada") {
          return {
            ...item,
            estado: anulacion.estado,
            motivoAnulacion: anulacion.motivoAnulacion,
          }
        }

        return item
      })

      setProductos(productosActualizados)
      setEntregas(entregasActualizadas)
      setMovimientos([...anulacion.movimientos, ...movimientos])
      mostrarMensaje("Comprobante anulado y stock devuelto correctamente.", "exito")
    } catch (error) {
      mostrarErrorSupabase(error, "anular el comprobante")
    }
  }

  function abrirComprobante(entregaSeleccionada) {
    const comprobanteAbierto = abrirComprobanteEntrega({
      entregaSeleccionada,
      entregas,
    })

    if (!comprobanteAbierto) {
      mostrarMensaje("El navegador bloqueÃ³ la ventana del comprobante. Permite ventanas emergentes para esta app.")
    }
  }


  function exportarProductos() {
    exportarCsv("productos-msl.csv", [
      { titulo: "Producto", campo: "nombre" },
      { titulo: "categoría", campo: "categoria" },
      { titulo: "Tipo", campo: "tipo" },
      { titulo: "Variante", campo: "variante" },
      { titulo: "Unidad", campo: "unidad" },
      { titulo: "Stock actual", campo: "stockActual" },
      { titulo: "Stock Mínimo", campo: "stockMinimo" },
      { titulo: "Ubicación", campo: "ubicacion" },
      { titulo: "Estado", campo: "estado" },
    ], productos)
  }

  function exportarMovimientos() {
    exportarCsv("movimientos-msl.csv", [
      { titulo: "Fecha", campo: "fecha" },
      { titulo: "Producto", campo: "producto" },
      { titulo: "Variante", campo: "variante" },
      { titulo: "Unidad", campo: "unidad" },
      { titulo: "Movimiento", campo: "tipoMovimiento" },
      { titulo: "Cantidad", campo: "cantidad" },
      { titulo: "Stock final", campo: "stockResultante" },
      { titulo: "Observación", campo: "observacion" },
    ], movimientos)
  }

  function exportarColaboradores() {
    exportarCsv("colaboradores-msl.csv", [
      { titulo: "Identificación", campo: "identificacion" },
      { titulo: "Nombre completo", campo: "nombreCompleto" },
      { titulo: "Cargo", campo: "cargo" },
      { titulo: "Sub-Área", campo: "subArea" },
      { titulo: "Grupo", campo: "grupo" },
      { titulo: "Centro de costos", campo: "centroCostos" },
      { titulo: "Nombre centro de costos", campo: "nombreCentroCostos" },
      { titulo: "Sexo", campo: "sexo" },
      { titulo: "Estado", campo: "estado" },
      { titulo: "Talla antifluido", campo: "tallaAntifluido" },
      { titulo: "Talla bata", campo: "tallaBata" },
      { titulo: "Talla camisa", campo: "tallaCamisa" },
      { titulo: "Talla pantalón", campo: "tallaPantalon" },
      { titulo: "Talla botas", campo: "tallaBotas" },
    ], colaboradores)
  }

  function exportarEntregas() {
    exportarCsv("entregas-msl.csv", [
      { titulo: "Comprobante", campo: "numeroComprobante" },
      { titulo: "Fecha", campo: "fecha" },
      { titulo: "Colaborador", campo: "colaborador" },
      { titulo: "Identificación", campo: "identificacion" },
      { titulo: "Grupo", campo: "grupo" },
      { titulo: "Centro de costos", campo: "centroCostos" },
      { titulo: "Nombre centro de costos", campo: "nombreCentroCostos" },
      { titulo: "Producto", campo: "producto" },
      { titulo: "Variante", campo: "variante" },
      { titulo: "Unidad", campo: "unidad" },
      { titulo: "Cantidad", campo: "cantidad" },
      { titulo: "Motivo", campo: "motivo" },
      { titulo: "Responsable", campo: "responsable" },
      { titulo: "Observación", campo: "observacion" },
      { titulo: "Stock final", campo: "stockResultante" },
      { titulo: "Estado", campo: "estado" },
      { titulo: "Motivo anulación", campo: "motivoAnulacion" },
    ], entregas)
  }

  function exportarReporteEntregasFiltradas() {
    exportarCsv("reporte-entregas-filtradas-msl.csv", [
      { titulo: "Comprobante", campo: "numeroComprobante" },
      { titulo: "Fecha", campo: "fecha" },
      { titulo: "Colaborador", campo: "colaborador" },
      { titulo: "Identificación", campo: "identificacion" },
      { titulo: "Centro de costos", campo: "centroCostos" },
      { titulo: "Nombre centro de costos", campo: "nombreCentroCostos" },
      { titulo: "Producto", campo: "producto" },
      { titulo: "categoría", campo: "categoria" },
      { titulo: "Variante", campo: "variante" },
      { titulo: "Unidad", campo: "unidad" },
      { titulo: "Cantidad", campo: "cantidad" },
      { titulo: "Motivo", campo: "motivo" },
      { titulo: "Responsable", campo: "responsable" },
    ], entregasReporte)
  }

  function exportarReporteConsumoProductos() {
    exportarCsv("reporte-consumo-productos-msl.csv", [
      { titulo: "Producto", campo: "producto" },
      { titulo: "Variante", campo: "variante" },
      { titulo: "categoría", campo: "categoria" },
      { titulo: "Unidad", campo: "unidad" },
      { titulo: "Cantidad", campo: "cantidad" },
    ], productosReporte)
  }

  function exportarReporteCentros() {
    exportarCsv("reporte-centros-costos-msl.csv", [
      { titulo: "Centro de costos", campo: "codigo" },
      { titulo: "Nombre centro", campo: "centro" },
      { titulo: "Cantidad", campo: "cantidad" },
    ], centrosReporte)
  }

  function exportarReporteStockBajo() {
    exportarCsv("reporte-stock-bajo-msl.csv", [
      { titulo: "Producto", campo: "nombre" },
      { titulo: "categoría", campo: "categoria" },
      { titulo: "Tipo", campo: "tipo" },
      { titulo: "Variante", campo: "variante" },
      { titulo: "Unidad", campo: "unidad" },
      { titulo: "Stock actual", campo: "stockActual" },
      { titulo: "Stock Mínimo", campo: "stockMinimo" },
      { titulo: "Ubicación", campo: "ubicacion" },
      { titulo: "Estado", campo: "estado" },
    ], productosStockBajo)
  }


  function importarColaboradores(evento) {
    const archivo = evento.target.files?.[0]

    if (!archivo) return

    const lector = new FileReader()

    lector.onload = async () => {
      const filas = leerCsv(String(lector.result || ""))

      if (filas.length < 2) {
        mostrarMensaje("El archivo no tiene datos para importar.")
        evento.target.value = ""
        return
      }

      const encabezados = filas[0].map(normalizarTexto)
      const obtenerValor = (fila, nombres) => {
        const indice = nombres
          .map(normalizarTexto)
          .map((nombre) => encabezados.indexOf(nombre))
          .find((posicion) => posicion >= 0)

        return indice >= 0 ? String(fila[indice] || "").trim() : ""
      }

      const colaboradoresImportados = filas.slice(1)
        .map((fila) => {
          const nombreCentro = obtenerValor(fila, ["Nombre centro de costos", "Nombre de centro de costos", "Nombre centro"])
          const centroPorNombre = centrosCostos.find(
            (centro) => normalizarTexto(centro.nombre) === normalizarTexto(nombreCentro)
          )
          const identificacion = obtenerValor(fila, ["Identificación", "Identificacion", "CÃ©dula", "Cedula"])
          const nombreCompleto = obtenerValor(fila, ["Nombre completo", "Nombre"])

          if (!identificacion || !nombreCompleto) {
            return null
          }

          return {
            identificacion,
            nombreCompleto,
            cargo: obtenerValor(fila, ["Cargo"]) || "Sin cargo",
            subArea: obtenerValor(fila, ["Sub-Área", "Sub area", "Subarea"]) || "",
            grupo: obtenerValor(fila, ["Grupo"]) || "",
            centroCostos: obtenerValor(fila, ["Centro de costos", "Centro costos", "Ceco"]) || centroPorNombre?.codigo || "",
            nombreCentroCostos: nombreCentro || centroPorNombre?.nombre || "",
            sexo: obtenerValor(fila, ["Sexo"]) || "Femenino",
            estado: obtenerValor(fila, ["Estado"]) || "Activo",
            tallaAntifluido: obtenerValor(fila, ["Talla de antifluido", "Talla antifluido", "Talla de antifluidos"]) || "N/A",
            tallaBata: obtenerValor(fila, ["Talla de bata", "Talla bata"]) || "N/A",
            tallaCamisa: obtenerValor(fila, ["Talla camisa", "Talla de camisa"]) || "N/A",
            tallaPantalon: obtenerValor(fila, ["Talla pantalón", "Talla pantalon", "Talla de pantalón", "Talla de pantalon"]) || "N/A",
            tallaBotas: obtenerValor(fila, ["Talla de botas", "Talla botas", "Talla bota"]) || "",
          }
        })
        .filter(Boolean)

      if (colaboradoresImportados.length === 0) {
        mostrarMensaje("No encontró colaboradores vÃ¡lidos. Revisa que existan columnas de identificación y nombre.")
        evento.target.value = ""
        return
      }

      const identificacionesActuales = new Set(
        colaboradores.map((item) => item.identificacion)
      )
      const nuevos = colaboradoresImportados.filter(
        (item) => !identificacionesActuales.has(item.identificacion)
      ).length
      const actualizados = colaboradoresImportados.length - nuevos

      try {
        const { data, error } = await supabase
          .from("colaboradores")
          .upsert(
            colaboradoresImportados.map(colaboradorParaSupabase),
            { onConflict: "identificacion" }
          )
          .select("*")

        if (error) throw error

        const colaboradoresGuardados = data.map(colaboradorDesdeSupabase)
        const colaboradoresPorIdentificacion = new Map(
          colaboradores.map((item) => [item.identificacion, item])
        )

        colaboradoresGuardados.forEach((item) => {
          colaboradoresPorIdentificacion.set(item.identificacion, item)
        })

        setColaboradores(
          Array.from(colaboradoresPorIdentificacion.values()).sort((a, b) =>
            a.nombreCompleto.localeCompare(b.nombreCompleto)
          )
        )
        mostrarMensaje(`Importación lista. Nuevos: ${nuevos}. Actualizados: ${actualizados}.`)
      } catch (error) {
        mostrarErrorSupabase(error, "importar colaboradores")
      }

      evento.target.value = ""
    }

    lector.readAsText(archivo, "UTF-8")
  }

  return (
    <main style={appShell}>
      <aside style={sidebar}>
        <img
          src="/logo-msl-blanco.png"
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
              <button type="button" onClick={() => setMensaje(null)} style={botonCerrarMensaje}>
                Cerrar
              </button>
            </div>
          )}

          {pestanaActiva === "panel" && (
            <>
              <h2 style={{ marginTop: "34px" }}>Panel principal</h2>

              <div style={dashboardGrid}>
                {indicadoresPanel.map(renderIndicador)}
              </div>

              <div style={panelGrid}>
                <section style={panelBloque}>
                  <h3 style={{ marginTop: 0 }}>Stock bajo</h3>
                  <table style={tabla}>
                    <thead>
                      <tr style={encabezadoTabla}>
                        <th style={celdaTabla}>Producto</th>
                        <th style={celdaTabla}>Stock</th>
                        <th style={celdaTabla}>Mínimo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosStockBajo.length === 0 ? (
                        <tr>
                          <td colSpan="3" style={celdaTabla}>Sin productos en stock bajo.</td>
                        </tr>
                      ) : (
                        productosStockBajo.slice(0, 6).map((producto) => (
                          <tr key={producto.id}>
                            <td style={celdaTabla}>{producto.nombre} - {producto.variante}</td>
                            <td style={celdaTabla}>{producto.stockActual} {producto.unidad}</td>
                            <td style={celdaTabla}>{producto.stockMinimo}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </section>

                <section style={panelBloque}>
                  <h3 style={{ marginTop: 0 }}>MÃ¡s entregados este mes</h3>
                  <table style={tabla}>
                    <thead>
                      <tr style={encabezadoTabla}>
                        <th style={celdaTabla}>Producto</th>
                        <th style={celdaTabla}>Cantidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosMasEntregados.length === 0 ? (
                        <tr>
                          <td colSpan="2" style={celdaTabla}>Sin entregas activas este mes.</td>
                        </tr>
                      ) : (
                        productosMasEntregados.map((item) => (
                          <tr key={`${item.producto}-${item.variante}`}>
                            <td style={celdaTabla}>{item.producto} - {item.variante}</td>
                            <td style={celdaTabla}>{item.cantidad} {item.unidad}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </section>

                <section style={panelBloque}>
                  <h3 style={{ marginTop: 0 }}>Entregas por centro de costos</h3>
                  <table style={tabla}>
                    <thead>
                      <tr style={encabezadoTabla}>
                        <th style={celdaTabla}>Centro</th>
                        <th style={celdaTabla}>Itéms</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entregasPorCentroCostos.length === 0 ? (
                        <tr>
                          <td colSpan="2" style={celdaTabla}>Sin entregas activas este mes.</td>
                        </tr>
                      ) : (
                        entregasPorCentroCostos.map((item) => (
                          <tr key={`${item.codigo}-${item.centro}`}>
                            <td style={celdaTabla}>{item.centro}</td>
                            <td style={celdaTabla}>{item.cantidad}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </section>

                <section style={panelBloque}>
                  <h3 style={{ marginTop: 0 }}>Entregas recientes</h3>
                  <table style={tabla}>
                    <thead>
                      <tr style={encabezadoTabla}>
                        <th style={celdaTabla}>Fecha</th>
                        <th style={celdaTabla}>Colaborador</th>
                        <th style={celdaTabla}>Producto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entregasRecientes.length === 0 ? (
                        <tr>
                          <td colSpan="3" style={celdaTabla}>Todavía no hay entregas registradas.</td>
                        </tr>
                      ) : (
                        entregasRecientes.map((item) => (
                          <tr key={item.id} style={item.estado === "Anulada" ? filaAnulada : undefined}>
                            <td style={celdaTabla}>{item.fecha}</td>
                            <td style={celdaTabla}>{item.colaborador}</td>
                            <td style={celdaTabla}>{item.producto} - {item.variante}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </section>
              </div>
            </>
          )}

          {pestanaActiva === "reportes" && (
            <>
              <div style={accionesModulo}>
                <button type="button" onClick={exportarReporteEntregasFiltradas} style={botonSecundario}>
                  <Download size={18} />
                  Exportar entregas filtradas
                </button>
                <button type="button" onClick={exportarReporteConsumoProductos} style={botonSecundario}>
                  <Download size={18} />
                  Exportar consumo por producto
                </button>
                <button type="button" onClick={exportarReporteCentros} style={botonSecundario}>
                  <Download size={18} />
                  Exportar centros
                </button>
                <button type="button" onClick={exportarReporteStockBajo} style={botonSecundario}>
                  <Download size={18} />
                  Exportar stock bajo
                </button>
              </div>

              <h2 style={{ marginTop: "34px" }}>Reportes</h2>

              <section style={panelBloque}>
                <form style={gridFormulario}>
                  <Campo texto="Desde">
                    <input type="date" value={filtrosReporte.desde} onChange={(e) => actualizarFiltroReporte("desde", e.target.value)} style={campoFormulario} />
                  </Campo>

                  <Campo texto="Hasta">
                    <input type="date" value={filtrosReporte.hasta} onChange={(e) => actualizarFiltroReporte("hasta", e.target.value)} style={campoFormulario} />
                  </Campo>

                  <Campo texto="Centro de costos">
                    <select value={filtrosReporte.centroCostos} onChange={(e) => actualizarFiltroReporte("centroCostos", e.target.value)} style={campoFormulario}>
                      <option>Todos</option>
                      {centrosCostos.map((centro) => (
                        <option key={centro.codigo} value={centro.codigo}>
                          {centro.codigo} - {centro.nombre}
                        </option>
                      ))}
                    </select>
                  </Campo>

                  <Campo texto="categoría">
                    <select value={filtrosReporte.categoria} onChange={(e) => actualizarFiltroReporte("categoria", e.target.value)} style={campoFormulario}>
                      <option>Todas</option>
                      <option>Dotación</option>
                      <option>EPP</option>
                    </select>
                  </Campo>
                </form>
              </section>

              <div style={dashboardGrid}>
                <div style={tarjetaIndicador("#0100FE")}>
                  <strong>Itéms entregados</strong>
                  <h2>{totalEntregadoReporte}</h2>
                </div>
                <div style={tarjetaIndicador("#77A9FF")}>
                  <strong>Líneas de entrega</strong>
                  <h2>{entregasReporte.length}</h2>
                </div>
                <div style={tarjetaIndicador("#0100FE")}>
                  <strong>Colaboradores</strong>
                  <h2>{colaboradoresReporte.length}</h2>
                </div>
                <div style={tarjetaIndicador("#000000")}>
                  <strong>Productos en stock bajo</strong>
                  <h2>{productosStockBajo.length}</h2>
                </div>
              </div>

              <div style={panelGrid}>
                <section style={panelBloque}>
                  <h3 style={{ marginTop: 0 }}>Consumo por producto</h3>
                  <table style={tabla}>
                    <thead>
                      <tr style={encabezadoTabla}>
                        <th style={celdaTabla}>Producto</th>
                        <th style={celdaTabla}>categoría</th>
                        <th style={celdaTabla}>Cantidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosReporte.length === 0 ? (
                        <tr>
                          <td colSpan="3" style={celdaTabla}>Sin entregas para los filtros seleccionados.</td>
                        </tr>
                      ) : (
                        productosReporte.slice(0, 12).map((item) => (
                          <tr key={`${item.producto}-${item.variante}`}>
                            <td style={celdaTabla}>{item.producto} - {item.variante}</td>
                            <td style={celdaTabla}>{item.categoria}</td>
                            <td style={celdaTabla}>{item.cantidad} {item.unidad}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </section>

                <section style={panelBloque}>
                  <h3 style={{ marginTop: 0 }}>Entregas por centro de costos</h3>
                  <table style={tabla}>
                    <thead>
                      <tr style={encabezadoTabla}>
                        <th style={celdaTabla}>Centro</th>
                        <th style={celdaTabla}>CÃ³digo</th>
                        <th style={celdaTabla}>Itéms</th>
                      </tr>
                    </thead>
                    <tbody>
                      {centrosReporte.length === 0 ? (
                        <tr>
                          <td colSpan="3" style={celdaTabla}>Sin entregas para los filtros seleccionados.</td>
                        </tr>
                      ) : (
                        centrosReporte.map((item) => (
                          <tr key={`${item.codigo}-${item.centro}`}>
                            <td style={celdaTabla}>{item.centro}</td>
                            <td style={celdaTabla}>{item.codigo}</td>
                            <td style={celdaTabla}>{item.cantidad}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </section>

                <section style={panelBloque}>
                  <h3 style={{ marginTop: 0 }}>Colaboradores con mÃ¡s entregas</h3>
                  <table style={tabla}>
                    <thead>
                      <tr style={encabezadoTabla}>
                        <th style={celdaTabla}>Colaborador</th>
                        <th style={celdaTabla}>Centro</th>
                        <th style={celdaTabla}>Itéms</th>
                      </tr>
                    </thead>
                    <tbody>
                      {colaboradoresReporte.length === 0 ? (
                        <tr>
                          <td colSpan="3" style={celdaTabla}>Sin entregas para los filtros seleccionados.</td>
                        </tr>
                      ) : (
                        colaboradoresReporte.slice(0, 12).map((item) => (
                          <tr key={`${item.identificacion}-${item.colaborador}`}>
                            <td style={celdaTabla}>{item.colaborador}</td>
                            <td style={celdaTabla}>{item.centroCostos}</td>
                            <td style={celdaTabla}>{item.cantidad}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </section>

                <section style={panelBloque}>
                  <h3 style={{ marginTop: 0 }}>Stock bajo</h3>
                  <table style={tabla}>
                    <thead>
                      <tr style={encabezadoTabla}>
                        <th style={celdaTabla}>Producto</th>
                        <th style={celdaTabla}>Stock</th>
                        <th style={celdaTabla}>Mínimo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosStockBajo.length === 0 ? (
                        <tr>
                          <td colSpan="3" style={celdaTabla}>Sin productos en stock bajo.</td>
                        </tr>
                      ) : (
                        productosStockBajo.map((producto) => (
                          <tr key={producto.id}>
                            <td style={celdaTabla}>{producto.nombre} - {producto.variante}</td>
                            <td style={celdaTabla}>{producto.stockActual} {producto.unidad}</td>
                            <td style={celdaTabla}>{producto.stockMinimo}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </section>
              </div>
            </>
          )}

          {pestanaActiva === "productos" && (
            <>
          <div style={accionesModulo}>
            <button type="button" onClick={() => setMostrarFormularioItem(!mostrarFormularioItem)} style={botonSecundario}>
              <Plus size={18} />
              {mostrarFormularioItem ? "Cerrar item nuevo" : "Crear item nuevo"}
            </button>
            <button onClick={exportarProductos} style={botonSecundario}>
              <Download size={18} />
              Exportar productos
            </button>
          </div>

          {mostrarFormularioItem && (
            <section style={panelBloque}>
              <h2 style={{ marginTop: 0 }}>
                {itemCatalogoEditandoClave ? "Editar item del catálogo" : "Crear item nuevo"}
              </h2>
              <form onSubmit={registrarItemCatalogo} style={gridFormulario}>
                <Campo texto="categoría">
                  <select value={itemCatalogo.categoria} onChange={(e) => actualizarItemCatalogo("categoria", e.target.value)} style={campoFormulario}>
                    <option>Dotación</option>
                    <option>EPP</option>
                  </select>
                </Campo>

                <Campo texto="Nombre del item">
                  <input value={itemCatalogo.nombre} onChange={(e) => actualizarItemCatalogo("nombre", e.target.value)} required style={campoFormulario} />
                </Campo>

                <Campo texto="Tipo">
                  <input value={itemCatalogo.tipo} onChange={(e) => actualizarItemCatalogo("tipo", e.target.value)} placeholder="Ej: Calzado, Protección visual, Camisa" required style={campoFormulario} />
                </Campo>

                <Campo texto="Unidad">
                  <select value={itemCatalogo.unidad} onChange={(e) => actualizarItemCatalogo("unidad", e.target.value)} style={campoFormulario}>
                    <option>Unidad</option>
                    <option>Par</option>
                    <option>Caja</option>
                    <option>Paquete</option>
                    <option>Bono</option>
                  </select>
                </Campo>

                <Campo texto="Variantes">
                  <input value={itemCatalogo.variantes} onChange={(e) => actualizarItemCatalogo("variantes", e.target.value)} placeholder="Ej: S, M, L, XL o Única" required style={campoFormulario} />
                </Campo>

                <Campo texto="Stock Mínimo">
                  <input type="number" min="0" value={itemCatalogo.stockMinimo} onChange={(e) => actualizarItemCatalogo("stockMinimo", e.target.value)} required style={campoFormulario} />
                </Campo>

                <button style={botonPrincipal}>
                  <Plus size={18} />
                  {itemCatalogoEditandoClave ? "Guardar cambios del item" : "Guardar item nuevo"}
                </button>
                {itemCatalogoEditandoClave && (
                  <button type="button" onClick={cancelarEdicionItemCatalogo} style={botonSecundario}>
                    Cancelar edición
                  </button>
                )}
              </form>

              <h3>Items del catálogo</h3>
              <input
                value={busquedaCatalogo}
                onChange={(e) => setBusquedaCatalogo(e.target.value)}
                placeholder="Buscar item del catálogo"
                style={campoBusqueda}
              />
              <table style={tabla}>
                <thead>
                  <tr style={encabezadoTabla}>
                    <th style={celdaTabla}>Item</th>
                    <th style={celdaTabla}>categoría</th>
                    <th style={celdaTabla}>Tipo</th>
                    <th style={celdaTabla}>Unidad</th>
                    <th style={celdaTabla}>Variantes</th>
                    <th style={celdaTabla}>Mínimo</th>
                    <th style={celdaTabla}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogoProductos
                    .filter((item) =>
                      coincideBusqueda(item, busquedaCatalogo, ["nombre", "categoria", "tipo", "unidad", "variantes"])
                    )
                    .map((item) => (
                      <tr key={claveItemCatalogo(item)}>
                        <td style={celdaTabla}>{item.nombre}</td>
                        <td style={celdaTabla}>{item.categoria}</td>
                        <td style={celdaTabla}>{item.tipo}</td>
                        <td style={celdaTabla}>{item.unidad}</td>
                        <td style={celdaTabla}>{item.variantes.join(", ")}</td>
                        <td style={celdaTabla}>{obtenerStockMinimo(item)}</td>
                        <td style={celdaTabla}>
                          <button type="button" onClick={() => prepararEdicionItemCatalogo(item)} style={botonEditar}>
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </section>
          )}

          <h2 style={{ marginTop: "34px" }}>
            {productoEditandoId ? "Editar producto" : "Registrar producto"}
          </h2>

          <form onSubmit={registrarProducto} style={gridFormulario}>
            {productoEditandoTieneHistorial && (
              <p style={ayudaFormulario}>
                Este producto ya tiene historial. Para conservar la trazabilidad, nombre, categoría, tipo, variante y unidad quedan protegidos.
              </p>
            )}

            <Campo texto="categoría">
              <select value={formulario.categoria} onChange={(e) => actualizarCampo("categoria", e.target.value)} disabled={productoEditandoTieneHistorial} style={productoEditandoTieneHistorial ? { ...campoFormulario, background: "#E0E5EB", cursor: "not-allowed" } : campoFormulario}>
                <option>Dotación</option>
                <option>EPP</option>
              </select>
            </Campo>

            <Campo texto="Nombre del elemento">
              <select value={formulario.nombre} onChange={(e) => actualizarCampo("nombre", e.target.value)} disabled={productoEditandoTieneHistorial} required style={productoEditandoTieneHistorial ? { ...campoFormulario, background: "#E0E5EB", cursor: "not-allowed" } : campoFormulario}>
                <option value="">Selecciona un elemento</option>
                {productosCategoria.map((producto) => (
                  <option key={producto.nombre} value={producto.nombre}>
                    {producto.nombre}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo texto="Tipo">
              <select value={formulario.tipo} onChange={(e) => actualizarCampo("tipo", e.target.value)} disabled={productoEditandoTieneHistorial} required style={productoEditandoTieneHistorial ? { ...campoFormulario, background: "#E0E5EB", cursor: "not-allowed" } : campoFormulario}>
                <option value="">Selecciona un tipo</option>
                {tiposCategoria.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo texto="Talla o variante">
              <select value={formulario.variante} onChange={(e) => actualizarCampo("variante", e.target.value)} disabled={productoEditandoTieneHistorial} required style={productoEditandoTieneHistorial ? { ...campoFormulario, background: "#E0E5EB", cursor: "not-allowed" } : campoFormulario}>
                <option value="">Selecciona una variante</option>
                {variantesProducto.map((variante) => (
                  <option key={variante} value={variante}>
                    {variante}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo texto="Unidad">
              <select value={formulario.unidad} onChange={(e) => actualizarCampo("unidad", e.target.value)} disabled={productoEditandoTieneHistorial} style={productoEditandoTieneHistorial ? { ...campoFormulario, background: "#E0E5EB", cursor: "not-allowed" } : campoFormulario}>
                <option>Unidad</option>
                <option>Par</option>
                <option>Caja</option>
                <option>Paquete</option>
                <option>Bono</option>
              </select>
            </Campo>

            <Campo texto="Ubicación">
              <input value={formulario.ubicacion} onChange={(e) => actualizarCampo("ubicacion", e.target.value)} style={campoFormulario} />
            </Campo>

            <Campo texto={productoEditandoId ? "Stock actual (solo consulta)" : "Stock inicial / entrada"}>
              <input
                type="number"
                min="0"
                value={formulario.stockActual}
                onChange={(e) => actualizarCampo("stockActual", e.target.value)}
                readOnly={Boolean(productoEditandoId)}
                required
                style={productoEditandoId ? { ...campoFormulario, background: "#E0E5EB", cursor: "not-allowed" } : campoFormulario}
              />
            </Campo>

            {!productoEditandoId && (
              <Campo texto="Motivo de entrada">
                <select value={formulario.motivoEntrada || "Compra"} onChange={(e) => actualizarCampo("motivoEntrada", e.target.value)} style={campoFormulario}>
                  <option>Compra</option>
                  <option>Inventario inicial</option>
                  <option>Reposición</option>
                  <option>Devolución</option>
                  <option>Ajuste inicial</option>
                  <option>Otro</option>
                </select>
              </Campo>
            )}

            {!productoEditandoId && (
              <Campo texto="Observación de entrada">
                <input value={formulario.observacionEntrada || ""} onChange={(e) => actualizarCampo("observacionEntrada", e.target.value)} placeholder="Ej: factura, conteo inicial, proveedor" style={campoFormulario} />
              </Campo>
            )}

            <Campo texto="Stock Mínimo definido">
              <input
                type="number"
                min="0"
                value={formulario.stockMinimo}
                readOnly
                required
                style={{ ...campoFormulario, background: "#E0E5EB", cursor: "not-allowed" }}
              />
            </Campo>

            <Campo texto="Estado">
              <select value={formulario.estado} onChange={(e) => actualizarCampo("estado", e.target.value)} style={campoFormulario}>
                <option>Activo</option>
                <option>Inactivo</option>
              </select>
            </Campo>

            <div style={filaBotones}>
              <button style={botonPrincipal}>
                <Package size={18} />
                {productoEditandoId ? "Guardar cambios" : "Registrar producto"}
              </button>
              {productoEditandoId && (
                <button type="button" onClick={cancelarEdicionProducto} style={botonSecundario}>
                  Cancelar edición
                </button>
              )}
            </div>
          </form>

          <h2 style={{ marginTop: "34px" }}>Productos registrados</h2>

          <input
            value={busquedaProductos}
            onChange={(e) => setBusquedaProductos(e.target.value)}
            placeholder="Buscar producto por nombre, tipo, talla, ubicación o estado"
            style={campoBusqueda}
          />

          <div style={grupoFiltros}>
            {["Todos", "Stock bajo", "Activos", "Inactivos"].map((filtro) => (
              <button key={filtro} onClick={() => setFiltroProductos(filtro)} style={botonFiltro(filtroProductos === filtro)}>
                {filtro}
              </button>
            ))}
          </div>

          <table style={tabla}>
            <thead>
              <tr style={encabezadoTabla}>
                <th style={celdaTabla}>Producto</th>
                <th style={celdaTabla}>categoría</th>
                <th style={celdaTabla}>Tipo</th>
                <th style={celdaTabla}>Variante</th>
                <th style={celdaTabla}>Stock</th>
                <th style={celdaTabla}>Mínimo</th>
                <th style={celdaTabla}>Estado</th>
                <th style={celdaTabla}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="8" style={celdaTabla}>No hay productos que coincidan con la bÃºsqueda.</td>
                </tr>
              ) : (
              productosFiltrados.map((producto) => (
                <tr key={producto.id}>
                  <td style={celdaTabla}>{producto.nombre}</td>
                  <td style={celdaTabla}>{producto.categoria}</td>
                  <td style={celdaTabla}>{producto.tipo}</td>
                  <td style={celdaTabla}>{producto.variante}</td>
                  <td style={celdaTabla}>{producto.stockActual} {producto.unidad}</td>
                  <td style={celdaTabla}>{producto.stockMinimo}</td>
                  <td style={celdaTabla}>{producto.estado}</td>
                  <td style={celdaTabla}>
                    <button onClick={() => prepararEdicion(producto)} style={botonEditar}>
                      Editar
                    </button>

                    <button onClick={() => eliminarProducto(producto.id)} style={botonEliminar}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
            </>
          )}

          {pestanaActiva === "movimientos" && (
            <>
          <div style={accionesModulo}>
            <button onClick={exportarMovimientos} style={botonSecundario}>
              <Download size={18} />
              Exportar movimientos
            </button>
          </div>

          <h2 style={{ marginTop: "34px" }}>Registrar movimiento</h2>

          <form onSubmit={registrarMovimiento} style={gridFormulario}>
            <Campo texto="Producto">
              <select value={movimiento.productoId} onChange={(e) => actualizarMovimiento("productoId", e.target.value)} required style={campoFormulario}>
                <option value="">Selecciona un producto registrado</option>
                {productos.map((producto) => (
                  <option key={producto.id} value={producto.id}>
                    {producto.nombre} - {producto.variante} - Stock: {producto.stockActual} {producto.unidad}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo texto="Tipo de movimiento">
              <select value={movimiento.tipoMovimiento} onChange={(e) => actualizarMovimiento("tipoMovimiento", e.target.value)} style={campoFormulario}>
                <option>Entrada</option>
                <option>Devolución</option>
                <option>Ajuste positivo</option>
                <option>Ajuste negativo</option>
              </select>
            </Campo>

            <Campo texto="Cantidad">
              <input type="number" min="1" value={movimiento.cantidad} onChange={(e) => actualizarMovimiento("cantidad", e.target.value)} required style={campoFormulario} />
            </Campo>

            <Campo texto="Fecha">
              <input type="date" value={movimiento.fecha} onChange={(e) => actualizarMovimiento("fecha", e.target.value)} required style={campoFormulario} />
            </Campo>

            <Campo texto="Observación">
              <input value={movimiento.observacion} onChange={(e) => actualizarMovimiento("observacion", e.target.value)} placeholder="Ej: factura, devolución de colaborador o justificación del ajuste" style={campoFormulario} />
            </Campo>

            <button style={botonPrincipal}>
              <ArrowLeftRight size={18} />
              Registrar movimiento
            </button>
          </form>

          <h2 style={{ marginTop: "34px" }}>Movimientos recientes</h2>

          <input
            value={busquedaMovimientos}
            onChange={(e) => setBusquedaMovimientos(e.target.value)}
            placeholder="Buscar movimiento por fecha, producto, tipo u observación"
            style={campoBusqueda}
          />

          <div style={grupoFiltros}>
            {["Todos", "Entradas", "Devoluciones", "Entregas", "Ajustes", "Anulaciones"].map((filtro) => (
              <button key={filtro} onClick={() => setFiltroMovimientos(filtro)} style={botonFiltro(filtroMovimientos === filtro)}>
                {filtro}
              </button>
            ))}
          </div>

          <table style={tabla}>
            <thead>
              <tr style={encabezadoTabla}>
                <th style={celdaTabla}>Fecha</th>
                <th style={celdaTabla}>Producto</th>
                <th style={celdaTabla}>Variante</th>
                <th style={celdaTabla}>Movimiento</th>
                <th style={celdaTabla}>Cantidad</th>
                <th style={celdaTabla}>Stock final</th>
                <th style={celdaTabla}>Observación</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.length === 0 ? (
                <tr>
                  <td colSpan="7" style={celdaTabla}>Todavía no hay movimientos registrados.</td>
                </tr>
              ) : (
                movimientosFiltrados.map((item) => (
                  <tr key={item.id}>
                    <td style={celdaTabla}>{item.fecha}</td>
                    <td style={celdaTabla}>{item.producto}</td>
                    <td style={celdaTabla}>{item.variante}</td>
                    <td style={celdaTabla}>{item.tipoMovimiento}</td>
                    <td style={celdaTabla}>{item.cantidad} {item.unidad}</td>
                    <td style={celdaTabla}>{item.stockResultante} {item.unidad}</td>
                    <td style={celdaTabla}>{limpiarObservacion(item.observacion) || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
            </>
          )}

          {pestanaActiva === "colaboradores" && (
            <>
          <div style={accionesModulo}>
            <label style={botonSecundario}>
              <Plus size={18} />
              Importar colaboradores
              <input type="file" accept=".csv" onChange={importarColaboradores} style={{ display: "none" }} />
            </label>
            <button onClick={exportarColaboradores} style={botonSecundario}>
              <Download size={18} />
              Exportar colaboradores
            </button>
          </div>

          <h2 style={{ marginTop: "34px" }}>
            {colaboradorEditandoId ? "Editar colaborador" : "Registrar colaborador"}
          </h2>

          <form onSubmit={registrarColaborador} style={gridFormulario}>
            {colaboradorEditandoTieneHistorial && (
              <p style={ayudaFormulario}>
                Este colaborador ya tiene entregas registradas. La identificación queda protegida para no romper el historial.
              </p>
            )}

            <Campo texto="Identificación">
              <input value={colaborador.identificacion} onChange={(e) => actualizarColaborador("identificacion", e.target.value)} readOnly={colaboradorEditandoTieneHistorial} required style={colaboradorEditandoTieneHistorial ? { ...campoFormulario, background: "#E0E5EB", cursor: "not-allowed" } : campoFormulario} />
            </Campo>

            <Campo texto="Nombre completo">
              <input value={colaborador.nombreCompleto} onChange={(e) => actualizarColaborador("nombreCompleto", e.target.value)} required style={campoFormulario} />
            </Campo>

            <Campo texto="Cargo">
              <input value={colaborador.cargo} onChange={(e) => actualizarColaborador("cargo", e.target.value)} required style={campoFormulario} />
            </Campo>

            <Campo texto="Sub-Área">
              <select value={colaborador.subArea} onChange={(e) => actualizarColaborador("subArea", e.target.value)} required style={campoFormulario}>
                <option value="">Selecciona sub-Área</option>
                {subAreasDisponibles.map((subArea) => (
                  <option key={subArea} value={subArea}>
                    {subArea}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo texto="Grupo">
              <select value={colaborador.grupo} onChange={(e) => actualizarColaborador("grupo", e.target.value)} required style={campoFormulario}>
                <option value="">Selecciona grupo</option>
                {gruposDisponibles.map((grupo) => (
                  <option key={grupo} value={grupo}>
                    {grupo}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo texto="Centro de costos">
              <input
                value={colaborador.centroCostos}
                readOnly
                required
                style={{ ...campoFormulario, background: "#E0E5EB", cursor: "not-allowed" }}
              />
            </Campo>

            <Campo texto="Nombre centro de costos">
              <select value={colaborador.nombreCentroCostos} onChange={(e) => actualizarColaborador("nombreCentroCostos", e.target.value)} required style={campoFormulario}>
                <option value="">Selecciona centro de costos</option>
                {centrosCostos.map((centro) => (
                  <option key={centro.codigo} value={centro.nombre}>
                    {centro.nombre}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo texto="Sexo">
              <select value={colaborador.sexo} onChange={(e) => actualizarColaborador("sexo", e.target.value)} style={campoFormulario}>
                <option>Femenino</option>
                <option>Masculino</option>
              </select>
            </Campo>

            <Campo texto="Estado">
              <select value={colaborador.estado} onChange={(e) => actualizarColaborador("estado", e.target.value)} style={campoFormulario}>
                <option>Activo</option>
                <option>Retirado</option>
              </select>
            </Campo>

            <Campo texto="Talla antifluido">
              <select value={colaborador.tallaAntifluido} onChange={(e) => actualizarColaborador("tallaAntifluido", e.target.value)} style={campoFormulario}>
                <option>N/A</option>
                <option>XS</option>
                <option>S</option>
                <option>M</option>
                <option>L</option>
                <option>XL</option>
                <option>XXL</option>
              </select>
            </Campo>

            <Campo texto="Talla bata">
              <select value={colaborador.tallaBata} onChange={(e) => actualizarColaborador("tallaBata", e.target.value)} style={campoFormulario}>
                <option>N/A</option>
                <option>XS</option>
                <option>S</option>
                <option>M</option>
                <option>L</option>
                <option>XL</option>
                <option>XXL</option>
              </select>
            </Campo>

            <Campo texto="Talla camisa">
              <select value={colaborador.tallaCamisa} onChange={(e) => actualizarColaborador("tallaCamisa", e.target.value)} style={campoFormulario}>
                <option>N/A</option>
                <option>XS</option>
                <option>S</option>
                <option>M</option>
                <option>L</option>
                <option>XL</option>
                <option>XXL</option>
              </select>
            </Campo>

            <Campo texto="Talla pantalón">
              <select value={colaborador.tallaPantalon} onChange={(e) => actualizarColaborador("tallaPantalon", e.target.value)} style={campoFormulario}>
                <option>N/A</option>
                <option>6</option>
                <option>8</option>
                <option>10</option>
                <option>12</option>
                <option>14</option>
                <option>16</option>
                <option>28</option>
                <option>30</option>
                <option>32</option>
                <option>34</option>
                <option>36</option>
                <option>38</option>
                <option>40</option>
              </select>
            </Campo>

            <Campo texto="Talla botas">
              <select value={colaborador.tallaBotas} onChange={(e) => actualizarColaborador("tallaBotas", e.target.value)} required style={campoFormulario}>
                <option value="">Selecciona talla</option>
                <option>35</option>
                <option>36</option>
                <option>37</option>
                <option>38</option>
                <option>39</option>
                <option>40</option>
                <option>41</option>
                <option>42</option>
                <option>43</option>
              </select>
            </Campo>

            <div style={filaBotones}>
              <button style={botonPrincipal}>
                <Users size={18} />
                {colaboradorEditandoId ? "Guardar colaborador" : "Registrar colaborador"}
              </button>
              {colaboradorEditandoId && (
                <button type="button" onClick={cancelarEdicionColaborador} style={botonSecundario}>
                  Cancelar edición
                </button>
              )}
            </div>
          </form>

          <h2 style={{ marginTop: "34px" }}>Colaboradores registrados</h2>

          <input
            value={busquedaColaboradores}
            onChange={(e) => setBusquedaColaboradores(e.target.value)}
            placeholder="Buscar colaborador por nombre, identificación, cargo, grupo o centro de costos"
            style={campoBusqueda}
          />

          <div style={grupoFiltros}>
            {["Todos", "Activos", "Retirados"].map((filtro) => (
              <button key={filtro} onClick={() => setFiltroColaboradores(filtro)} style={botonFiltro(filtroColaboradores === filtro)}>
                {filtro}
              </button>
            ))}
          </div>

          <table style={tabla}>
            <thead>
              <tr style={encabezadoTabla}>
                <th style={celdaTabla}>Identificación</th>
                <th style={celdaTabla}>Nombre</th>
                <th style={celdaTabla}>Cargo</th>
                <th style={celdaTabla}>Grupo</th>
                <th style={celdaTabla}>Centro costos</th>
                <th style={celdaTabla}>Nombre centro</th>
                <th style={celdaTabla}>Tallas</th>
                <th style={celdaTabla}>Estado</th>
                <th style={celdaTabla}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {colaboradoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="9" style={celdaTabla}>No hay colaboradores que coincidan con la bÃºsqueda.</td>
                </tr>
              ) : (
              colaboradoresFiltrados.map((item) => (
                <tr key={item.id}>
                  <td style={celdaTabla}>{item.identificacion}</td>
                  <td style={celdaTabla}>{item.nombreCompleto}</td>
                  <td style={celdaTabla}>{item.cargo}</td>
                  <td style={celdaTabla}>{item.grupo}</td>
                  <td style={celdaTabla}>{item.centroCostos}</td>
                  <td style={celdaTabla}>{item.nombreCentroCostos}</td>
                  <td style={celdaTabla}>
                    Antifluido: {item.tallaAntifluido} | Bata: {item.tallaBata} | Camisa: {item.tallaCamisa} | Pantalón: {item.tallaPantalon} | Botas: {item.tallaBotas}
                  </td>
                  <td style={celdaTabla}>{item.estado}</td>
                  <td style={celdaTabla}>
                    <button onClick={() => prepararEdicionColaborador(item)} style={botonEditar}>
                      Editar
                    </button>

                    <button onClick={() => eliminarColaborador(item.id)} style={botonEliminar}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
            </>
          )}

          {pestanaActiva === "entregas" && (
            <>
          <div style={accionesModulo}>
            <button onClick={exportarEntregas} style={botonSecundario}>
              <Download size={18} />
              Exportar entregas
            </button>
          </div>

          <h2 style={{ marginTop: "34px" }}>Registrar entrega</h2>

          <form onSubmit={registrarEntrega} style={gridFormulario}>
            <Campo texto="Colaborador">
              <select value={entrega.colaboradorId} onChange={(e) => actualizarEntrega("colaboradorId", e.target.value)} required style={campoFormulario}>
                <option value="">Selecciona colaborador</option>
                {colaboradores.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombreCompleto} - {item.identificacion} - {item.estado}
                  </option>
                ))}
              </select>
            </Campo>

            {colaboradorEntrega && (
              <div style={resumenTallas}>
                <strong>Tallas del colaborador</strong>
                <span>Antifluido: {colaboradorEntrega.tallaAntifluido}</span>
                <span>Bata: {colaboradorEntrega.tallaBata}</span>
                <span>Camisa: {colaboradorEntrega.tallaCamisa}</span>
                <span>Pantalón: {colaboradorEntrega.tallaPantalon}</span>
                <span>Botas: {colaboradorEntrega.tallaBotas}</span>
              </div>
            )}

            <Campo texto="Producto">
              <select value={lineaEntrega.productoId} onChange={(e) => actualizarLineaEntrega("productoId", e.target.value)} style={campoFormulario}>
                <option value="">Selecciona producto</option>
                {productosOrdenadosParaEntrega.filter((producto) => producto.estado === "Activo").map((producto) => (
                  <option key={producto.id} value={producto.id}>
                    {productoSugeridoParaColaborador(producto, colaboradorEntrega) ? "Sugerido - " : ""}
                    {producto.nombre} - {producto.variante} - Stock: {producto.stockActual} {producto.unidad}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo texto="Cantidad">
              <input type="number" min="1" value={lineaEntrega.cantidad} onChange={(e) => actualizarLineaEntrega("cantidad", e.target.value)} style={campoFormulario} />
            </Campo>

            <div style={{ display: "flex", alignItems: "end" }}>
              <button type="button" onClick={agregarLineaEntrega} style={botonSecundario}>
                Agregar producto
              </button>
            </div>

            {lineasEntregaDetalle.length > 0 && (
              <div style={resumenLineasEntrega}>
                <strong>Productos en esta entrega: {lineasEntregaDetalle.length}</strong>
                <table style={tabla}>
                  <thead>
                    <tr style={encabezadoTabla}>
                      <th style={celdaTabla}>Producto</th>
                      <th style={celdaTabla}>Variante</th>
                      <th style={celdaTabla}>Cantidad</th>
                      <th style={celdaTabla}>Stock disponible</th>
                      <th style={celdaTabla}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineasEntregaDetalle.map((linea) => (
                      <tr key={linea.productoId}>
                        <td style={celdaTabla}>{linea.producto?.nombre || "Producto no encontrado"}</td>
                        <td style={celdaTabla}>{linea.producto?.variante || "-"}</td>
                        <td style={celdaTabla}>{linea.cantidad} {linea.producto?.unidad || ""}</td>
                        <td style={celdaTabla}>{linea.producto?.stockActual ?? "-"} {linea.producto?.unidad || ""}</td>
                        <td style={celdaTabla}>
                          <button type="button" onClick={() => quitarLineaEntrega(linea.productoId)} style={botonEliminar}>
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ margin: "10px 0 0" }}>Total de Ítems: {totalLineasEntrega}</p>
              </div>
            )}

            <Campo texto="Fecha">
              <input type="date" value={entrega.fecha} onChange={(e) => actualizarEntrega("fecha", e.target.value)} required style={campoFormulario} />
            </Campo>

            <Campo texto="Motivo">
              <select value={entrega.motivo} onChange={(e) => actualizarEntrega("motivo", e.target.value)} style={campoFormulario}>
                <option>Ingreso</option>
                <option>Reposición</option>
                <option>Deterioro</option>
                <option>Dotación periÃ³dica</option>
                <option>Cambio de talla</option>
                <option>PÃ©rdida</option>
              </select>
            </Campo>

            <Campo texto="Responsable">
              <input value={entrega.responsable} onChange={(e) => actualizarEntrega("responsable", e.target.value)} required style={campoFormulario} />
            </Campo>

            <Campo texto="Observación">
              <input value={entrega.observacion} onChange={(e) => actualizarEntrega("observacion", e.target.value)} placeholder="Ej: Entrega inicial, reposición autorizada" style={campoFormulario} />
            </Campo>

            <button style={botonPrincipal}>
              <ClipboardCheck size={18} />
              Registrar entrega completa
            </button>
          </form>

          <h2 style={{ marginTop: "34px" }}>Historial por colaborador</h2>

          <div style={{ ...gridFormulario, alignItems: "end" }}>
            <Campo texto="Colaborador">
              <select value={colaboradorHistorialId} onChange={(e) => setColaboradorHistorialId(e.target.value)} style={campoFormulario}>
                <option value="">Selecciona colaborador para consultar</option>
                {colaboradores.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombreCompleto} - {item.identificacion}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          {colaboradorHistorial && (
            <>
              <div style={resumenHistorial}>
                <div>
                  <strong>{colaboradorHistorial.nombreCompleto}</strong>
                  <p style={{ margin: "6px 0 0" }}>
                    {colaboradorHistorial.identificacion} | {colaboradorHistorial.cargo} | {colaboradorHistorial.centroCostos}
                  </p>
                </div>
                <div>
                  <strong>{entregasColaborador.length}</strong>
                  <span>Total entregas</span>
                </div>
                <div>
                  <strong>{entregasActivasColaborador.length}</strong>
                  <span>Activas</span>
                </div>
                <div>
                  <strong>{entregasAnuladasColaborador.length}</strong>
                  <span>Anuladas</span>
                </div>
              </div>

              <table style={tabla}>
                <thead>
                  <tr style={encabezadoTabla}>
                    <th style={celdaTabla}>Fecha</th>
                    <th style={celdaTabla}>Producto</th>
                    <th style={celdaTabla}>Variante</th>
                    <th style={celdaTabla}>Cantidad</th>
                    <th style={celdaTabla}>Motivo</th>
                    <th style={celdaTabla}>Responsable</th>
                    <th style={celdaTabla}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {entregasColaborador.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={celdaTabla}>Este colaborador Todavía no tiene entregas registradas.</td>
                    </tr>
                  ) : (
                    entregasColaborador.map((item) => (
                      <tr key={item.id} style={item.estado === "Anulada" ? filaAnulada : undefined}>
                        <td style={celdaTabla}>{item.fecha}</td>
                        <td style={celdaTabla}>{item.producto}</td>
                        <td style={celdaTabla}>{item.variante}</td>
                        <td style={celdaTabla}>{item.cantidad} {item.unidad}</td>
                        <td style={celdaTabla}>{item.motivo}</td>
                        <td style={celdaTabla}>{item.responsable}</td>
                        <td style={celdaTabla}>{item.estado || "Activa"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          )}

          <h2 style={{ marginTop: "34px" }}>Historial de entregas</h2>

          <input
            value={busquedaEntregas}
            onChange={(e) => setBusquedaEntregas(e.target.value)}
            placeholder="Buscar entrega por colaborador, identificación, producto, fecha o estado"
            style={campoBusqueda}
          />

          <div style={grupoFiltros}>
            {["Todas", "Activas", "Anuladas"].map((filtro) => (
              <button key={filtro} onClick={() => setFiltroEntregas(filtro)} style={botonFiltro(filtroEntregas === filtro)}>
                {filtro}
              </button>
            ))}
          </div>

          <table style={tabla}>
            <thead>
              <tr style={encabezadoTabla}>
                <th style={celdaTabla}>Fecha</th>
                <th style={celdaTabla}>Comprobante</th>
                <th style={celdaTabla}>Colaborador</th>
                <th style={celdaTabla}>Producto</th>
                <th style={celdaTabla}>Variante</th>
                <th style={celdaTabla}>Cantidad</th>
                <th style={celdaTabla}>Motivo</th>
                <th style={celdaTabla}>Responsable</th>
                <th style={celdaTabla}>Centro costos</th>
                <th style={celdaTabla}>Stock final</th>
                <th style={celdaTabla}>Estado</th>
                <th style={celdaTabla}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {entregas.length === 0 ? (
                <tr>
                  <td colSpan="12" style={celdaTabla}>Todavía no hay entregas registradas.</td>
                </tr>
              ) : (
                entregasFiltradas.map((item) => (
                  <tr key={item.id} style={item.estado === "Anulada" ? filaAnulada : undefined}>
                    <td style={celdaTabla}>{item.fecha}</td>
                    <td style={celdaTabla}>{item.numeroComprobante || item.id}</td>
                    <td style={celdaTabla}>{item.colaborador}</td>
                    <td style={celdaTabla}>{item.producto}</td>
                    <td style={celdaTabla}>{item.variante}</td>
                    <td style={celdaTabla}>{item.cantidad} {item.unidad}</td>
                    <td style={celdaTabla}>{item.motivo}</td>
                    <td style={celdaTabla}>{item.responsable}</td>
                    <td style={celdaTabla}>{item.centroCostos}</td>
                    <td style={celdaTabla}>{item.stockResultante} {item.unidad}</td>
                    <td style={celdaTabla}>{item.estado || "Activa"}</td>
                    <td style={celdaTabla}>
                      <button onClick={() => abrirComprobante(item)} style={botonEditar}>
                        Comprobante
                      </button>

                      {(item.estado || "Activa") === "Activa" ? (
                        <button onClick={() => anularEntrega(item.id)} style={botonEliminar}>
                          Anular comprobante
                        </button>
                      ) : (
                        item.motivoAnulacion || "-"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
            </>
          )}
      </section>
    </main>
  )
}

export default App
