import { useCallback, useEffect, useState } from "react"
import { lazy, Suspense } from "react"
import { useRef } from "react"
import {
  ArrowLeftRight,
  BarChart3,
  Boxes,
  ClipboardCheck,
  Download,
  FileText,
  Home,
  KeyRound,
  Package,
  Paperclip,
  Plus,
  Printer,
  ShieldAlert,
  Trash2,
  Upload,
  UserRound,
  Users,
} from "lucide-react"

import { Campo } from "./components/Campo"
import { LayoutInventario } from "./components/LayoutInventario"
import { ListaBuscable } from "./components/ListaBuscable"
import { PantallaCarga, PantallaLogin } from "./components/PantallasSesion"
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
} from "./lib/inventarioSupabase"
import {
  anularComprobanteRpc,
  eliminarColaboradorRpc,
  eliminarCompraRpc,
  eliminarProductoAdminRpc,
  guardarCatalogoProductoRpc,
  guardarColaboradorRpc,
  guardarProductoMovimientoRpc,
  adjuntarFacturaCompraRpc,
  registrarCompraRpc,
  registrarEntregaRpc,
} from "./lib/operacionesInventario"
import {
  cambiarEstadoPerfilSeguro,
  cargarAdministracionUsuarios,
  cargarPerfilUsuario,
  guardarPerfilUsuarioSeguro,
} from "./lib/perfilesSupabase"
import { cargarResponsablesEntrega } from "./lib/responsablesSupabase"
import { supabase } from "./lib/supabase"
import { abrirComprobanteCompra } from "./utils/comprobanteCompra"
import { abrirComprobanteEntrega } from "./utils/comprobanteEntrega"
import {
  crearAlertaDotacionEntrega,
  planearDotacionColaboradores,
} from "./utils/dotacion"
import { fechaLocalISO, mesLocalISO } from "./utils/fechas"
import { leerFilasCompra, leerFilasProducto } from "./utils/importacionCompras"
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
  correoValido,
  ErrorValidacion,
  fechaIsoValida,
  mensajeSeguroError,
  numeroSeguro,
  textoLargoSeguro,
  textoSeguro,
  validarArchivoCsv,
  validarCamposRequeridos,
} from "./utils/seguridad"
import {
  accionesModulo,
  ayudaFormulario,
  botonEditar,
  botonEliminar,
  botonFiltro,
  botonPrincipal,
  filaBotones,
  botonSecundario,
  campoBusqueda,
  campoFormulario,
  celdaTabla,
  encabezadoTabla,
  filaAnulada,
  gridFormulario,
  grupoFiltros,
  iconoIndicador,
  mensajeApp,
  modalAcciones,
  modalBackdrop,
  modalPanel,
  modalResumen,
  panelBloque,
  resumenHistorial,
  resumenLineasEntrega,
  resumenTallas,
  tabla,
  tarjetaIndicador,
} from "./styles"

const assetUrl = (path) => `${import.meta.env.BASE_URL}${path}`

async function descargarCsv(...args) {
  const { exportarCsv } = await import("./utils/csv")

  return exportarCsv(...args)
}

async function descargarXlsx(...args) {
  const { exportarXlsx } = await import("./utils/csv")

  return exportarXlsx(...args)
}

const PanelPrincipal = lazy(() =>
  import("./modules/PanelPrincipal").then((modulo) => ({ default: modulo.PanelPrincipal }))
)
const ReportesPanel = lazy(() =>
  import("./modules/ReportesPanel").then((modulo) => ({ default: modulo.ReportesPanel }))
)

function opcionesSeparadas(valor) {
  return String(valor || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function accionDentroDelLimite(registroAcciones, accion, esperaMs) {
  const ahora = Date.now()
  const anterior = registroAcciones.current.get(accion) || 0

  if (ahora - anterior < esperaMs) return false

  registroAcciones.current.set(accion, ahora)
  return true
}

function crearCompraVacia() {
  return {
    numeroFactura: "",
    fecha: fechaLocalISO(),
    proveedor: "",
    responsable: "",
    observacion: "",
  }
}

const lineaCompraVacia = {
  productoId: "",
  cantidad: "",
  valorUnitario: "",
  observacion: "",
}

function formatearDinero(valor) {
  const numero = Number(valor || 0)

  if (!Number.isFinite(numero) || numero <= 0) return "-"

  return numero.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  })
}

function obtenerTipoFactura(archivo) {
  const nombre = String(archivo?.name || "").toLowerCase()
  const tipo = String(archivo?.type || "").toLowerCase()

  if (tipo === "application/pdf" || nombre.endsWith(".pdf")) {
    return "application/pdf"
  }

  if (tipo.startsWith("image/")) {
    return tipo
  }

  if (nombre.endsWith(".jpg") || nombre.endsWith(".jpeg")) return "image/jpeg"
  if (nombre.endsWith(".png")) return "image/png"
  if (nombre.endsWith(".webp")) return "image/webp"

  return ""
}

const BUCKET_FACTURAS_COMPRAS = "facturas-compras"

function normalizarRutaFacturaCompra(ruta) {
  const valor = String(ruta || "").trim()

  if (!valor) return ""

  try {
    const url = new URL(valor)
    const marca = `/object/sign/${BUCKET_FACTURAS_COMPRAS}/`
    const indice = url.pathname.indexOf(marca)

    if (indice >= 0) {
      return decodeURIComponent(url.pathname.slice(indice + marca.length))
    }
  } catch {
    // Si no es una URL completa, se trata como ruta interna del bucket.
  }

  return valor
    .replace(/^\/+/, "")
    .replace(new RegExp(`^${BUCKET_FACTURAS_COMPRAS}/`), "")
}

function nombreArchivoFactura(compraItem, archivo) {
  const extensionDetectada = archivo.name.split(".").pop()?.toLowerCase()
  const extension = ["pdf", "jpg", "jpeg", "png", "webp"].includes(extensionDetectada)
    ? extensionDetectada
    : "pdf"
  const factura = normalizarTexto(compraItem.numeroFactura) || "factura"

  return `${Date.now()}-${factura}.${extension}`
}

function facturaCompraVisible(compraItem) {
  const ruta = normalizarRutaFacturaCompra(compraItem?.facturaRuta)
  const url = String(compraItem?.facturaUrl || "").trim()

  return Boolean(ruta || (url && !url.startsWith("blob:")))
}

function App() {
  const accionesRecientes = useRef(new Map())
  const [catalogoProductos, setCatalogoProductos] = useState(catalogoProductosBase)
  const [productos, setProductos] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [entregas, setEntregas] = useState([])
  const [compras, setCompras] = useState([])
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
  const [compra, setCompra] = useState(() => crearCompraVacia())
  const [lineaCompra, setLineaCompra] = useState(lineaCompraVacia)
  const [lineasCompra, setLineasCompra] = useState([])
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
  const [busquedaCompras, setBusquedaCompras] = useState("")
  const [busquedaReportes, setBusquedaReportes] = useState("")
  const [busquedaPerfiles, setBusquedaPerfiles] = useState("")
  const [filtroProductos, setFiltroProductos] = useState("Activos")
  const [filtroMovimientos, setFiltroMovimientos] = useState("Todos")
  const [filtroColaboradores, setFiltroColaboradores] = useState("Todos")
  const [filtroEntregas, setFiltroEntregas] = useState("Todas")
  const [filtroPerfiles, setFiltroPerfiles] = useState("Todos")
  const [mesActual] = useState(() => mesLocalISO())
  const [filtrosReporte, setFiltrosReporte] = useState(() => {
    const hoy = fechaLocalISO()
    const mes = hoy.slice(0, 7)

    return {
      desde: `${mes}-01`,
      hasta: hoy,
      centroCostos: "Todos",
      categoria: "Todas",
      estado: "Todas",
    }
  })
  const [colaboradorHistorialId, setColaboradorHistorialId] = useState("")
  const [colaboradores, setColaboradores] = useState([])
  const [perfiles, setPerfiles] = useState([])
  const [responsablesEntrega, setResponsablesEntrega] = useState([])
  const [auditoria, setAuditoria] = useState([])
  const [accionGuardando, setAccionGuardando] = useState("")
  const [anulacionPendiente, setAnulacionPendiente] = useState(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState("")
  const [comprobanteExpandidoId, setComprobanteExpandidoId] = useState("")
  const [compraExpandidaId, setCompraExpandidaId] = useState("")
  const [categoriaPedido, setCategoriaPedido] = useState("EPP")
  const [mostrarCambioContrasena, setMostrarCambioContrasena] = useState(false)
  const [formularioContrasena, setFormularioContrasena] = useState({
    nueva: "",
    confirmar: "",
  })
  const [perfilEditandoId, setPerfilEditandoId] = useState(null)
  const [perfilFormulario, setPerfilFormulario] = useState({
    id: "",
    nombre: "",
    correo: "",
    rol: "Consulta",
    estado: "Activo",
  })

  const cargarPerfil = useCallback(async (usuarioId) => {
    let data

    try {
      data = await cargarPerfilUsuario(usuarioId)
    } catch {
      setPerfil(null)
      setErrorLogin("Tu usuario existe, pero no tiene perfil activo en la app.")
      return null
    }

    if (data.estado !== "Activo") {
      setPerfil(null)
      setErrorLogin("Tu usuario está inactivo. Contacta al administrador.")
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
        setCompras(datos.compras || [])
        setColaboradores(datos.colaboradores)

        const responsables = await cargarResponsablesEntrega(perfil)

        if (!activo) return

        setResponsablesEntrega(responsables)

        if (perfil.rol === "Administrador") {
          const administracion = await cargarAdministracionUsuarios()

          setPerfiles(administracion.perfiles)
          setAuditoria(administracion.auditoria)
        } else {
          setPerfiles([])
          setAuditoria([])
        }
      } catch (error) {
        if (activo) {
          setMensaje({
            texto: `No se pudo cargar la información: ${mensajeSeguroError(error)}`,
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
    return <PantallaCarga assetUrl={assetUrl} />
  }

  if (!sesion || !perfil) {
    return (
      <PantallaLogin
        assetUrl={assetUrl}
        credenciales={credenciales}
        errorLogin={errorLogin}
        sesion={sesion}
        actualizarCredenciales={actualizarCredenciales}
        iniciarSesion={iniciarSesion}
        cerrarSesion={cerrarSesion}
      />
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
  const tiposCategoria = [...new Set(productosCategoria.flatMap((producto) => opcionesSeparadas(producto.tipo)))]
  const tiposProductoSeleccionado = productoSeleccionado
    ? opcionesSeparadas(productoSeleccionado.tipo)
    : tiposCategoria
  const variantesProducto = productoSeleccionado?.variantes ?? []
  const productosActivos = productos.filter((producto) => producto.estado === "Activo")
  const productosStockBajo = productosActivos.filter(
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
    entregas.some((item) => item.productoId === productoEditandoId) ||
    compras.some((compraItem) =>
      compraItem.lineas?.some((linea) => linea.productoId === productoEditandoId)
    )
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
  const productoLineaCompra = productos.find(
    (producto) => String(producto.id) === lineaCompra.productoId
  )
  const lineasEntregaDetalle = lineasEntrega.map((linea) => ({
    ...linea,
    producto: productosPorId.get(String(linea.productoId)),
    cantidad: Number(linea.cantidad),
  }))
  const lineasCompraDetalle = lineasCompra.map((linea) => ({
    ...linea,
    producto: productosPorId.get(String(linea.productoId)),
    cantidad: Number(linea.cantidad),
    valorUnitario: Number(linea.valorUnitario || 0),
  }))
  const entregaTieneDotacion =
    productoLineaEntrega?.categoria === "Dotación" ||
    lineasEntregaDetalle.some((linea) => linea.producto?.categoria === "Dotación") ||
    entrega.motivo === "Dotación periódica"
  const alertaDotacionEntrega = crearAlertaDotacionEntrega({
    colaborador: colaboradorEntrega,
    entregas,
    fechaEntrega: entrega.fecha,
    entregaTieneDotacion,
  })
  const totalLineasEntrega = lineasEntregaDetalle.reduce(
    (total, linea) => total + Number(linea.cantidad || 0),
    0
  )
  const totalLineasCompra = lineasCompraDetalle.reduce(
    (total, linea) => total + Number(linea.cantidad || 0),
    0
  )
  const totalValorCompra = lineasCompraDetalle.reduce(
    (total, linea) => total + Number(linea.cantidad || 0) * Number(linea.valorUnitario || 0),
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
  const comprasFiltradas = compras.filter((item) =>
    coincideBusqueda({
      ...item,
      lineasTexto: (item.lineas || [])
        .map((linea) => `${linea.producto} ${linea.categoria} ${linea.tipo} ${linea.variante}`)
        .join(" "),
    }, busquedaCompras, ["numeroFactura", "fecha", "proveedor", "responsable", "observacion", "estado", "lineasTexto"])
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
  const comprobantesFiltrados = Object.values(
    entregasFiltradas.reduce((acumulado, item) => {
      const clave = item.comprobanteId || item.id

      acumulado[clave] = acumulado[clave] || {
        id: clave,
        numero: item.numeroComprobante || item.id,
        fecha: item.fecha,
        colaborador: item.colaborador,
        identificacion: item.identificacion,
        centroCostos: item.centroCostos,
        responsable: item.responsable,
        estado: "Activa",
        motivoAnulacion: item.motivoAnulacion,
        lineas: [],
        totalItems: 0,
      }
      acumulado[clave].lineas.push(item)
      acumulado[clave].totalItems += Number(item.cantidad || 0)

      return acumulado
    }, {})
  ).map((comprobante) => ({
    ...comprobante,
    estado: comprobante.lineas.every((linea) => linea.estado === "Anulada")
      ? "Anulada"
      : "Activa",
    primeraLinea: comprobante.lineas[0],
  }))
  const colaboradorHistorial = colaboradores.find(
    (item) => String(item.id) === colaboradorHistorialId
  )
  const entregasColaborador = colaboradorHistorial
    ? entregas.filter((item) => String(item.colaboradorId) === colaboradorHistorialId)
    : []
  const comprobantesColaborador = Object.values(
    entregasColaborador.reduce((acumulado, item) => {
      const clave = item.comprobanteId || item.id

      acumulado[clave] = acumulado[clave] || {
        id: clave,
        numero: item.numeroComprobante || item.id,
        fecha: item.fecha,
        motivo: item.motivo,
        responsable: item.responsable,
        motivoAnulacion: item.motivoAnulacion,
        lineas: [],
        totalItems: 0,
      }
      acumulado[clave].lineas.push(item)
      acumulado[clave].totalItems += Number(item.cantidad || 0)

      return acumulado
    }, {})
  ).map((comprobante) => {
    const productosResumen = comprobante.lineas
      .slice(0, 3)
      .map((linea) => `${linea.producto} - ${linea.variante}`)
      .join(", ")
    const productosRestantes = comprobante.lineas.length > 3
      ? ` +${comprobante.lineas.length - 3} más`
      : ""

    return {
      ...comprobante,
      estado: comprobante.lineas.every((linea) => linea.estado === "Anulada")
        ? "Anulada"
        : "Activa",
      productosResumen: `${productosResumen}${productosRestantes}`,
      primeraLinea: comprobante.lineas[0],
    }
  })
  const comprobantesActivosColaborador = comprobantesColaborador.filter(
    (item) => item.estado === "Activa"
  )
  const comprobantesAnuladosColaborador = comprobantesColaborador.filter(
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
  const entregasRecientes = entregasActivas.slice(0, 5)
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
  const entregasBaseReporte = entregas.filter((item) => {
    const estado = item.estado || "Activa"

    if (filtrosReporte.estado === "Activas") return estado === "Activa"
    if (filtrosReporte.estado === "Anuladas") return estado === "Anulada"

    return true
  })
  const entregasReporte = entregasBaseReporte.filter((item) => {
    const fecha = String(item.fecha || "")
    const coincideDesde = !filtrosReporte.desde || fecha >= filtrosReporte.desde
    const coincideHasta = !filtrosReporte.hasta || fecha <= filtrosReporte.hasta
    const coincideCentro = filtrosReporte.centroCostos === "Todos" ||
      item.centroCostos === filtrosReporte.centroCostos
    const categoriaEntrega = item.categoria || productosPorId.get(String(item.productoId))?.categoria || ""
    const coincideCategoria = filtrosReporte.categoria === "Todas" ||
      categoriaEntrega === filtrosReporte.categoria
    const coincideTexto = coincideBusqueda(item, busquedaReportes, [
      "numeroComprobante",
      "colaborador",
      "identificacion",
      "grupo",
      "centroCostos",
      "nombreCentroCostos",
      "producto",
      "variante",
      "motivo",
      "responsable",
      "estado",
    ])

    return coincideDesde && coincideHasta && coincideCentro && coincideCategoria && coincideTexto
  })
  const totalEntregadoReporte = entregasReporte.reduce(
    (total, item) => total + Number(item.cantidad || 0),
    0
  )
  const entregasActivasReporte = entregasReporte.filter(
    (item) => (item.estado || "Activa") === "Activa"
  )
  const entregasAnuladasReporte = entregasReporte.filter(
    (item) => (item.estado || "Activa") === "Anulada"
  )
  const totalActivoReporte = entregasActivasReporte.reduce(
    (total, item) => total + Number(item.cantidad || 0),
    0
  )
  const totalAnuladoReporte = entregasAnuladasReporte.reduce(
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
  const productosReporteGrafico = productosReporte.slice(0, 8).map((item) => ({
    ...item,
    etiqueta: `${item.producto} - ${item.variante}`,
  }))
  const centrosReporteGrafico = centrosReporte.slice(0, 8)
  const colaboradoresReporteGrafico = colaboradoresReporte.slice(0, 8)
  const productosStockBajoReporte = productosStockBajo.filter((producto) => {
    if (filtrosReporte.categoria === "Todas") return true

    return producto.categoria === filtrosReporte.categoria
  })
  const productosPedidoAutomatico = productos
    .filter((producto) =>
      producto.categoria === categoriaPedido &&
      producto.estado === "Activo" &&
      Number(producto.stockActual) <= Number(producto.stockMinimo)
    )
    .map((producto) => ({
      ...producto,
      cantidadSugerida: Math.max(1, Number(producto.stockMinimo) - Number(producto.stockActual)),
    }))
    .sort((a, b) => b.cantidadSugerida - a.cantidadSugerida)
  const planeacionDotacion = planearDotacionColaboradores({
    colaboradores,
    entregas,
    fechaBaseISO: fechaLocalISO(),
  })
  const rolesDisponibles = ["Administrador", "Gestion Humana", "Bodega", "Consulta"]
  const categoriasDisponibles = ["Dotación", "EPP"]
  const estadosPerfil = ["Activo", "Inactivo"]
  const estadosProducto = ["Activo", "Inactivo"]
  const estadosColaborador = ["Activo", "Retirado"]
  const unidadesDisponibles = ["Unidad", "Par", "Caja", "Paquete", "Bono"]
  const motivosEntrada = ["Compra", "Inventario inicial", "Reposición", "Devolución", "Ajuste inicial", "Otro"]
  const tiposMovimiento = ["Entrada", "Devolución", "Ajuste positivo", "Ajuste negativo"]
  const motivosEntrega = ["Ingreso", "Reposición", "Deterioro", "Dotación periódica", "Cambio de talla", "Pérdida"]
  const tallasRopa = ["N/A", "XS", "S", "M", "L", "XL", "XXL"]
  const tallasPantalon = ["N/A", "6", "8", "10", "12", "14", "16", "28", "30", "32", "34", "36", "38", "40"]
  const tallasBotas = ["35", "36", "37", "38", "39", "40", "41", "42", "43"]
  const opcionesColaboradoresEntrega = colaboradores
    .filter((item) => item.estado === "Activo")
    .map((item) => ({
      value: item.id,
      label: `${item.nombreCompleto} - ${item.identificacion}`,
    }))
  const opcionesColaboradoresHistorial = colaboradores.map((item) => ({
    value: item.id,
    label: `${item.nombreCompleto} - ${item.identificacion}`,
  }))
  const opcionesResponsablesEntrega = responsablesEntrega.map((item) => ({
    value: item.nombre,
    label: item.rol ? `${item.nombre} - ${item.rol}` : item.nombre,
  }))
  const opcionesProductosMovimiento = productos.map((producto) => ({
    value: producto.id,
    label: `${producto.nombre} - ${producto.variante} - Stock: ${producto.stockActual} ${producto.unidad}`,
  }))
  const opcionesProductosCompra = productos
    .filter((producto) => producto.estado === "Activo")
    .map((producto) => ({
      value: producto.id,
      label: `${producto.nombre} - ${producto.tipo} - ${producto.variante} - Stock: ${producto.stockActual} ${producto.unidad}`,
    }))
  const opcionesProductosEntrega = productosOrdenadosParaEntrega
    .filter((producto) => producto.estado === "Activo")
    .map((producto) => ({
      value: producto.id,
      label: `${productoSugeridoParaColaborador(producto, colaboradorEntrega) ? "Sugerido - " : ""}${producto.nombre} - ${producto.variante} - Stock: ${producto.stockActual} ${producto.unidad}`,
    }))
  const opcionesCentrosReporte = [
    { value: "Todos", label: "Todos" },
    ...centrosCostos.map((centro) => ({
      value: centro.codigo,
      label: `${centro.codigo} - ${centro.nombre}`,
    })),
  ]
  const esAdministrador = perfil?.rol === "Administrador"
  const puedeGestionarProductos = ["Administrador", "Gestion Humana", "Bodega"].includes(perfil?.rol)
  const puedeGestionarMovimientos = esAdministrador
  const puedeGestionarColaboradores = ["Administrador", "Gestion Humana"].includes(perfil?.rol)
  const puedeGestionarEntregas = ["Administrador", "Gestion Humana"].includes(perfil?.rol)
  const perfilesFiltrados = perfiles.filter((item) => {
    const coincideFiltro = filtroPerfiles === "Todos" ||
      item.rol === filtroPerfiles ||
      item.estado === filtroPerfiles

    return coincideFiltro &&
      coincideBusqueda(item, busquedaPerfiles, ["nombre", "correo", "rol", "estado"])
  })
  const perfilesPorId = new Map(perfiles.map((item) => [item.id, item]))
  const productosStockCritico = productosStockBajo.filter(
    (producto) => Number(producto.stockActual) <= Math.max(1, Number(producto.stockMinimo) / 2)
  )
  const colaboradoresActivos = colaboradores.filter((item) => item.estado === "Activo")
  const entregasAnuladasMes = entregas.filter(
    (item) => item.estado === "Anulada" && String(item.fecha || "").slice(0, 7) === mesActual
  )
  const pestanas = [
    { id: "panel", texto: "Panel", icono: Home },
    { id: "productos", texto: "Productos", icono: Package },
    { id: "movimientos", texto: "Movimientos", icono: ArrowLeftRight },
    { id: "colaboradores", texto: "Colaboradores", icono: Users },
    { id: "entregas", texto: "Entregas", icono: ClipboardCheck },
    { id: "reportes", texto: "Reportes", icono: BarChart3 },
    { id: "usuarios", texto: "Usuarios", icono: UserRound, soloAdmin: true },
    { id: "auditoria", texto: "Auditoría", icono: ShieldAlert, soloAdmin: true },
  ].filter((item) => !item.soloAdmin || esAdministrador)
  const indicadoresPrincipales = [
    { texto: "Productos activos", valor: productosActivos.length, icono: Package, color: "#0500ff" },
    { texto: "Colaboradores activos", valor: colaboradoresActivos.length, icono: Users, color: "#5b8dff" },
    { texto: "Entregas activas", valor: entregasActivas.length, icono: ClipboardCheck, color: "#5b8dff" },
    { texto: "Stock bajo", valor: productosStockBajo.length, icono: Boxes, color: "#0500ff" },
  ]
  const indicadoresPanel = [
    { texto: "Entregas activas", valor: entregasActivas.length, icono: ClipboardCheck, color: "#0500ff" },
    { texto: "Ítems entregados este mes", valor: totalEntregadoMes, icono: Boxes, color: "#5b8dff" },
    { texto: "Dotación este mes", valor: dotacionEntregadaMes, icono: Package, color: "#0500ff" },
    { texto: "EPP este mes", valor: eppEntregadoMes, icono: ShieldAlert, color: "#050505" },
    { texto: "Stock crítico", valor: productosStockCritico.length, icono: ShieldAlert, color: "#b91c1c" },
    { texto: "Anuladas este mes", valor: entregasAnuladasMes.length, icono: ClipboardCheck, color: "#050505" },
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
    console.warn("Operación rechazada por seguridad o validación.", {
      accion,
      codigo: error?.code,
      nombre: error?.name,
      mensaje: error?.message,
      estado: error?.statusCode || error?.status,
    })
    mostrarMensaje(`No se pudo ${accion}: ${mensajeSeguroError(error)}`, "error")
  }

  function requierePermiso(condicion, mensajePermiso) {
    if (condicion) return true

    mostrarMensaje(mensajePermiso, "error")
    return false
  }

  function estaGuardando(accion) {
    return accionGuardando === accion
  }

  function accionPermitida(accion, esperaMs = 1200) {
    if (!accionDentroDelLimite(accionesRecientes, accion, esperaMs)) {
      mostrarMensaje("Espera unos segundos antes de repetir esta acción.", "error")
      return false
    }

    return true
  }

  function actualizarPerfilFormulario(campo, valor) {
    setPerfilFormulario({
      ...perfilFormulario,
      [campo]: campo === "correo" ? valor.trim().toLowerCase() : valor,
    })
  }

  function prepararEdicionPerfil(item) {
    setPerfilEditandoId(item.id)
    setPerfilFormulario({
      id: item.id,
      nombre: item.nombre,
      correo: item.correo,
      rol: item.rol,
      estado: item.estado,
    })
  }

  function cancelarEdicionPerfil() {
    setPerfilEditandoId(null)
    setPerfilFormulario({
      id: "",
      nombre: "",
      correo: "",
      rol: "Consulta",
      estado: "Activo",
    })
  }

  async function guardarPerfilUsuario(evento) {
    evento.preventDefault()

    if (!requierePermiso(esAdministrador, "Solo un administrador puede gestionar usuarios.")) return
    if (accionGuardando || !accionPermitida("perfil")) return

    const payload = {
      id: textoSeguro(perfilFormulario.id, 80),
      nombre: textoSeguro(perfilFormulario.nombre, 120),
      correo: textoSeguro(perfilFormulario.correo, 160).toLowerCase(),
      rol: perfilFormulario.rol,
      estado: perfilFormulario.estado,
    }

    if (!payload.id || !payload.nombre || !correoValido(payload.correo)) {
      mostrarMensaje("Completa el ID de Supabase Auth, nombre y un correo válido.", "error")
      return
    }

    setAccionGuardando("perfil")

    try {
      const data = await guardarPerfilUsuarioSeguro(payload)

      setPerfiles((actuales) => {
        const existe = actuales.some((item) => item.id === data.id)
        const lista = existe
          ? actuales.map((item) => item.id === data.id ? data : item)
          : [...actuales, data]

        return lista.sort((a, b) => a.nombre.localeCompare(b.nombre))
      })
      cancelarEdicionPerfil()
      mostrarMensaje("Perfil guardado correctamente.", "exito")
    } catch (error) {
      mostrarErrorSupabase(error, "guardar el perfil")
    } finally {
      setAccionGuardando("")
    }
  }

  async function cambiarEstadoPerfil(item) {
    if (!requierePermiso(esAdministrador, "Solo un administrador puede cambiar usuarios.")) return
    if (accionGuardando || !accionPermitida(`perfil-${item.id}`)) return

    if (item.id === sesion?.user?.id && item.estado === "Activo") {
      mostrarMensaje("No puedes inactivar tu propio usuario desde esta pantalla.", "error")
      return
    }

    const nuevoEstado = item.estado === "Activo" ? "Inactivo" : "Activo"

    setAccionGuardando(`perfil-${item.id}`)

    try {
      const data = await cambiarEstadoPerfilSeguro(item.id, nuevoEstado)

      setPerfiles(perfiles.map((perfilItem) => perfilItem.id === item.id ? data : perfilItem))
      mostrarMensaje(`Usuario ${nuevoEstado.toLowerCase()} correctamente.`, "exito")
    } catch (error) {
      mostrarErrorSupabase(error, "actualizar el estado del perfil")
    } finally {
      setAccionGuardando("")
    }
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
    setCompras([])
    setColaboradores([])
    setPerfiles([])
    setResponsablesEntrega([])
    setAuditoria([])
    setPestanaActiva("panel")
    mostrarMensaje("Sesión cerrada correctamente.", "exito")
  }

  async function cambiarContrasena(evento) {
    evento.preventDefault()

    if (accionGuardando || !accionPermitida("contrasena", 2500)) return

    const nueva = formularioContrasena.nueva.trim()
    const confirmar = formularioContrasena.confirmar.trim()

    if (nueva.length < 6) {
      mostrarMensaje("La nueva contraseña debe tener al menos 6 caracteres.", "error")
      return
    }

    if (nueva !== confirmar) {
      mostrarMensaje("Las contraseñas no coinciden.", "error")
      return
    }

    setAccionGuardando("contrasena")

    try {
      const { data, error } = await supabase.auth.updateUser({ password: nueva })

      if (error) throw error

      setSesion((actual) => actual ? { ...actual, user: data.user } : actual)
      setFormularioContrasena({ nueva: "", confirmar: "" })
      setMostrarCambioContrasena(false)
      mostrarMensaje("Contraseña actualizada correctamente.", "exito")
    } catch (error) {
      mostrarErrorSupabase(error, "actualizar la contraseña")
    } finally {
      setAccionGuardando("")
    }
  }

  function imagenPerfilReducida(archivo) {
    return new Promise((resolve, reject) => {
      const imagen = new Image()
      const url = URL.createObjectURL(archivo)

      imagen.onload = () => {
        const lado = 180
        const lienzo = document.createElement("canvas")
        const contexto = lienzo.getContext("2d")
        const escala = Math.max(lado / imagen.width, lado / imagen.height)
        const ancho = imagen.width * escala
        const alto = imagen.height * escala

        lienzo.width = lado
        lienzo.height = lado
        contexto.drawImage(imagen, (lado - ancho) / 2, (lado - alto) / 2, ancho, alto)

        const dataUrl = lienzo.toDataURL("image/jpeg", 0.82)

        lienzo.toBlob((blob) => {
          URL.revokeObjectURL(url)

          if (!blob) {
            reject(new Error("No se pudo preparar la imagen."))
            return
          }

          resolve({ blob, dataUrl })
        }, "image/jpeg", 0.82)
      }

      imagen.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error("No se pudo leer la imagen."))
      }

      imagen.src = url
    })
  }

  async function subirAvatarStorage(usuarioId, blob) {
    if (!usuarioId || !blob) return ""

    try {
      const rutaAvatar = `${usuarioId}/avatar.jpg`
      const { error } = await supabase.storage
        .from("avatars")
        .upload(rutaAvatar, blob, {
          cacheControl: "3600",
          contentType: "image/jpeg",
          upsert: true,
        })

      if (error) return ""

      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(rutaAvatar)

      return data?.publicUrl ? `${data.publicUrl}?v=${crypto.randomUUID()}` : ""
    } catch {
      return ""
    }
  }

  async function cambiarFotoPerfil(archivo) {
    if (!archivo || accionGuardando || !accionPermitida("foto-perfil", 2500)) return

    if (!archivo.type.startsWith("image/")) {
      mostrarMensaje("Selecciona una imagen válida para la foto de perfil.", "error")
      return
    }

    setAccionGuardando("foto-perfil")

    try {
      const avatar = await imagenPerfilReducida(archivo)
      const avatarStorageUrl = await subirAvatarStorage(sesion?.user?.id, avatar.blob)
      const avatarUrl = avatarStorageUrl || avatar.dataUrl
      const metadata = {
        ...(sesion?.user?.user_metadata || {}),
        avatar_url: avatarUrl,
      }
      const { data, error } = await supabase.auth.updateUser({ data: metadata })

      if (error) throw error

      setSesion((actual) => actual ? { ...actual, user: data.user } : actual)
      mostrarMensaje("Foto de perfil actualizada.", "exito")
    } catch (error) {
      mostrarErrorSupabase(error, "actualizar la foto de perfil")
    } finally {
      setAccionGuardando("")
    }
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
        tipo: opcionesSeparadas(productoCatalogo?.tipo)[0] ?? "",
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
    if (!requierePermiso(puedeGestionarProductos, "Tu rol no permite modificar el catálogo.")) return
    if (accionGuardando || !accionPermitida("catalogo")) return

    const variantes = itemCatalogo.variantes
      .split(",")
      .map((variante) => textoSeguro(variante, 60))
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

    try {
      validarCamposRequeridos([
        { valor: itemCatalogo.nombre, mensaje: "Escribe el nombre del item." },
        { valor: itemCatalogo.tipo, mensaje: "Escribe el tipo del item." },
      ])
      numeroSeguro(itemCatalogo.stockMinimo || 0, { minimo: 0 })
    } catch (error) {
      mostrarErrorSupabase(error, "validar el catálogo")
      return
    }

    const itemOriginalCatalogo = itemCatalogoEditandoClave
      ? catalogoProductos.find((item) => claveItemCatalogo(item) === itemCatalogoEditandoClave)
      : null
    const stockMinimoCatalogo = esAdministrador
      ? Number(itemCatalogo.stockMinimo)
      : Number(itemOriginalCatalogo?.stockMinimo ?? 0)
    const nuevoItem = {
      categoria: itemCatalogo.categoria,
      nombre: textoSeguro(itemCatalogo.nombre, 160),
      tipo: textoSeguro(itemCatalogo.tipo, 160),
      unidad: itemCatalogo.unidad,
      variantes,
      stockMinimo: stockMinimoCatalogo,
    }

    setAccionGuardando("catalogo")

    try {
      if (itemCatalogoEditandoClave) {
        const itemOriginal = itemOriginalCatalogo

        if (!itemOriginal) {
          mostrarMensaje("No encontró el item original para actualizar.", "error")
          return
        }

        const itemActualizado = await guardarCatalogoProductoRpc({
          catalogoId: itemOriginal.id,
          catalogoPayload: nuevoItem,
        })

        setCatalogoProductos(
          catalogoProductos.map((item) =>
            claveItemCatalogo(item) === itemCatalogoEditandoClave ? itemActualizado : item
          )
        )
        mostrarMensaje("Item actualizado. Los cambios ya aparecen en el formulario de productos.")
      } else {
        const itemCreado = await guardarCatalogoProductoRpc({
          catalogoPayload: nuevoItem,
        })

        setCatalogoProductos([...catalogoProductos, itemCreado])
        mostrarMensaje("Item nuevo creado. Ya aparece en el formulario de productos.")
      }
    } catch (error) {
      mostrarErrorSupabase(error, "guardar el catálogo")
      return
    } finally {
      setAccionGuardando("")
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

  function actualizarCompra(campo, valor) {
    setCompra({
      ...compra,
      [campo]: valor,
    })
  }

  function actualizarLineaCompra(campo, valor) {
    setLineaCompra({
      ...lineaCompra,
      [campo]: valor,
    })
  }

  function agregarLineaCompra() {
    if (!productoLineaCompra) {
      mostrarMensaje("Selecciona un producto existente para agregar a la compra.", "error")
      return
    }

    if (productoLineaCompra.estado !== "Activo") {
      mostrarMensaje("Solo se pueden registrar compras sobre productos activos.", "error")
      return
    }

    let cantidad
    let valorUnitario

    try {
      cantidad = numeroSeguro(lineaCompra.cantidad, { minimo: 1 })
      valorUnitario = lineaCompra.valorUnitario
        ? numeroSeguro(lineaCompra.valorUnitario, { minimo: 0, maximo: 1000000000 })
        : 0
    } catch (error) {
      mostrarErrorSupabase(error, "validar la línea de compra")
      return
    }

    const lineaExistente = lineasCompra.find(
      (linea) => linea.productoId === lineaCompra.productoId
    )

    if (lineaExistente) {
      setLineasCompra(
        lineasCompra.map((linea) => {
          if (linea.productoId !== lineaCompra.productoId) return linea

          return {
            ...linea,
            cantidad: Number(linea.cantidad || 0) + cantidad,
            valorUnitario,
            observacion: textoSeguro(lineaCompra.observacion, 220),
          }
        })
      )
    } else {
      setLineasCompra([
        ...lineasCompra,
        {
          productoId: lineaCompra.productoId,
          cantidad,
          valorUnitario,
          observacion: textoSeguro(lineaCompra.observacion, 220),
        },
      ])
    }

    setLineaCompra(lineaCompraVacia)
  }

  function quitarLineaCompra(productoId) {
    setLineasCompra(
      lineasCompra.filter((linea) => linea.productoId !== productoId)
    )
  }

  function limpiarCompra() {
    setCompra(crearCompraVacia())
    setLineaCompra(lineaCompraVacia)
    setLineasCompra([])
  }

  function compraSegura() {
    validarCamposRequeridos([
      { valor: compra.numeroFactura, mensaje: "Escribe el número de factura." },
      { valor: compra.fecha, mensaje: "Selecciona la fecha de la factura." },
      { valor: compra.proveedor, mensaje: "Escribe el proveedor." },
      { valor: compra.responsable, mensaje: "Selecciona el responsable." },
    ])

    if (!fechaIsoValida(compra.fecha)) {
      throw new ErrorValidacion("La fecha de la compra no es válida.")
    }

    if (lineasCompraDetalle.length === 0) {
      throw new ErrorValidacion("Agrega al menos un producto a la compra.")
    }

    const lineaInvalida = lineasCompraDetalle.find(
      (linea) => !linea.producto || Number(linea.cantidad) <= 0
    )

    if (lineaInvalida) {
      throw new ErrorValidacion("Todas las líneas deben tener producto existente y cantidad mayor a cero.")
    }

    return {
      numeroFactura: textoSeguro(compra.numeroFactura, 80),
      fecha: compra.fecha,
      proveedor: textoSeguro(compra.proveedor, 160),
      responsable: textoSeguro(compra.responsable, 160),
      observacion: textoLargoSeguro(compra.observacion),
    }
  }

  async function registrarCompra(evento) {
    evento.preventDefault()

    if (!requierePermiso(puedeGestionarProductos, "Tu rol no permite registrar compras.")) return
    if (accionGuardando || !accionPermitida("compra", 2500)) return

    let compraPayload

    try {
      compraPayload = compraSegura()
    } catch (error) {
      mostrarErrorSupabase(error, "validar la compra")
      return
    }

    setAccionGuardando("compra")

    try {
      const resultado = await registrarCompraRpc({
        compra: compraPayload,
        lineasCompraDetalle,
      })

      if (!resultado.compra) {
        throw new Error("No se recibió la compra registrada.")
      }

      const productosActualizados = new Map(
        resultado.productos.map((producto) => [String(producto.id), producto])
      )

      setProductos(
        productos.map((producto) =>
          productosActualizados.get(String(producto.id)) || producto
        )
      )
      setMovimientos([...resultado.movimientos, ...movimientos])
      setCompras([resultado.compra, ...compras])
      limpiarCompra()
      mostrarMensaje(`Compra registrada correctamente. Factura: ${resultado.compra.numeroFactura}`, "exito")
    } catch (error) {
      mostrarErrorSupabase(error, "registrar la compra")
    } finally {
      setAccionGuardando("")
    }
  }

  function claveProductoInventario(item) {
    return [
      item.categoria,
      item.nombre || item.producto,
      item.tipo,
      item.variante,
      item.unidad,
    ].map(normalizarTexto).join("__")
  }

  function claveProductoCompra(item) {
    return [
      item.categoria,
      item.producto || item.nombre,
      item.tipo,
      item.variante,
      item.unidad,
    ].map(normalizarTexto).join("__")
  }

  async function importarProductos(evento) {
    if (!requierePermiso(puedeGestionarProductos, "Tu rol no permite importar productos.")) {
      evento.target.value = ""
      return
    }

    if (accionGuardando || !accionPermitida("importar-productos", 3000)) {
      evento.target.value = ""
      return
    }

    const archivo = evento.target.files?.[0]

    if (!archivo) return

    const nombreArchivo = archivo.name.toLowerCase()

    if (!nombreArchivo.endsWith(".csv") && !nombreArchivo.endsWith(".xlsx")) {
      mostrarMensaje("Selecciona un archivo CSV o XLSX de productos.", "error")
      evento.target.value = ""
      return
    }

    if (archivo.size > 5 * 1024 * 1024) {
      mostrarMensaje("El archivo de productos supera el máximo permitido de 5 MB.", "error")
      evento.target.value = ""
      return
    }

    setAccionGuardando("importar-productos")

    try {
      const filas = await leerFilasProducto(archivo)

      if (filas.length === 0) {
        throw new ErrorValidacion("El archivo no tiene productos válidos.")
      }

      const errores = []
      const productosImportados = filas.map((fila) => {
        const categoriaEntrada = textoSeguro(fila.categoria || "Dotación", 80)
        const categoriaNormalizada = normalizarTexto(categoriaEntrada)
        const categoria = categoriaNormalizada === "epp" ? "EPP" : "Dotación"
        const nombre = textoSeguro(fila.nombre, 160)
        const tipo = textoSeguro(fila.tipo, 160)
        const variante = textoSeguro(fila.variante || "Única", 120)
        const unidad = textoSeguro(fila.unidad || "Unidad", 40)
        const ubicacion = textoSeguro(fila.ubicacion || "Bodega GH", 160)
        const estadoEntrada = textoSeguro(fila.estado || "Activo", 20)
        const estado = normalizarTexto(estadoEntrada) === "inactivo" ? "Inactivo" : "Activo"
        const stockActual = fila.stockActual === "" ? 0 : Number(fila.stockActual)
        const stockMinimo = fila.stockMinimo === "" ? 0 : Number(fila.stockMinimo)
        const motivoEntrada = textoSeguro(fila.motivoEntrada || "Importación Excel", 80)
        const observacion = textoLargoSeguro(fila.observacion || `Importación de productos: ${archivo.name}`)

        if (!["dotacion", "epp"].includes(categoriaNormalizada)) errores.push(`Fila ${fila.fila}: categoría debe ser Dotación o EPP.`)
        if (!nombre) errores.push(`Fila ${fila.fila}: falta producto.`)
        if (!tipo) errores.push(`Fila ${fila.fila}: falta tipo.`)
        if (!Number.isFinite(stockActual) || stockActual < 0) errores.push(`Fila ${fila.fila}: stock inválido.`)
        if (!Number.isFinite(stockMinimo) || stockMinimo < 0) errores.push(`Fila ${fila.fila}: stock mínimo inválido.`)
        if (!["activo", "inactivo"].includes(normalizarTexto(estadoEntrada))) errores.push(`Fila ${fila.fila}: estado debe ser Activo o Inactivo.`)
        if (stockActual > 0 && !esAdministrador) errores.push(`Fila ${fila.fila}: solo un administrador puede importar entradas de stock.`)

        return {
          categoria,
          nombre,
          tipo,
          variante,
          unidad,
          ubicacion,
          estado,
          stockActual,
          stockMinimo,
          motivoEntrada,
          observacion,
        }
      })

      const productosUnicos = Array.from(
        new Map(productosImportados.map((item) => [claveProductoInventario(item), item])).values()
      )

      if (errores.length > 0) {
        throw new ErrorValidacion(`Importación detenida. ${errores.slice(0, 8).join(" ")}`)
      }

      const productosPorClave = new Map(productos.map((item) => [claveProductoInventario(item), item]))
      const catalogoPorClave = new Map(catalogoProductos.map((item) => [claveItemCatalogo(item), item]))
      const productosGuardados = new Map(productos.map((item) => [String(item.id), item]))
      const movimientosCreados = []
      let creados = 0
      let actualizados = 0

      for (const item of productosUnicos) {
        const claveCatalogo = claveItemCatalogo(item)
        const itemCatalogoActual = catalogoPorClave.get(claveCatalogo)
        const tiposCatalogo = opcionesSeparadas(itemCatalogoActual?.tipo)
        const tipoCatalogo = tiposCatalogo.includes(item.tipo)
          ? itemCatalogoActual.tipo
          : [...tiposCatalogo, item.tipo].filter(Boolean).join(", ")
        const variantesCatalogo = Array.from(new Set([
          ...(itemCatalogoActual?.variantes || []),
          item.variante,
        ].filter(Boolean)))
        const catalogoPayload = {
          categoria: item.categoria,
          nombre: item.nombre,
          tipo: tipoCatalogo || item.tipo,
          unidad: item.unidad,
          variantes: variantesCatalogo,
          stockMinimo: esAdministrador
            ? item.stockMinimo
            : Number(itemCatalogoActual?.stockMinimo ?? 0),
        }

        const catalogoGuardado = await guardarCatalogoProductoRpc({
          catalogoId: itemCatalogoActual?.id || null,
          catalogoPayload,
        })

        catalogoPorClave.set(claveCatalogo, catalogoGuardado)

        const existente = productosPorClave.get(claveProductoInventario(item))
        const movimientoEntrada = item.stockActual > 0
          ? {
              id: crypto.randomUUID(),
              productoId: existente?.id || "",
              producto: item.nombre,
              variante: item.variante,
              unidad: item.unidad,
              tipoMovimiento: "Entrada",
              cantidad: item.stockActual,
              fecha: fechaLocalISO(),
              observacion: item.observacion || item.motivoEntrada,
              stockResultante: existente
                ? Number(existente.stockActual || 0) + item.stockActual
                : item.stockActual,
            }
          : null

        const productoPayload = {
          nombre: item.nombre,
          categoria: item.categoria,
          tipo: item.tipo,
          variante: item.variante,
          unidad: item.unidad,
          stockMinimo: esAdministrador
            ? item.stockMinimo
            : Number(existente?.stockMinimo ?? catalogoGuardado.stockMinimo ?? 0),
          ubicacion: item.ubicacion,
          estado: item.estado,
        }

        if (!existente) {
          productoPayload.stockActual = item.stockActual
        }

        const { producto: productoGuardado, movimiento: movimientoCreado } = await guardarProductoMovimientoRpc({
          productoId: existente?.id || null,
          productoPayload,
          movimiento: movimientoEntrada,
        })

        productosGuardados.set(String(productoGuardado.id), productoGuardado)
        productosPorClave.set(claveProductoInventario(productoGuardado), productoGuardado)
        if (movimientoCreado) movimientosCreados.push(movimientoCreado)
        if (existente) actualizados += 1
        else creados += 1
      }

      setCatalogoProductos(
        Array.from(catalogoPorClave.values()).sort((a, b) =>
          `${a.categoria} ${a.nombre}`.localeCompare(`${b.categoria} ${b.nombre}`)
        )
      )
      setProductos(
        Array.from(productosGuardados.values()).sort((a, b) =>
          `${a.nombre} ${a.tipo} ${a.variante}`.localeCompare(`${b.nombre} ${b.tipo} ${b.variante}`)
        )
      )
      setMovimientos([...movimientosCreados, ...movimientos])
      mostrarMensaje(`Importación lista. Productos nuevos: ${creados}. Actualizados: ${actualizados}.`, "exito")
    } catch (error) {
      mostrarErrorSupabase(error, "importar productos")
    } finally {
      setAccionGuardando("")
      evento.target.value = ""
    }
  }

  async function importarCompras(evento) {
    if (!requierePermiso(puedeGestionarProductos, "Tu rol no permite importar compras.")) {
      evento.target.value = ""
      return
    }

    const archivo = evento.target.files?.[0]

    if (!archivo) return

    const nombreArchivo = archivo.name.toLowerCase()

    if (!nombreArchivo.endsWith(".csv") && !nombreArchivo.endsWith(".xlsx")) {
      mostrarMensaje("Selecciona un archivo CSV o XLSX de compras.", "error")
      evento.target.value = ""
      return
    }

    if (archivo.size > 5 * 1024 * 1024) {
      mostrarMensaje("El archivo de compras supera el máximo permitido de 5 MB.", "error")
      evento.target.value = ""
      return
    }

    setAccionGuardando("importar-compras")

    try {
      const filas = await leerFilasCompra(archivo)

      if (filas.length === 0) {
        throw new ErrorValidacion("El archivo no tiene líneas de compra válidas.")
      }

      const productosIndice = new Map(
        productos.map((producto) => [claveProductoCompra(producto), producto])
      )
      const facturasExistentes = new Set(compras.map((item) => normalizarTexto(item.numeroFactura)))
      const errores = []
      const grupos = new Map()

      filas.forEach((fila) => {
        const cantidad = Number(fila.cantidad)
        const valorUnitario = fila.valorUnitario ? Number(fila.valorUnitario) : 0
        const producto = productosIndice.get(claveProductoCompra(fila))

        if (!fila.factura) errores.push(`Fila ${fila.fila}: falta factura.`)
        if (!fechaIsoValida(fila.fecha)) errores.push(`Fila ${fila.fila}: fecha inválida.`)
        if (!fila.proveedor) errores.push(`Fila ${fila.fila}: falta proveedor.`)
        if (!fila.responsable) errores.push(`Fila ${fila.fila}: falta responsable.`)
        if (!producto) errores.push(`Fila ${fila.fila}: el producto no coincide con un producto existente.`)
        if (producto && producto.estado !== "Activo") errores.push(`Fila ${fila.fila}: el producto está inactivo.`)
        if (!Number.isFinite(cantidad) || cantidad <= 0) errores.push(`Fila ${fila.fila}: cantidad inválida.`)
        if (!Number.isFinite(valorUnitario) || valorUnitario < 0) errores.push(`Fila ${fila.fila}: valor unitario inválido.`)
        if (facturasExistentes.has(normalizarTexto(fila.factura))) errores.push(`Fila ${fila.fila}: la factura ya existe.`)

        const claveFactura = normalizarTexto(fila.factura)

        if (!grupos.has(claveFactura)) {
          grupos.set(claveFactura, {
            compra: {
              numeroFactura: textoSeguro(fila.factura, 80),
              fecha: fila.fecha,
              proveedor: textoSeguro(fila.proveedor, 160),
              responsable: textoSeguro(fila.responsable, 160),
              observacion: textoLargoSeguro(fila.observacion),
            },
            lineas: [],
          })
        }

        const grupo = grupos.get(claveFactura)

        if (
          grupo.compra.fecha !== fila.fecha ||
          normalizarTexto(grupo.compra.proveedor) !== normalizarTexto(fila.proveedor) ||
          normalizarTexto(grupo.compra.responsable) !== normalizarTexto(fila.responsable)
        ) {
          errores.push(`Fila ${fila.fila}: los datos de la factura no coinciden con otras líneas de la misma factura.`)
        }

        if (producto) {
          grupo.lineas.push({
            producto,
            cantidad,
            valorUnitario,
            observacion: textoSeguro(fila.observacion, 220),
          })
        }
      })

      if (errores.length > 0) {
        throw new ErrorValidacion(`Importación detenida. ${errores.slice(0, 6).join(" ")}`)
      }

      const comprasCreadas = []
      const movimientosCreados = []
      const productosActualizados = new Map()

      for (const grupo of grupos.values()) {
        const resultado = await registrarCompraRpc({
          compra: grupo.compra,
          lineasCompraDetalle: grupo.lineas,
        })

        if (resultado.compra) comprasCreadas.push(resultado.compra)
        movimientosCreados.push(...resultado.movimientos)
        resultado.productos.forEach((producto) => {
          productosActualizados.set(String(producto.id), producto)
        })
      }

      setProductos(
        productos.map((producto) =>
          productosActualizados.get(String(producto.id)) || producto
        )
      )
      setMovimientos([...movimientosCreados, ...movimientos])
      setCompras([...comprasCreadas, ...compras])
      mostrarMensaje(`Importación lista. Compras registradas: ${comprasCreadas.length}.`, "exito")
    } catch (error) {
      mostrarErrorSupabase(error, "importar compras")
    } finally {
      setAccionGuardando("")
      evento.target.value = ""
    }
  }

  async function adjuntarFacturaCompra(compraItem, archivo) {
    if (!archivo || accionGuardando) return
    if (!requierePermiso(puedeGestionarProductos, "Tu rol no permite adjuntar facturas.")) return

    const tipoFactura = obtenerTipoFactura(archivo)
    const tipoPermitido = tipoFactura === "application/pdf" || tipoFactura.startsWith("image/")

    if (!tipoPermitido) {
      mostrarMensaje("Adjunta una factura en PDF o imagen.", "error")
      return
    }

    if (archivo.size > 8 * 1024 * 1024) {
      mostrarMensaje("La factura supera el máximo permitido de 8 MB.", "error")
      return
    }

    setAccionGuardando(`factura-${compraItem.id}`)

    try {
      const nombreSeguro = nombreArchivoFactura(compraItem, archivo)
      const ruta = `${compraItem.id}/${nombreSeguro}`
      const { error: errorStorage } = await supabase.storage
        .from(BUCKET_FACTURAS_COMPRAS)
        .upload(ruta, archivo, {
          cacheControl: "3600",
          contentType: tipoFactura,
          upsert: false,
        })

      if (errorStorage) throw errorStorage

      const compraActualizada = await adjuntarFacturaCompraRpc({
        compraId: compraItem.id,
        facturaRuta: ruta,
        facturaUrl: "",
      })

      setCompras(
        compras.map((item) => item.id === compraActualizada.id ? compraActualizada : item)
      )
      mostrarMensaje("Factura adjuntada correctamente.", "exito")
    } catch (error) {
      mostrarErrorSupabase(error, "adjuntar la factura")
    } finally {
      setAccionGuardando("")
    }
  }

  async function abrirFacturaCompra(compraItem) {
    if (!facturaCompraVisible(compraItem)) {
      mostrarMensaje("Esta compra todavía no tiene factura adjunta.", "error")
      return
    }

    const ventanaFactura = window.open("", "_blank")
    if (ventanaFactura) {
      ventanaFactura.opener = null
    }
    const rutaFactura = normalizarRutaFacturaCompra(compraItem.facturaRuta)

    if (rutaFactura) {
      const { data, error } = await supabase.storage
        .from(BUCKET_FACTURAS_COMPRAS)
        .createSignedUrl(rutaFactura, 3600)

      if (error || !data?.signedUrl) {
        ventanaFactura?.close()
        mostrarErrorSupabase(error, "abrir la factura")
        return
      }

      if (ventanaFactura) {
        ventanaFactura.location.href = data.signedUrl
      } else {
        mostrarMensaje("El navegador bloqueó la ventana de la factura. Permite ventanas emergentes para esta app.", "error")
      }
      return
    }

    if (ventanaFactura) {
      ventanaFactura.location.href = compraItem.facturaUrl
    } else {
      mostrarMensaje("El navegador bloqueó la ventana de la factura. Permite ventanas emergentes para esta app.", "error")
    }
  }

  function abrirCompra(compraItem) {
    const abierta = abrirComprobanteCompra(compraItem)

    if (!abierta) {
      mostrarMensaje("El navegador bloqueó la ventana de la compra. Permite ventanas emergentes para esta app.")
    }
  }

  async function eliminarCompra(compraItem) {
    if (!requierePermiso(puedeGestionarProductos, "Tu rol no permite eliminar compras.")) return
    if (accionGuardando || !accionPermitida(`eliminar-compra-${compraItem.id}`, 2500)) return

    const totalItemsCompra = (compraItem.lineas || []).reduce(
      (total, linea) => total + Number(linea.cantidad || 0),
      0
    )
    const confirmar = window.confirm(
      `¿Seguro que quieres eliminar la compra ${compraItem.numeroFactura}? Se descontarán ${totalItemsCompra} ítems del inventario.`
    )

    if (!confirmar) return

    setAccionGuardando(`eliminar-compra-${compraItem.id}`)

    try {
      const resultado = await eliminarCompraRpc(compraItem.id)

      if (resultado.facturaRuta) {
        await supabase.storage
          .from(BUCKET_FACTURAS_COMPRAS)
          .remove([normalizarRutaFacturaCompra(resultado.facturaRuta)])
      }

      const productosActualizados = new Map(
        resultado.productos.map((producto) => [String(producto.id), producto])
      )

      setProductos(
        productos.map((producto) =>
          productosActualizados.get(String(producto.id)) || producto
        )
      )
      setMovimientos([...resultado.movimientos, ...movimientos])
      setCompras(compras.filter((item) => item.id !== resultado.compraId))
      if (compraExpandidaId === resultado.compraId) {
        setCompraExpandidaId("")
      }
      mostrarMensaje("Compra eliminada y stock ajustado correctamente.", "exito")
    } catch (error) {
      mostrarErrorSupabase(error, "eliminar la compra")
    } finally {
      setAccionGuardando("")
    }
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
      entregas.some((item) => item.productoId === producto.id) ||
      compras.some((compraItem) =>
        compraItem.lineas?.some((linea) => linea.productoId === producto.id)
      )

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
    if (!requierePermiso(esAdministrador, "Solo un administrador puede eliminar productos del todo.")) return
    if (accionGuardando || !accionPermitida(`eliminar-producto-${idProducto}`, 2500)) return

    const producto = productos.find((item) => item.id === idProducto)
    const confirmar = window.confirm(
      `¿Seguro que quieres eliminar definitivamente ${producto?.nombre || "este producto"}? También se borrarán sus movimientos y entregas asociadas.`
    )

    if (!confirmar) return

    setAccionGuardando(`eliminar-producto-${idProducto}`)

    try {
      await eliminarProductoAdminRpc(idProducto)

      setProductos(productos.filter((item) => item.id !== idProducto))
      setMovimientos(movimientos.filter((item) => item.productoId !== idProducto))
      setEntregas(entregas.filter((item) => item.productoId !== idProducto))
      mostrarMensaje("Producto eliminado definitivamente.", "exito")
    } catch (error) {
      mostrarErrorSupabase(error, "eliminar el producto")
    } finally {
      setAccionGuardando("")
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
    if (!requierePermiso(puedeGestionarColaboradores, "Tu rol no permite eliminar o retirar colaboradores.")) return
    if (accionGuardando || !accionPermitida(`eliminar-colaborador-${idColaborador}`, 2500)) return

    const colaboradorTieneEntregas = entregas.some(
      (item) => item.colaboradorId === idColaborador
    )

    if (colaboradorTieneEntregas) {
      const confirmarRetirar = window.confirm("Este colaborador ya tiene entregas. Para conservar el historial no se puede eliminar. ¿Quieres marcarlo como retirado?")

      if (confirmarRetirar) {
        setAccionGuardando(`eliminar-colaborador-${idColaborador}`)

        try {
          const resultado = await eliminarColaboradorRpc(idColaborador)
          const colaboradorActualizado = resultado.colaborador

          if (!colaboradorActualizado) {
            throw new Error("No se recibió el colaborador actualizado.")
          }

          setColaboradores(
            colaboradores.map((item) =>
              item.id === idColaborador ? colaboradorActualizado : item
            )
          )
          mostrarMensaje("Colaborador marcado como retirado.", "exito")
        } catch (error) {
          mostrarErrorSupabase(error, "retirar el colaborador")
        } finally {
          setAccionGuardando("")
        }
      }

      return
    }

    const confirmar = window.confirm("¿Seguro que quieres eliminar este colaborador?")

    if (confirmar) {
      setAccionGuardando(`eliminar-colaborador-${idColaborador}`)

      try {
        await eliminarColaboradorRpc(idColaborador)

        setColaboradores(colaboradores.filter((item) => item.id !== idColaborador))
        mostrarMensaje("Colaborador eliminado correctamente.", "exito")
      } catch (error) {
        mostrarErrorSupabase(error, "eliminar el colaborador")
      } finally {
        setAccionGuardando("")
      }
    }
  }

  async function registrarProducto(evento) {
    evento.preventDefault()
    if (!requierePermiso(puedeGestionarProductos, "Tu rol no permite registrar o editar productos.")) return
    if (accionGuardando || !accionPermitida("producto")) return

    try {
      validarCamposRequeridos([
        { valor: formulario.nombre, mensaje: "Selecciona o escribe el nombre del producto." },
        { valor: formulario.tipo, mensaje: "Selecciona o escribe el tipo del producto." },
        { valor: formulario.variante, mensaje: "Selecciona o escribe la variante del producto." },
        { valor: formulario.ubicacion, mensaje: "Escribe la ubicación del producto." },
      ])
      numeroSeguro(esAdministrador ? formulario.stockActual : 0, { minimo: 0 })
      numeroSeguro(esAdministrador ? formulario.stockMinimo : productoEditando?.stockMinimo ?? obtenerStockMinimo(productoSeleccionado) ?? 0, { minimo: 0 })
    } catch (error) {
      mostrarErrorSupabase(error, "validar el producto")
      return
    }

    const cantidadEntrada = esAdministrador ? Number(formulario.stockActual) : 0
    const motivoEntrada = textoSeguro(formulario.motivoEntrada || "Compra", 80)
    const observacionEntrada = formulario.observacionEntrada
      ? textoLargoSeguro(`${motivoEntrada}: ${formulario.observacionEntrada}`)
      : motivoEntrada
    const stockMinimoProducto = esAdministrador
      ? Number(formulario.stockMinimo)
      : Number(productoEditando?.stockMinimo ?? obtenerStockMinimo(productoSeleccionado) ?? 0)
    const datosProducto = {
      nombre: textoSeguro(formulario.nombre, 160),
      categoria: formulario.categoria,
      tipo: textoSeguro(formulario.tipo, 160),
      variante: textoSeguro(formulario.variante, 120),
      unidad: formulario.unidad,
      stockMinimo: stockMinimoProducto,
      ubicacion: textoSeguro(formulario.ubicacion, 160),
      estado: formulario.estado,
    }

    setAccionGuardando("producto")

    try {
      if (productoEditandoId) {
        const stockEditado = Number(formulario.stockActual)

        if (esAdministrador && (!Number.isFinite(stockEditado) || stockEditado < 0)) {
          mostrarMensaje("El stock debe ser un número válido mayor o igual a cero.", "error")
          return
        }

        if (productoEditandoTieneHistorial && productoEditando) {
          const cambioDatoSensible = ["nombre", "categoria", "tipo", "variante", "unidad"].some(
            (campo) => datosProducto[campo] !== productoEditando[campo]
          )

          if (cambioDatoSensible) {
            mostrarMensaje("No se pueden cambiar nombre, categoría, tipo, variante o unidad cuando el producto ya tiene historial.", "error")
            return
          }
        }

        const diferenciaStock = esAdministrador && productoEditando
          ? stockEditado - Number(productoEditando.stockActual)
          : 0
        const movimientoAjuste = diferenciaStock !== 0 && productoEditando
          ? {
            id: crypto.randomUUID(),
            productoId: productoEditando.id,
            producto: productoEditando.nombre,
            variante: productoEditando.variante,
            unidad: productoEditando.unidad,
            tipoMovimiento: diferenciaStock > 0 ? "Ajuste positivo" : "Ajuste negativo",
            cantidad: Math.abs(diferenciaStock),
            fecha: fechaLocalISO(),
            observacion: `Ajuste administrativo de stock: ${productoEditando.stockActual} a ${stockEditado}`,
            stockResultante: stockEditado,
          }
          : null

        const {
          producto: productoActualizado,
          movimiento: movimientoCreado,
        } = await guardarProductoMovimientoRpc({
          productoId: productoEditandoId,
          productoPayload: datosProducto,
          movimiento: movimientoAjuste,
        })

        setProductos(
          productos.map((producto) =>
            producto.id === productoEditandoId ? productoActualizado : producto
          )
        )
        if (movimientoCreado) {
          setMovimientos([movimientoCreado, ...movimientos])
        }
        setProductoEditandoId(null)
        setFormulario(formularioVacio)
        mostrarMensaje("Producto actualizado correctamente.", "exito")
        return
      }

      const productoExistente = productos.find(
        (producto) =>
          producto.categoria === formulario.categoria &&
          producto.nombre === formulario.nombre &&
          producto.tipo === formulario.tipo &&
          producto.variante === formulario.variante &&
          producto.unidad === formulario.unidad
      )

      if (productoExistente) {
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
            stockResultante: productoExistente.stockActual,
          }
          : null

        const {
          producto: productoActualizado,
          movimiento: movimientoCreado,
        } = await guardarProductoMovimientoRpc({
          productoId: productoExistente.id,
          productoPayload: {
            ...datosProducto,
          },
          movimiento: nuevoMovimiento,
        })

        setProductos(
          productos.map((producto) =>
            producto.id === productoExistente.id ? productoActualizado : producto
          )
        )
        if (movimientoCreado) {
          setMovimientos([movimientoCreado, ...movimientos])
        }
        mostrarMensaje("El producto ya existe. Se sumó la cantidad al stock actual.")
      } else {
        const {
          producto: nuevoProducto,
          movimiento: movimientoCreado,
        } = await guardarProductoMovimientoRpc({
          productoPayload: {
            ...datosProducto,
            stockActual: cantidadEntrada,
          },
          movimiento: cantidadEntrada > 0
            ? {
                id: crypto.randomUUID(),
                productoId: "",
                producto: datosProducto.nombre,
                variante: datosProducto.variante,
                unidad: datosProducto.unidad,
                tipoMovimiento: "Entrada",
                cantidad: cantidadEntrada,
                fecha: fechaLocalISO(),
                observacion: observacionEntrada,
                stockResultante: cantidadEntrada,
              }
            : null,
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
    } finally {
      setAccionGuardando("")
    }
  }

  async function registrarMovimiento(evento) {
    evento.preventDefault()
    if (!requierePermiso(puedeGestionarMovimientos, "Tu rol no permite registrar movimientos de inventario.")) return
    if (accionGuardando || !accionPermitida("movimiento")) return

    if (!productoMovimiento) {
      mostrarMensaje("Selecciona un producto para registrar el movimiento.")
      return
    }

    if (productoMovimiento.estado === "Inactivo") {
      mostrarMensaje("No se pueden registrar movimientos sobre un producto inactivo.", "error")
      return
    }

    const cantidad = Number(movimiento.cantidad)
    const observacionMovimiento = textoLargoSeguro(movimiento.observacion)
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

    if (!fechaIsoValida(movimiento.fecha)) {
      mostrarMensaje("Selecciona una fecha válida.", "error")
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

    setAccionGuardando("movimiento")

    try {
      const {
        producto: productoActualizado,
        movimiento: movimientoCreado,
      } = await guardarProductoMovimientoRpc({
        productoId: productoMovimiento.id,
        productoPayload: {
          nombre: productoMovimiento.nombre,
          categoria: productoMovimiento.categoria,
          tipo: productoMovimiento.tipo,
          variante: productoMovimiento.variante,
          unidad: productoMovimiento.unidad,
          stockMinimo: productoMovimiento.stockMinimo,
          ubicacion: productoMovimiento.ubicacion,
          estado: productoMovimiento.estado,
        },
        movimiento: nuevoMovimiento,
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
    } finally {
      setAccionGuardando("")
    }
  }

  async function registrarColaborador(evento) {
    evento.preventDefault()
    if (!requierePermiso(puedeGestionarColaboradores, "Tu rol no permite registrar o editar colaboradores.")) return
    if (accionGuardando || !accionPermitida("colaborador")) return

    const colaboradorSeguro = {
      ...colaborador,
      identificacion: textoSeguro(colaborador.identificacion, 40),
      nombreCompleto: textoSeguro(colaborador.nombreCompleto, 160),
      cargo: textoSeguro(colaborador.cargo, 120),
      subArea: textoSeguro(colaborador.subArea, 120),
      grupo: textoSeguro(colaborador.grupo, 40),
      centroCostos: textoSeguro(colaborador.centroCostos, 40),
      nombreCentroCostos: textoSeguro(colaborador.nombreCentroCostos, 160),
      sexo: textoSeguro(colaborador.sexo, 40),
      tallaAntifluido: textoSeguro(colaborador.tallaAntifluido, 20),
      tallaBata: textoSeguro(colaborador.tallaBata, 20),
      tallaCamisa: textoSeguro(colaborador.tallaCamisa, 20),
      tallaPantalon: textoSeguro(colaborador.tallaPantalon, 20),
      tallaBotas: textoSeguro(colaborador.tallaBotas, 20),
    }

    try {
      validarCamposRequeridos([
        { valor: colaboradorSeguro.identificacion, mensaje: "Escribe la identificación del colaborador." },
        { valor: colaboradorSeguro.nombreCompleto, mensaje: "Escribe el nombre del colaborador." },
        { valor: colaboradorSeguro.centroCostos, mensaje: "Selecciona el centro de costos." },
      ])
    } catch (error) {
      mostrarErrorSupabase(error, "validar el colaborador")
      return
    }

    const colaboradorExistente = colaboradores.find(
      (item) =>
        item.identificacion === colaboradorSeguro.identificacion &&
        item.id !== colaboradorEditandoId
    )

    if (colaboradorExistente) {
      mostrarMensaje("Ya existe un colaborador con esa identificación.", "error")
      return
    }

    setAccionGuardando("colaborador")

    try {
      if (colaboradorEditandoId) {
        if (
          colaboradorEditandoTieneHistorial &&
          colaboradorEditando &&
          colaboradorSeguro.identificacion !== colaboradorEditando.identificacion
        ) {
          mostrarMensaje("No se puede cambiar la identificación de un colaborador con entregas registradas.", "error")
          return
        }

        const colaboradorActualizado = await guardarColaboradorRpc({
          colaboradorId: colaboradorEditandoId,
          colaboradorPayload: colaboradorSeguro,
        })

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

      const colaboradorCreado = await guardarColaboradorRpc({
        colaboradorPayload: colaboradorSeguro,
      })

      setColaboradores([...colaboradores, colaboradorCreado])
      setColaborador(colaboradorVacio)
      mostrarMensaje("Colaborador registrado correctamente.", "exito")
    } catch (error) {
      mostrarErrorSupabase(error, "guardar el colaborador")
    } finally {
      setAccionGuardando("")
    }
  }

  async function registrarEntrega(evento) {
    evento.preventDefault()
    if (!requierePermiso(puedeGestionarEntregas, "Tu rol no permite registrar entregas.")) return
    if (accionGuardando || !accionPermitida("entrega", 1800)) return

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

    if (!fechaIsoValida(entrega.fecha)) {
      mostrarMensaje("Selecciona una fecha válida para la entrega.", "error")
      return
    }

    if (!textoSeguro(entrega.responsable, 160)) {
      mostrarMensaje("Selecciona el responsable de la entrega.", "error")
      return
    }

    if (["Deterioro", "Cambio de talla", "Pérdida"].includes(entrega.motivo) && textoLargoSeguro(entrega.observacion).length < 8) {
      mostrarMensaje("Para deterioro, cambio de talla o pérdida debes escribir una observación clara.", "error")
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

    if (entregaTieneDotacion && alertaDotacionEntrega?.tipo === "error") {
      const confirmarDotacion = window.confirm(`${alertaDotacionEntrega.texto}\n\n¿Quieres registrar la entrega de todas formas?`)

      if (!confirmarDotacion) return
    }

    setAccionGuardando("entrega")

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
    } finally {
      setAccionGuardando("")
    }
  }

  function anularEntrega(entregaId) {
    if (!requierePermiso(puedeGestionarEntregas, "Tu rol no permite anular comprobantes.")) return
    if (accionGuardando) return

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

    const totalDevuelto = entregasComprobante.reduce(
      (total, item) => total + Number(item.cantidad || 0),
      0
    )

    setMotivoAnulacion("")
    setAnulacionPendiente({
      entregaId,
      entregaSeleccionada,
      lineas: entregasComprobante,
      totalDevuelto,
    })
  }

  function cancelarAnulacion() {
    if (accionGuardando) return

    setAnulacionPendiente(null)
    setMotivoAnulacion("")
  }

  async function confirmarAnulacion(evento) {
    evento.preventDefault()

    if (!anulacionPendiente) {
      return
    }

    const motivo = motivoAnulacion.trim()

    if (motivo.length < 8) {
      mostrarMensaje("La anulación necesita un motivo claro de al menos 8 caracteres.", "error")
      return
    }

    const { entregaId, entregaSeleccionada } = anulacionPendiente

    if (!accionPermitida(`anular-${entregaId}`, 2500)) return

    setAccionGuardando(`anular-${entregaId}`)

    try {
      const anulacion = await anularComprobanteRpc({
        entregaId,
        motivoAnulacion: textoLargoSeguro(motivo),
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
      setAnulacionPendiente(null)
      setMotivoAnulacion("")
      mostrarMensaje("Comprobante anulado y stock devuelto correctamente.", "exito")
    } catch (error) {
      mostrarErrorSupabase(error, "anular el comprobante")
    } finally {
      setAccionGuardando("")
    }
  }

  function abrirComprobante(entregaSeleccionada) {
    const comprobanteAbierto = abrirComprobanteEntrega({
      entregaSeleccionada,
      entregas,
    })

    if (!comprobanteAbierto) {
      mostrarMensaje("El navegador bloqueó la ventana del comprobante. Permite ventanas emergentes para esta app.")
    }
  }

  function resumirAuditoria(item) {
    const detalle = item.detalle || {}
    const nuevo = detalle.nuevo || {}
    const anterior = detalle.anterior || {}
    const nombre = nuevo.nombre || nuevo.nombre_completo || nuevo.producto || anterior.nombre || anterior.nombre_completo || anterior.producto
    const identificador = nombre || item.registro_id || "-"

    if (item.accion === "INSERT") return `Creó ${identificador}`
    if (item.accion === "UPDATE") return `Actualizó ${identificador}`
    if (item.accion === "DELETE") return `Eliminó ${identificador}`

    return identificador
  }


  function exportarProductos() {
    descargarXlsx("productos-msl.xlsx", [{
      nombre: "Productos",
      columnas: [
      { titulo: "Producto", campo: "nombre" },
      { titulo: "Categoría", campo: "categoria" },
      { titulo: "Tipo", campo: "tipo" },
      { titulo: "Variante", campo: "variante" },
      { titulo: "Unidad", campo: "unidad" },
      { titulo: "Stock actual", campo: "stockActual" },
      { titulo: "Stock Mínimo", campo: "stockMinimo" },
      { titulo: "Ubicación", campo: "ubicacion" },
      { titulo: "Estado", campo: "estado" },
      ],
      filas: productos,
    }])
  }

  function exportarFormatoCompra() {
    const productoEjemplo = productos.find((producto) => producto.estado === "Activo") || productos[0]
    const columnasCompra = [
      { titulo: "factura", campo: "factura" },
      { titulo: "fecha", campo: "fecha" },
      { titulo: "proveedor", campo: "proveedor" },
      { titulo: "responsable", campo: "responsable" },
      { titulo: "categoria", campo: "categoria" },
      { titulo: "producto", campo: "producto" },
      { titulo: "tipo", campo: "tipo" },
      { titulo: "variante", campo: "variante" },
      { titulo: "unidad", campo: "unidad" },
      { titulo: "cantidad", campo: "cantidad" },
      { titulo: "valor unitario", campo: "valorUnitario" },
      { titulo: "observacion", campo: "observacion" },
    ]
    const filasReferencia = productos
      .slice()
      .sort((a, b) =>
        `${a.categoria} ${a.nombre} ${a.tipo} ${a.variante}`.localeCompare(`${b.categoria} ${b.nombre} ${b.tipo} ${b.variante}`)
      )
      .map((producto) => ({
        categoria: producto.categoria,
        producto: producto.nombre,
        tipo: producto.tipo,
        variante: producto.variante,
        unidad: producto.unidad,
        stockActual: producto.stockActual,
        estado: producto.estado,
      }))

    descargarXlsx("formato-compra-msl.xlsx", [
      {
        nombre: "Compra",
        columnas: columnasCompra,
        filas: [{
          factura: "FAC-001",
          fecha: fechaLocalISO(),
          proveedor: "Proveedor",
          responsable: perfil?.nombre || "",
          categoria: productoEjemplo?.categoria || "",
          producto: productoEjemplo?.nombre || "",
          tipo: productoEjemplo?.tipo || "",
          variante: productoEjemplo?.variante || "",
          unidad: productoEjemplo?.unidad || "",
          cantidad: 1,
          valorUnitario: 0,
          observacion: "",
        }],
      },
      {
        nombre: "Datos creados",
        columnas: [
          { titulo: "categoria", campo: "categoria" },
          { titulo: "producto", campo: "producto" },
          { titulo: "tipo", campo: "tipo" },
          { titulo: "variante", campo: "variante" },
          { titulo: "unidad", campo: "unidad" },
          { titulo: "stock actual", campo: "stockActual" },
          { titulo: "estado", campo: "estado" },
        ],
        filas: filasReferencia,
      },
    ])
  }

  function exportarMovimientos() {
    descargarCsv("movimientos-msl.csv", [
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
    descargarCsv("colaboradores-msl.csv", [
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
    descargarCsv("entregas-msl.csv", [
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
    descargarXlsx("reporte-entregas-filtradas-msl.xlsx", [{
      nombre: "Entregas",
      columnas: [
      { titulo: "Comprobante", campo: "numeroComprobante" },
      { titulo: "Fecha", campo: "fecha" },
      { titulo: "Colaborador", campo: "colaborador" },
      { titulo: "Identificación", campo: "identificacion" },
      { titulo: "Centro de costos", campo: "centroCostos" },
      { titulo: "Nombre centro de costos", campo: "nombreCentroCostos" },
      { titulo: "Producto", campo: "producto" },
      { titulo: "Categoría", campo: "categoria" },
      { titulo: "Variante", campo: "variante" },
      { titulo: "Unidad", campo: "unidad" },
      { titulo: "Cantidad", campo: "cantidad" },
      { titulo: "Motivo", campo: "motivo" },
      { titulo: "Responsable", campo: "responsable" },
      ],
      filas: entregasReporte,
    }])
  }

  function exportarReporteConsumoProductos() {
    descargarXlsx("reporte-consumo-productos-msl.xlsx", [{
      nombre: "Consumo",
      columnas: [
      { titulo: "Producto", campo: "producto" },
      { titulo: "Variante", campo: "variante" },
      { titulo: "Categoría", campo: "categoria" },
      { titulo: "Unidad", campo: "unidad" },
      { titulo: "Cantidad", campo: "cantidad" },
      ],
      filas: productosReporte,
    }])
  }

  function exportarReporteCentros() {
    descargarXlsx("reporte-centros-costos-msl.xlsx", [{
      nombre: "Centros",
      columnas: [
      { titulo: "Centro de costos", campo: "codigo" },
      { titulo: "Nombre centro", campo: "centro" },
      { titulo: "Cantidad", campo: "cantidad" },
      ],
      filas: centrosReporte,
    }])
  }

  function exportarReporteStockBajo() {
    descargarXlsx("reporte-stock-bajo-msl.xlsx", [{
      nombre: "Stock bajo",
      columnas: [
      { titulo: "Producto", campo: "nombre" },
      { titulo: "Categoría", campo: "categoria" },
      { titulo: "Tipo", campo: "tipo" },
      { titulo: "Variante", campo: "variante" },
      { titulo: "Unidad", campo: "unidad" },
      { titulo: "Stock actual", campo: "stockActual" },
      { titulo: "Stock Mínimo", campo: "stockMinimo" },
      { titulo: "Ubicación", campo: "ubicacion" },
      { titulo: "Estado", campo: "estado" },
      ],
      filas: productosStockBajo,
    }])
  }

  function exportarPedidoAutomatico() {
    descargarXlsx(`pedido-sugerido-${categoriaPedido.toLowerCase()}-msl.xlsx`, [{
      nombre: `Pedido ${categoriaPedido}`,
      columnas: [
        { titulo: "Producto", campo: "nombre" },
        { titulo: "Categoría", campo: "categoria" },
        { titulo: "Tipo", campo: "tipo" },
        { titulo: "Variante", campo: "variante" },
        { titulo: "Unidad", campo: "unidad" },
        { titulo: "Stock actual", campo: "stockActual" },
        { titulo: "Stock mínimo", campo: "stockMinimo" },
        { titulo: "Pedido sugerido", campo: "cantidadSugerida" },
        { titulo: "Ubicación", campo: "ubicacion" },
      ],
      filas: productosPedidoAutomatico,
    }])
  }

  function exportarReporteCompletoExcel() {
    descargarXlsx("reporte-inventario-msl.xlsx", [
      {
        nombre: "Entregas",
        columnas: [
          { titulo: "Comprobante", campo: "numeroComprobante" },
          { titulo: "Fecha", campo: "fecha" },
          { titulo: "Colaborador", campo: "colaborador" },
          { titulo: "Identificación", campo: "identificacion" },
          { titulo: "Centro de costos", campo: "centroCostos" },
          { titulo: "Producto", campo: "producto" },
          { titulo: "Categoría", campo: "categoria" },
          { titulo: "Variante", campo: "variante" },
          { titulo: "Unidad", campo: "unidad" },
          { titulo: "Cantidad", campo: "cantidad" },
          { titulo: "Estado", campo: "estado" },
        ],
        filas: entregasReporte,
      },
      {
        nombre: "Consumo",
        columnas: [
          { titulo: "Producto", campo: "producto" },
          { titulo: "Variante", campo: "variante" },
          { titulo: "Categoría", campo: "categoria" },
          { titulo: "Unidad", campo: "unidad" },
          { titulo: "Cantidad", campo: "cantidad" },
        ],
        filas: productosReporte,
      },
      {
        nombre: "Centros",
        columnas: [
          { titulo: "Centro de costos", campo: "codigo" },
          { titulo: "Nombre centro", campo: "centro" },
          { titulo: "Cantidad", campo: "cantidad" },
        ],
        filas: centrosReporte,
      },
      {
        nombre: "Stock bajo",
        columnas: [
          { titulo: "Producto", campo: "nombre" },
          { titulo: "Categoría", campo: "categoria" },
          { titulo: "Variante", campo: "variante" },
          { titulo: "Stock actual", campo: "stockActual" },
          { titulo: "Stock mínimo", campo: "stockMinimo" },
          { titulo: "Estado", campo: "estado" },
        ],
        filas: productosStockBajo,
      },
    ])
  }

  function exportarPerfiles() {
    descargarCsv("usuarios-msl.csv", [
      { titulo: "Nombre", campo: "nombre" },
      { titulo: "Correo", campo: "correo" },
      { titulo: "Rol", campo: "rol" },
      { titulo: "Estado", campo: "estado" },
      { titulo: "Creado en", campo: "creado_en" },
    ], perfiles)
  }


  function importarColaboradores(evento) {
    if (!requierePermiso(puedeGestionarColaboradores, "Tu rol no permite importar colaboradores.")) {
      evento.target.value = ""
      return
    }

    if (!accionPermitida("importar-colaboradores", 3000)) {
      evento.target.value = ""
      return
    }

    const archivo = evento.target.files?.[0]

    if (!archivo) return

    try {
      validarArchivoCsv(archivo)
    } catch (error) {
      mostrarErrorSupabase(error, "validar el archivo")
      evento.target.value = ""
      return
    }

    const lector = new FileReader()

    lector.onload = async () => {
      const { leerCsv } = await import("./utils/csv")
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
          const identificacion = textoSeguro(obtenerValor(fila, ["Identificación", "Identificacion", "Cédula", "Cedula"]), 40)
          const nombreCompleto = textoSeguro(obtenerValor(fila, ["Nombre completo", "Nombre"]), 160)

          if (!identificacion || !nombreCompleto) {
            return null
          }

          return {
            identificacion,
            nombreCompleto,
            cargo: textoSeguro(obtenerValor(fila, ["Cargo"]) || "Sin cargo", 120),
            subArea: textoSeguro(obtenerValor(fila, ["Sub-Área", "Sub area", "Subarea"]) || "", 120),
            grupo: textoSeguro(obtenerValor(fila, ["Grupo"]) || "", 40),
            centroCostos: textoSeguro(obtenerValor(fila, ["Centro de costos", "Centro costos", "Ceco"]) || centroPorNombre?.codigo || "", 40),
            nombreCentroCostos: textoSeguro(nombreCentro || centroPorNombre?.nombre || "", 160),
            sexo: textoSeguro(obtenerValor(fila, ["Sexo"]) || "Femenino", 40),
            estado: textoSeguro(obtenerValor(fila, ["Estado"]) || "Activo", 20),
            tallaAntifluido: textoSeguro(obtenerValor(fila, ["Talla de antifluido", "Talla antifluido", "Talla de antifluidos"]) || "N/A", 20),
            tallaBata: textoSeguro(obtenerValor(fila, ["Talla de bata", "Talla bata"]) || "N/A", 20),
            tallaCamisa: textoSeguro(obtenerValor(fila, ["Talla camisa", "Talla de camisa"]) || "N/A", 20),
            tallaPantalon: textoSeguro(obtenerValor(fila, ["Talla pantalón", "Talla pantalon", "Talla de pantalón", "Talla de pantalon"]) || "N/A", 20),
            tallaBotas: textoSeguro(obtenerValor(fila, ["Talla de botas", "Talla botas", "Talla bota"]) || "", 20),
          }
        })
        .filter(Boolean)

      if (colaboradoresImportados.length === 0) {
        mostrarMensaje("No encontró colaboradores válidos. Revisa que existan columnas de identificación y nombre.")
        evento.target.value = ""
        return
      }

      const colaboradoresUnicos = Array.from(
        new Map(colaboradoresImportados.map((item) => [item.identificacion, item])).values()
      )
      const colaboradoresPorIdentificacion = new Map(
        colaboradores.map((item) => [item.identificacion, item])
      )
      const nuevos = colaboradoresUnicos.filter(
        (item) => !colaboradoresPorIdentificacion.has(item.identificacion)
      ).length
      const actualizados = colaboradoresUnicos.length - nuevos

      try {
        const colaboradoresGuardados = await Promise.all(
          colaboradoresUnicos.map((item) => {
            const existente = colaboradoresPorIdentificacion.get(item.identificacion)

            return guardarColaboradorRpc({
              colaboradorId: existente?.id || null,
              colaboradorPayload: item,
            })
          })
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
    <LayoutInventario
      assetUrl={assetUrl}
      pestanas={pestanas}
      pestanaActiva={pestanaActiva}
      setPestanaActiva={setPestanaActiva}
      perfil={perfil}
      avatarUrl={sesion?.user?.user_metadata?.avatar_url}
      cerrarSesion={cerrarSesion}
      abrirCambioContrasena={() => setMostrarCambioContrasena(true)}
      cambiarFotoPerfil={cambiarFotoPerfil}
      indicadoresPrincipales={indicadoresPrincipales}
      renderIndicador={renderIndicador}
      mensaje={mensaje}
      cerrarMensaje={() => setMensaje(null)}
    >
          {pestanaActiva === "panel" && (
            <Suspense fallback={<p style={ayudaFormulario}>Cargando panel...</p>}>
            <PanelPrincipal
              indicadoresPanel={indicadoresPanel}
              renderIndicador={renderIndicador}
              productosStockBajo={productosStockBajo}
              productosMasEntregados={productosMasEntregados}
              entregasPorCentroCostos={entregasPorCentroCostos}
              entregasRecientes={entregasRecientes}
            />
            </Suspense>
          )}

          {pestanaActiva === "reportes" && (
            <Suspense fallback={<p style={ayudaFormulario}>Cargando reportes...</p>}>
            <ReportesPanel
              filtrosReporte={filtrosReporte}
              actualizarFiltroReporte={actualizarFiltroReporte}
              opcionesCentrosReporte={opcionesCentrosReporte}
              categoriasDisponibles={categoriasDisponibles}
              busquedaReportes={busquedaReportes}
              setBusquedaReportes={setBusquedaReportes}
              totalEntregadoReporte={totalEntregadoReporte}
              totalActivoReporte={totalActivoReporte}
              totalAnuladoReporte={totalAnuladoReporte}
              entregasActivasReporte={entregasActivasReporte}
              entregasAnuladasReporte={entregasAnuladasReporte}
              colaboradoresReporte={colaboradoresReporte}
              productosStockBajo={productosStockBajo}
              productosReporteGrafico={productosReporteGrafico}
              centrosReporteGrafico={centrosReporteGrafico}
              colaboradoresReporteGrafico={colaboradoresReporteGrafico}
              categoriaPedido={categoriaPedido}
              setCategoriaPedido={setCategoriaPedido}
              productosPedidoAutomatico={productosPedidoAutomatico}
              planeacionDotacion={planeacionDotacion}
              productosReporte={productosReporte}
              centrosReporte={centrosReporte}
              productosStockBajoReporte={productosStockBajoReporte}
              exportarReporteCompletoExcel={exportarReporteCompletoExcel}
              exportarReporteEntregasFiltradas={exportarReporteEntregasFiltradas}
              exportarReporteConsumoProductos={exportarReporteConsumoProductos}
              exportarReporteCentros={exportarReporteCentros}
              exportarReporteStockBajo={exportarReporteStockBajo}
              exportarPedidoAutomatico={exportarPedidoAutomatico}
            />
            </Suspense>
          )}

          {pestanaActiva === "usuarios" && esAdministrador && (
            <>
              <div style={accionesModulo}>
                <button type="button" onClick={exportarPerfiles} style={botonSecundario}>
                  <Download size={18} />
                  Exportar usuarios
                </button>
              </div>

              <h2 style={{ marginTop: "34px" }}>
                {perfilEditandoId ? "Editar perfil de usuario" : "Registrar perfil de usuario"}
              </h2>

              <p style={ayudaFormulario}>
                Primero invita o crea el usuario en Supabase Auth. Luego pega aquí su User UID para asignarle rol y estado dentro de la app.
              </p>

              <form onSubmit={guardarPerfilUsuario} style={gridFormulario}>
                <Campo texto="User UID de Supabase">
                  <input
                    value={perfilFormulario.id}
                    onChange={(e) => actualizarPerfilFormulario("id", e.target.value)}
                    readOnly={Boolean(perfilEditandoId)}
                    required
                    style={perfilEditandoId ? { ...campoFormulario, background: "#E0E5EB", cursor: "not-allowed" } : campoFormulario}
                  />
                </Campo>

                <Campo texto="Nombre">
                  <input value={perfilFormulario.nombre} onChange={(e) => actualizarPerfilFormulario("nombre", e.target.value)} required style={campoFormulario} />
                </Campo>

                <Campo texto="Correo">
                  <input type="email" value={perfilFormulario.correo} onChange={(e) => actualizarPerfilFormulario("correo", e.target.value)} required style={campoFormulario} />
                </Campo>

                <Campo texto="Rol">
                  <ListaBuscable
                    value={perfilFormulario.rol}
                    onChange={(valor) => actualizarPerfilFormulario("rol", valor || "Consulta")}
                    options={rolesDisponibles}
                    style={campoFormulario}
                  />
                </Campo>

                <Campo texto="Estado">
                  <ListaBuscable
                    value={perfilFormulario.estado}
                    onChange={(valor) => actualizarPerfilFormulario("estado", valor || "Activo")}
                    options={estadosPerfil}
                    style={campoFormulario}
                  />
                </Campo>

                <div style={filaBotones}>
                  <button disabled={estaGuardando("perfil")} style={botonPrincipal}>
                    <Users size={18} />
                    {estaGuardando("perfil") ? "Guardando..." : perfilEditandoId ? "Guardar perfil" : "Registrar perfil"}
                  </button>
                  {perfilEditandoId && (
                    <button type="button" onClick={cancelarEdicionPerfil} style={botonSecundario}>
                      Cancelar edición
                    </button>
                  )}
                </div>
              </form>

              <h2 style={{ marginTop: "34px" }}>Usuarios de la app</h2>

              <input
                value={busquedaPerfiles}
                onChange={(e) => setBusquedaPerfiles(e.target.value)}
                placeholder="Buscar usuario por nombre, correo, rol o estado"
                style={campoBusqueda}
              />

              <div style={grupoFiltros}>
                {["Todos", "Activo", "Inactivo", ...rolesDisponibles].map((filtro) => (
                  <button key={filtro} onClick={() => setFiltroPerfiles(filtro)} style={botonFiltro(filtroPerfiles === filtro)}>
                    {filtro}
                  </button>
                ))}
              </div>

              <table style={tabla}>
                <thead>
                  <tr style={encabezadoTabla}>
                    <th style={celdaTabla}>Nombre</th>
                    <th style={celdaTabla}>Correo</th>
                    <th style={celdaTabla}>Rol</th>
                    <th style={celdaTabla}>Estado</th>
                    <th style={celdaTabla}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {perfilesFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={celdaTabla}>No hay usuarios que coincidan con la búsqueda.</td>
                    </tr>
                  ) : (
                    perfilesFiltrados.map((item) => (
                      <tr key={item.id}>
                        <td style={celdaTabla}>{item.nombre}</td>
                        <td style={celdaTabla}>{item.correo}</td>
                        <td style={celdaTabla}>{item.rol}</td>
                        <td style={celdaTabla}>{item.estado}</td>
                        <td style={celdaTabla}>
                          <button type="button" onClick={() => prepararEdicionPerfil(item)} style={botonEditar}>
                            Editar
                          </button>
                          <button type="button" disabled={estaGuardando(`perfil-${item.id}`)} onClick={() => cambiarEstadoPerfil(item)} style={botonEliminar}>
                            {estaGuardando(`perfil-${item.id}`) ? "Guardando..." : item.estado === "Activo" ? "Inactivar" : "Activar"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          )}

          {pestanaActiva === "auditoria" && esAdministrador && (
            <>
              <h2 style={{ marginTop: "34px" }}>Auditoría</h2>

              <p style={ayudaFormulario}>
                Últimos 200 cambios registrados por los triggers de Supabase.
              </p>

              <table style={tabla}>
                <thead>
                  <tr style={encabezadoTabla}>
                    <th style={celdaTabla}>Fecha</th>
                    <th style={celdaTabla}>Usuario</th>
                    <th style={celdaTabla}>Acción</th>
                    <th style={celdaTabla}>Tabla</th>
                    <th style={celdaTabla}>Resumen</th>
                  </tr>
                </thead>
                <tbody>
                  {auditoria.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={celdaTabla}>Todavía no hay registros de auditoría visibles.</td>
                    </tr>
                  ) : (
                    auditoria.map((item) => {
                      const usuario = perfilesPorId.get(item.usuario_id)

                      return (
                        <tr key={item.id}>
                          <td style={celdaTabla}>{String(item.creado_en || "").slice(0, 19).replace("T", " ")}</td>
                          <td style={celdaTabla}>{usuario?.nombre || item.usuario_id || "Sistema"}</td>
                          <td style={celdaTabla}>{item.accion}</td>
                          <td style={celdaTabla}>{item.tabla}</td>
                          <td style={celdaTabla}>{resumirAuditoria(item)}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </>
          )}

          {pestanaActiva === "productos" && (
            <>
          <div style={accionesModulo}>
            {puedeGestionarProductos && (
              <button type="button" onClick={() => setMostrarFormularioItem(!mostrarFormularioItem)} style={botonSecundario}>
                <Plus size={18} />
                {mostrarFormularioItem ? "Cerrar item nuevo" : "Crear item nuevo"}
              </button>
            )}
            {puedeGestionarProductos && (
              <label style={accionGuardando === "importar-productos" ? { ...botonSecundario, opacity: 0.55, cursor: "not-allowed" } : botonSecundario}>
                <Upload size={18} />
                {accionGuardando === "importar-productos" ? "Importando..." : "Importar productos"}
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={importarProductos}
                  disabled={accionGuardando === "importar-productos"}
                  style={{ display: "none" }}
                />
              </label>
            )}
            <button onClick={exportarProductos} style={botonSecundario}>
              <Download size={18} />
              Exportar productos
            </button>
          </div>

          {puedeGestionarProductos && mostrarFormularioItem && (
            <section style={panelBloque}>
              <h2 style={{ marginTop: 0 }}>
                {itemCatalogoEditandoClave ? "Editar item del catálogo" : "Crear item nuevo"}
              </h2>
              <form onSubmit={registrarItemCatalogo} style={gridFormulario}>
                <Campo texto="Categoría">
                  <ListaBuscable
                    value={itemCatalogo.categoria}
                    onChange={(valor) => actualizarItemCatalogo("categoria", valor || "Dotación")}
                    options={categoriasDisponibles}
                    soloLista
                    style={campoFormulario}
                  />
                </Campo>

                <Campo texto="Nombre del item">
                  <input value={itemCatalogo.nombre} onChange={(e) => actualizarItemCatalogo("nombre", e.target.value)} required style={campoFormulario} />
                </Campo>

                <Campo texto="Tipo">
                  <input value={itemCatalogo.tipo} onChange={(e) => actualizarItemCatalogo("tipo", e.target.value)} placeholder="Ej: Calzado, Protección visual, Camisa" required style={campoFormulario} />
                </Campo>

                <Campo texto="Unidad">
                  <ListaBuscable
                    value={itemCatalogo.unidad}
                    onChange={(valor) => actualizarItemCatalogo("unidad", valor || "Unidad")}
                    options={unidadesDisponibles}
                    soloLista
                    style={campoFormulario}
                  />
                </Campo>

                <Campo texto="Variantes">
                  <input value={itemCatalogo.variantes} onChange={(e) => actualizarItemCatalogo("variantes", e.target.value)} placeholder="Ej: S, M, L, XL o Única" required style={campoFormulario} />
                </Campo>

                <Campo texto="Stock Mínimo">
                  <input
                    type="number"
                    min="0"
                    value={itemCatalogo.stockMinimo || (!esAdministrador ? 0 : "")}
                    onChange={(e) => actualizarItemCatalogo("stockMinimo", e.target.value)}
                    readOnly={!esAdministrador}
                    required
                    style={!esAdministrador ? { ...campoFormulario, background: "#E0E5EB", cursor: "not-allowed" } : campoFormulario}
                  />
                </Campo>

                <button disabled={estaGuardando("catalogo")} style={botonPrincipal}>
                  <Plus size={18} />
                  {estaGuardando("catalogo") ? "Guardando..." : itemCatalogoEditandoClave ? "Guardar cambios del item" : "Guardar item nuevo"}
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
                    <th style={celdaTabla}>Categoría</th>
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

          {puedeGestionarProductos ? (
            <>
          <h2 style={{ marginTop: "34px" }}>
            {productoEditandoId ? "Editar producto" : "Registrar producto"}
          </h2>

          <form onSubmit={registrarProducto} style={gridFormulario}>
            {productoEditandoTieneHistorial && (
              <p style={ayudaFormulario}>
                Este producto ya tiene historial. Para conservar la trazabilidad, nombre, categoría, tipo, variante y unidad quedan protegidos.
              </p>
            )}

            <Campo texto="Categoría">
              <ListaBuscable
                value={formulario.categoria}
                onChange={(valor) => actualizarCampo("categoria", valor || "Dotación")}
                options={categoriasDisponibles}
                soloLista
                disabled={productoEditandoTieneHistorial}
                style={productoEditandoTieneHistorial ? { ...campoFormulario, background: "#E0E5EB", cursor: "not-allowed" } : campoFormulario}
              />
            </Campo>

            <Campo texto="Nombre del elemento">
              <ListaBuscable
                value={formulario.nombre}
                onChange={(valor) => actualizarCampo("nombre", valor)}
                options={[...new Set(productosCategoria.map((producto) => producto.nombre))]}
                placeholder="Selecciona un elemento"
                disabled={productoEditandoTieneHistorial}
                required
                style={productoEditandoTieneHistorial ? { ...campoFormulario, background: "#E0E5EB", cursor: "not-allowed" } : campoFormulario}
              />
            </Campo>

            <Campo texto="Tipo">
              <ListaBuscable
                value={formulario.tipo}
                onChange={(valor) => actualizarCampo("tipo", valor)}
                options={tiposProductoSeleccionado}
                placeholder="Selecciona un tipo"
                soloLista
                disabled={productoEditandoTieneHistorial}
                required
                style={productoEditandoTieneHistorial ? { ...campoFormulario, background: "#E0E5EB", cursor: "not-allowed" } : campoFormulario}
              />
            </Campo>

            <Campo texto="Talla o variante">
              <ListaBuscable
                value={formulario.variante}
                onChange={(valor) => actualizarCampo("variante", valor)}
                options={variantesProducto}
                placeholder="Selecciona una variante"
                soloLista
                disabled={productoEditandoTieneHistorial}
                required
                style={productoEditandoTieneHistorial ? { ...campoFormulario, background: "#E0E5EB", cursor: "not-allowed" } : campoFormulario}
              />
            </Campo>

            <Campo texto="Unidad">
              <ListaBuscable
                value={formulario.unidad}
                onChange={(valor) => actualizarCampo("unidad", valor || "Unidad")}
                options={unidadesDisponibles}
                soloLista
                disabled={productoEditandoTieneHistorial}
                style={productoEditandoTieneHistorial ? { ...campoFormulario, background: "#E0E5EB", cursor: "not-allowed" } : campoFormulario}
              />
            </Campo>

            <Campo texto="Ubicación">
              <input value={formulario.ubicacion} onChange={(e) => actualizarCampo("ubicacion", e.target.value)} style={campoFormulario} />
            </Campo>

            <Campo texto={
              productoEditandoId
                ? esAdministrador ? "Stock actual / ajuste" : "Stock actual (solo consulta)"
                : esAdministrador ? "Stock inicial / entrada" : "Stock inicial (solo administrador)"
            }>
              <input
                type="number"
                min="0"
                value={formulario.stockActual}
                onChange={(e) => actualizarCampo("stockActual", e.target.value)}
                readOnly={!esAdministrador}
                required={esAdministrador}
                style={!esAdministrador ? { ...campoFormulario, background: "#E0E5EB", cursor: "not-allowed" } : campoFormulario}
              />
            </Campo>

            {!productoEditandoId && (
              <Campo texto="Motivo de entrada">
                <ListaBuscable
                  value={formulario.motivoEntrada || "Compra"}
                  onChange={(valor) => actualizarCampo("motivoEntrada", valor || "Compra")}
                  options={motivosEntrada}
                  soloLista
                  style={campoFormulario}
                />
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
                onChange={(e) => actualizarCampo("stockMinimo", e.target.value)}
                readOnly={!esAdministrador}
                required
                style={!esAdministrador ? { ...campoFormulario, background: "#E0E5EB", cursor: "not-allowed" } : campoFormulario}
              />
            </Campo>

            <Campo texto="Estado">
              <ListaBuscable
                value={formulario.estado}
                onChange={(valor) => actualizarCampo("estado", valor || "Activo")}
                options={estadosProducto}
                soloLista
                style={campoFormulario}
              />
            </Campo>

            <div style={filaBotones}>
              <button disabled={estaGuardando("producto")} style={botonPrincipal}>
                <Package size={18} />
                {estaGuardando("producto") ? "Guardando..." : productoEditandoId ? "Guardar cambios" : "Registrar producto"}
              </button>
              {productoEditandoId && (
                <button type="button" onClick={cancelarEdicionProducto} style={botonSecundario}>
                  Cancelar edición
                </button>
              )}
            </div>
          </form>
            </>
          ) : (
            <p style={ayudaFormulario}>
              Tu rol es de consulta para productos. Puedes revisar y exportar información, pero no registrar, editar ni eliminar.
            </p>
          )}

          <section style={{ ...panelBloque, marginTop: "34px" }}>
            <div style={accionesModulo}>
              <h2 style={{ margin: 0, marginRight: "auto" }}>Compras por factura</h2>
              {puedeGestionarProductos && (
                <>
                  <button type="button" onClick={exportarFormatoCompra} style={botonSecundario}>
                    <Download size={18} />
                    Formato compra
                  </button>
                  <label style={accionGuardando === "importar-compras" ? { ...botonSecundario, opacity: 0.55, cursor: "not-allowed" } : botonSecundario}>
                    <Upload size={18} />
                    {accionGuardando === "importar-compras" ? "Importando..." : "Importar compra"}
                    <input
                      type="file"
                      accept=".csv,.xlsx"
                      onChange={importarCompras}
                      disabled={accionGuardando === "importar-compras"}
                      style={{ display: "none" }}
                    />
                  </label>
                </>
              )}
            </div>

            {puedeGestionarProductos && (
              <form onSubmit={registrarCompra} style={gridFormulario}>
                <Campo texto="Número de factura">
                  <input
                    value={compra.numeroFactura}
                    onChange={(e) => actualizarCompra("numeroFactura", e.target.value)}
                    required
                    style={campoFormulario}
                  />
                </Campo>

                <Campo texto="Fecha factura">
                  <input
                    type="date"
                    value={compra.fecha}
                    onChange={(e) => actualizarCompra("fecha", e.target.value)}
                    required
                    style={campoFormulario}
                  />
                </Campo>

                <Campo texto="Proveedor">
                  <input
                    value={compra.proveedor}
                    onChange={(e) => actualizarCompra("proveedor", e.target.value)}
                    required
                    style={campoFormulario}
                  />
                </Campo>

                <Campo texto="Responsable">
                  <ListaBuscable
                    value={compra.responsable}
                    onChange={(valor) => actualizarCompra("responsable", valor)}
                    options={opcionesResponsablesEntrega}
                    placeholder="Selecciona responsable"
                    required
                    soloLista
                    style={campoFormulario}
                  />
                </Campo>

                <Campo texto="Observación">
                  <input
                    value={compra.observacion}
                    onChange={(e) => actualizarCompra("observacion", e.target.value)}
                    placeholder="Ej: compra mensual, proveedor, centro"
                    style={campoFormulario}
                  />
                </Campo>

                <Campo texto="Producto comprado">
                  <ListaBuscable
                    value={lineaCompra.productoId}
                    onChange={(valor) => actualizarLineaCompra("productoId", valor)}
                    options={opcionesProductosCompra}
                    placeholder="Selecciona producto existente"
                    soloLista
                    style={campoFormulario}
                  />
                </Campo>

                <Campo texto="Cantidad">
                  <input
                    type="number"
                    min="1"
                    value={lineaCompra.cantidad}
                    onChange={(e) => actualizarLineaCompra("cantidad", e.target.value)}
                    style={campoFormulario}
                  />
                </Campo>

                <Campo texto="Valor unitario">
                  <input
                    type="number"
                    min="0"
                    value={lineaCompra.valorUnitario}
                    onChange={(e) => actualizarLineaCompra("valorUnitario", e.target.value)}
                    placeholder="Opcional"
                    style={campoFormulario}
                  />
                </Campo>

                <Campo texto="Nota línea">
                  <input
                    value={lineaCompra.observacion}
                    onChange={(e) => actualizarLineaCompra("observacion", e.target.value)}
                    placeholder="Opcional"
                    style={campoFormulario}
                  />
                </Campo>

                <div style={{ display: "flex", alignItems: "end" }}>
                  <button type="button" onClick={agregarLineaCompra} style={botonSecundario}>
                    <Plus size={18} />
                    Agregar a compra
                  </button>
                </div>

                {lineasCompraDetalle.length > 0 && (
                  <div style={resumenLineasEntrega}>
                    <strong>Productos en esta compra: {lineasCompraDetalle.length}</strong>
                    <table style={tabla}>
                      <thead>
                        <tr style={encabezadoTabla}>
                          <th style={celdaTabla}>Producto</th>
                          <th style={celdaTabla}>Tipo</th>
                          <th style={celdaTabla}>Variante</th>
                          <th style={celdaTabla}>Cantidad</th>
                          <th style={celdaTabla}>Stock final</th>
                          <th style={celdaTabla}>Valor unitario</th>
                          <th style={celdaTabla}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineasCompraDetalle.map((linea) => (
                          <tr key={linea.productoId}>
                            <td style={celdaTabla}>{linea.producto?.nombre || "Producto no encontrado"}</td>
                            <td style={celdaTabla}>{linea.producto?.tipo || "-"}</td>
                            <td style={celdaTabla}>{linea.producto?.variante || "-"}</td>
                            <td style={celdaTabla}>{linea.cantidad} {linea.producto?.unidad || ""}</td>
                            <td style={celdaTabla}>
                              {Number(linea.producto?.stockActual || 0) + Number(linea.cantidad || 0)}
                            </td>
                            <td style={celdaTabla}>{formatearDinero(linea.valorUnitario)}</td>
                            <td style={celdaTabla}>
                              <button type="button" onClick={() => quitarLineaCompra(linea.productoId)} style={botonEliminar}>
                                Quitar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p style={{ margin: "10px 0 0" }}>
                      Total ítems: {totalLineasCompra} | Valor estimado: {formatearDinero(totalValorCompra)}
                    </p>
                  </div>
                )}

                <div style={filaBotones}>
                  <button disabled={estaGuardando("compra")} style={botonPrincipal}>
                    <FileText size={18} />
                    {estaGuardando("compra") ? "Guardando..." : "Registrar compra"}
                  </button>
                  <button type="button" onClick={limpiarCompra} style={botonSecundario}>
                    Limpiar compra
                  </button>
                </div>
              </form>
            )}

            <h3 style={{ marginTop: "26px" }}>Historial de compras</h3>
            <input
              value={busquedaCompras}
              onChange={(e) => setBusquedaCompras(e.target.value)}
              placeholder="Buscar por factura, proveedor, responsable o producto"
              style={campoBusqueda}
            />

            <table style={tabla}>
              <thead>
                <tr style={encabezadoTabla}>
                  <th style={celdaTabla}>Factura</th>
                  <th style={celdaTabla}>Fecha</th>
                  <th style={celdaTabla}>Proveedor</th>
                  <th style={celdaTabla}>Responsable</th>
                  <th style={celdaTabla}>Líneas</th>
                  <th style={celdaTabla}>Ítems</th>
                  <th style={celdaTabla}>Factura adjunta</th>
                  <th style={celdaTabla}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {comprasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={celdaTabla}>Todavía no hay compras registradas.</td>
                  </tr>
                ) : (
                  comprasFiltradas.map((compraItem) => {
                    const expandida = compraExpandidaId === compraItem.id
                    const totalItemsCompra = (compraItem.lineas || []).reduce(
                      (total, linea) => total + Number(linea.cantidad || 0),
                      0
                    )

                    return (
                      <tr key={compraItem.id}>
                        <td style={celdaTabla}>{compraItem.numeroFactura}</td>
                        <td style={celdaTabla}>{compraItem.fecha}</td>
                        <td style={celdaTabla}>{compraItem.proveedor}</td>
                        <td style={celdaTabla}>{compraItem.responsable}</td>
                        <td style={celdaTabla}>
                          <button
                            type="button"
                            onClick={() => setCompraExpandidaId(expandida ? "" : compraItem.id)}
                            style={botonEditar}
                          >
                            {expandida ? "Ocultar" : "Ver"} {compraItem.lineas?.length || 0}
                          </button>
                        </td>
                        <td style={celdaTabla}>{totalItemsCompra}</td>
                        <td style={celdaTabla}>
                          {facturaCompraVisible(compraItem) ? (
                            <button type="button" onClick={() => abrirFacturaCompra(compraItem)} style={botonEditar}>
                              <Paperclip size={16} />
                              Ver
                            </button>
                          ) : (
                            "Pendiente"
                          )}
                        </td>
                        <td style={celdaTabla}>
                          <button type="button" onClick={() => abrirCompra(compraItem)} style={botonEditar}>
                            <Printer size={16} />
                            Imprimir
                          </button>
                          {puedeGestionarProductos && (
                            <>
                              <label style={estaGuardando(`factura-${compraItem.id}`) ? { ...botonSecundario, opacity: 0.55, cursor: "not-allowed" } : botonSecundario}>
                                <Paperclip size={16} />
                                {estaGuardando(`factura-${compraItem.id}`) ? "Adjuntando..." : "Adjuntar"}
                                <input
                                  type="file"
                                  accept="application/pdf,.pdf,image/*"
                                  disabled={estaGuardando(`factura-${compraItem.id}`)}
                                  onChange={(e) => {
                                    adjuntarFacturaCompra(compraItem, e.target.files?.[0])
                                    e.target.value = ""
                                  }}
                                  style={{ display: "none" }}
                                />
                              </label>
                              <button
                                type="button"
                                disabled={estaGuardando(`eliminar-compra-${compraItem.id}`)}
                                onClick={() => eliminarCompra(compraItem)}
                                style={botonEliminar}
                              >
                                <Trash2 size={16} />
                                {estaGuardando(`eliminar-compra-${compraItem.id}`) ? "Eliminando..." : "Eliminar"}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>

            {compraExpandidaId && (
              <section style={resumenLineasEntrega}>
                <strong>Detalle de compra</strong>
                <table style={tabla}>
                  <thead>
                    <tr style={encabezadoTabla}>
                      <th style={celdaTabla}>Producto</th>
                      <th style={celdaTabla}>Categoría</th>
                      <th style={celdaTabla}>Tipo</th>
                      <th style={celdaTabla}>Variante</th>
                      <th style={celdaTabla}>Cantidad</th>
                      <th style={celdaTabla}>Valor unitario</th>
                      <th style={celdaTabla}>Stock final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(comprasFiltradas.find((item) => item.id === compraExpandidaId)?.lineas || []).map((linea) => (
                      <tr key={linea.id}>
                        <td style={celdaTabla}>{linea.producto}</td>
                        <td style={celdaTabla}>{linea.categoria}</td>
                        <td style={celdaTabla}>{linea.tipo}</td>
                        <td style={celdaTabla}>{linea.variante}</td>
                        <td style={celdaTabla}>{linea.cantidad} {linea.unidad}</td>
                        <td style={celdaTabla}>{formatearDinero(linea.valorUnitario)}</td>
                        <td style={celdaTabla}>{linea.stockResultante}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </section>

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
                <th style={celdaTabla}>Categoría</th>
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
                  <td colSpan="8" style={celdaTabla}>No hay productos que coincidan con la búsqueda.</td>
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
                    {puedeGestionarProductos ? (
                      <>
                        <button onClick={() => prepararEdicion(producto)} style={botonEditar}>
                          Editar
                        </button>

                        {esAdministrador && (
                          <button
                            disabled={estaGuardando(`eliminar-producto-${producto.id}`)}
                            onClick={() => eliminarProducto(producto.id)}
                            style={botonEliminar}
                          >
                            {estaGuardando(`eliminar-producto-${producto.id}`) ? "Eliminando..." : "Eliminar"}
                          </button>
                        )}
                      </>
                    ) : (
                      "Solo consulta"
                    )}
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

          {puedeGestionarMovimientos ? (
            <>
          <h2 style={{ marginTop: "34px" }}>Registrar movimiento</h2>

          <form onSubmit={registrarMovimiento} style={gridFormulario}>
            <Campo texto="Producto">
              <ListaBuscable
                value={movimiento.productoId}
                onChange={(valor) => actualizarMovimiento("productoId", valor)}
                options={opcionesProductosMovimiento}
                placeholder="Selecciona un producto registrado"
                required
                style={campoFormulario}
              />
            </Campo>

            <Campo texto="Tipo de movimiento">
              <ListaBuscable
                value={movimiento.tipoMovimiento}
                onChange={(valor) => actualizarMovimiento("tipoMovimiento", valor || "Entrada")}
                options={tiposMovimiento}
                soloLista
                style={campoFormulario}
              />
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

              <button disabled={estaGuardando("movimiento")} style={botonPrincipal}>
                <ArrowLeftRight size={18} />
                {estaGuardando("movimiento") ? "Guardando..." : "Registrar movimiento"}
              </button>
          </form>
            </>
          ) : (
            <p style={ayudaFormulario}>
              Tu rol puede consultar movimientos, pero no registrar entradas, devoluciones ni ajustes.
            </p>
          )}

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
            {puedeGestionarColaboradores && (
              <label style={botonSecundario}>
                <Plus size={18} />
                Importar colaboradores
                <input type="file" accept=".csv" onChange={importarColaboradores} style={{ display: "none" }} />
              </label>
            )}
            <button onClick={exportarColaboradores} style={botonSecundario}>
              <Download size={18} />
              Exportar colaboradores
            </button>
          </div>

          {puedeGestionarColaboradores ? (
            <>
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
              <ListaBuscable
                value={colaborador.subArea}
                onChange={(valor) => actualizarColaborador("subArea", valor)}
                options={subAreasDisponibles}
                placeholder="Selecciona sub-Área"
                required
                style={campoFormulario}
              />
            </Campo>

            <Campo texto="Grupo">
              <ListaBuscable
                value={colaborador.grupo}
                onChange={(valor) => actualizarColaborador("grupo", valor)}
                options={gruposDisponibles}
                placeholder="Selecciona grupo"
                required
                style={campoFormulario}
              />
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
              <ListaBuscable
                value={colaborador.nombreCentroCostos}
                onChange={(valor) => actualizarColaborador("nombreCentroCostos", valor)}
                options={centrosCostos.map((centro) => centro.nombre)}
                placeholder="Selecciona centro de costos"
                required
                style={campoFormulario}
              />
            </Campo>

            <Campo texto="Sexo">
              <ListaBuscable
                value={colaborador.sexo}
                onChange={(valor) => actualizarColaborador("sexo", valor || "Femenino")}
                options={["Femenino", "Masculino"]}
                soloLista
                style={campoFormulario}
              />
            </Campo>

            <Campo texto="Estado">
              <ListaBuscable
                value={colaborador.estado}
                onChange={(valor) => actualizarColaborador("estado", valor || "Activo")}
                options={estadosColaborador}
                soloLista
                style={campoFormulario}
              />
            </Campo>

            <Campo texto="Talla antifluido">
              <ListaBuscable
                value={colaborador.tallaAntifluido}
                onChange={(valor) => actualizarColaborador("tallaAntifluido", valor || "N/A")}
                options={tallasRopa}
                style={campoFormulario}
              />
            </Campo>

            <Campo texto="Talla bata">
              <ListaBuscable
                value={colaborador.tallaBata}
                onChange={(valor) => actualizarColaborador("tallaBata", valor || "N/A")}
                options={tallasRopa}
                style={campoFormulario}
              />
            </Campo>

            <Campo texto="Talla camisa">
              <ListaBuscable
                value={colaborador.tallaCamisa}
                onChange={(valor) => actualizarColaborador("tallaCamisa", valor || "N/A")}
                options={tallasRopa}
                style={campoFormulario}
              />
            </Campo>

            <Campo texto="Talla pantalón">
              <ListaBuscable
                value={colaborador.tallaPantalon}
                onChange={(valor) => actualizarColaborador("tallaPantalon", valor || "N/A")}
                options={tallasPantalon}
                style={campoFormulario}
              />
            </Campo>

            <Campo texto="Talla botas">
              <ListaBuscable
                value={colaborador.tallaBotas}
                onChange={(valor) => actualizarColaborador("tallaBotas", valor)}
                options={tallasBotas}
                placeholder="Selecciona talla"
                required
                style={campoFormulario}
              />
            </Campo>

            <div style={filaBotones}>
              <button disabled={estaGuardando("colaborador")} style={botonPrincipal}>
                <Users size={18} />
                {estaGuardando("colaborador") ? "Guardando..." : colaboradorEditandoId ? "Guardar colaborador" : "Registrar colaborador"}
              </button>
              {colaboradorEditandoId && (
                <button type="button" onClick={cancelarEdicionColaborador} style={botonSecundario}>
                  Cancelar edición
                </button>
              )}
            </div>
          </form>
            </>
          ) : (
            <p style={ayudaFormulario}>
              Tu rol puede consultar colaboradores, pero no registrar, editar, importar ni retirar personas.
            </p>
          )}

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
                  <td colSpan="9" style={celdaTabla}>No hay colaboradores que coincidan con la búsqueda.</td>
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
                    {puedeGestionarColaboradores ? (
                      <>
                        <button onClick={() => prepararEdicionColaborador(item)} style={botonEditar}>
                          Editar
                        </button>

                        <button onClick={() => eliminarColaborador(item.id)} style={botonEliminar}>
                          Eliminar
                        </button>
                      </>
                    ) : (
                      "Solo consulta"
                    )}
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

          {puedeGestionarEntregas ? (
            <>
          <h2 style={{ marginTop: "34px" }}>Registrar entrega</h2>

          <form onSubmit={registrarEntrega} style={gridFormulario}>
            <Campo texto="Colaborador">
              <ListaBuscable
                value={entrega.colaboradorId}
                onChange={(valor) => actualizarEntrega("colaboradorId", valor)}
                options={opcionesColaboradoresEntrega}
                placeholder="Selecciona colaborador"
                required
                style={campoFormulario}
              />
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

            {alertaDotacionEntrega && (
              <div style={{ ...mensajeApp(alertaDotacionEntrega.tipo), gridColumn: "1 / -1", display: "grid", alignItems: "start" }}>
                <strong>{alertaDotacionEntrega.titulo}</strong>
                <span>{alertaDotacionEntrega.texto}</span>
                {alertaDotacionEntrega.ultima && (
                  <span>
                    Último registro: {alertaDotacionEntrega.ultima.producto} - {alertaDotacionEntrega.ultima.variante} ({alertaDotacionEntrega.ultima.fecha})
                  </span>
                )}
              </div>
            )}

            <Campo texto="Producto">
              <ListaBuscable
                value={lineaEntrega.productoId}
                onChange={(valor) => actualizarLineaEntrega("productoId", valor)}
                options={opcionesProductosEntrega}
                placeholder="Selecciona producto"
                style={campoFormulario}
              />
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
                <p style={{ margin: "10px 0 0" }}>Total de ítems: {totalLineasEntrega}</p>
              </div>
            )}

            <Campo texto="Fecha">
              <input type="date" value={entrega.fecha} onChange={(e) => actualizarEntrega("fecha", e.target.value)} required style={campoFormulario} />
            </Campo>

            <Campo texto="Motivo">
              <ListaBuscable
                value={entrega.motivo}
                onChange={(valor) => actualizarEntrega("motivo", valor || "Ingreso")}
                options={motivosEntrega}
                soloLista
                style={campoFormulario}
              />
            </Campo>

            <Campo texto="Responsable">
              <ListaBuscable
                value={entrega.responsable}
                onChange={(valor) => actualizarEntrega("responsable", valor)}
                options={opcionesResponsablesEntrega}
                placeholder="Selecciona responsable"
                required
                soloLista
                style={campoFormulario}
              />
            </Campo>

            <Campo texto="Observación">
              <input value={entrega.observacion} onChange={(e) => actualizarEntrega("observacion", e.target.value)} placeholder="Ej: Entrega inicial, reposición autorizada" style={campoFormulario} />
            </Campo>

            <button disabled={estaGuardando("entrega")} style={botonPrincipal}>
              <ClipboardCheck size={18} />
              {estaGuardando("entrega") ? "Guardando..." : "Registrar entrega completa"}
            </button>
          </form>
            </>
          ) : (
            <p style={ayudaFormulario}>
              Tu rol puede consultar entregas y comprobantes, pero no registrar ni anular entregas.
            </p>
          )}

          <h2 style={{ marginTop: "34px" }}>Historial por colaborador</h2>

          <div style={{ ...gridFormulario, alignItems: "end" }}>
            <Campo texto="Colaborador">
              <ListaBuscable
                value={colaboradorHistorialId}
                onChange={setColaboradorHistorialId}
                options={opcionesColaboradoresHistorial}
                placeholder="Selecciona colaborador para consultar"
                style={campoFormulario}
              />
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
                  <strong>{comprobantesColaborador.length}</strong>
                  <span>Total comprobantes</span>
                </div>
                <div>
                  <strong>{comprobantesActivosColaborador.length}</strong>
                  <span>Activas</span>
                </div>
                <div>
                  <strong>{comprobantesAnuladosColaborador.length}</strong>
                  <span>Anuladas</span>
                </div>
              </div>

              <table style={tabla}>
                <thead>
                  <tr style={encabezadoTabla}>
                    <th style={celdaTabla}>Fecha</th>
                    <th style={celdaTabla}>Comprobante</th>
                    <th style={celdaTabla}>Líneas</th>
                    <th style={celdaTabla}>Total ítems</th>
                    <th style={celdaTabla}>Productos</th>
                    <th style={celdaTabla}>Motivo</th>
                    <th style={celdaTabla}>Responsable</th>
                    <th style={celdaTabla}>Estado</th>
                    <th style={celdaTabla}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {comprobantesColaborador.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={celdaTabla}>Este colaborador todavía no tiene entregas registradas.</td>
                    </tr>
                  ) : (
                    comprobantesColaborador.map((comprobante) => (
                      <tr key={comprobante.id} style={comprobante.estado === "Anulada" ? filaAnulada : undefined}>
                        <td style={celdaTabla}>{comprobante.fecha}</td>
                        <td style={celdaTabla}>{comprobante.numero}</td>
                        <td style={celdaTabla}>{comprobante.lineas.length}</td>
                        <td style={celdaTabla}>{comprobante.totalItems}</td>
                        <td style={celdaTabla}>{comprobante.productosResumen}</td>
                        <td style={celdaTabla}>{comprobante.motivo}</td>
                        <td style={celdaTabla}>{comprobante.responsable}</td>
                        <td style={celdaTabla}>{comprobante.estado}</td>
                        <td style={celdaTabla}>
                          <button type="button" onClick={() => abrirComprobante(comprobante.primeraLinea)} style={botonEditar}>
                            Comprobante
                          </button>
                        </td>
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

          <h3 style={{ marginTop: "24px" }}>Comprobantes</h3>

          <table style={tabla}>
            <thead>
              <tr style={encabezadoTabla}>
                <th style={celdaTabla}>Comprobante</th>
                <th style={celdaTabla}>Fecha</th>
                <th style={celdaTabla}>Colaborador</th>
                <th style={celdaTabla}>Centro costos</th>
                <th style={celdaTabla}>Líneas</th>
                <th style={celdaTabla}>Total ítems</th>
                <th style={celdaTabla}>Estado</th>
                <th style={celdaTabla}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {comprobantesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="8" style={celdaTabla}>No hay comprobantes que coincidan con la búsqueda.</td>
                </tr>
              ) : (
                comprobantesFiltrados.map((comprobante) => {
                  const primeraLinea = comprobante.lineas[0]
                  const expandido = comprobanteExpandidoId === comprobante.id

                  return (
                    <tr key={comprobante.id} style={comprobante.estado === "Anulada" ? filaAnulada : undefined}>
                      <td style={celdaTabla}>{comprobante.numero}</td>
                      <td style={celdaTabla}>{comprobante.fecha}</td>
                      <td style={celdaTabla}>{comprobante.colaborador}</td>
                      <td style={celdaTabla}>{comprobante.centroCostos}</td>
                      <td style={celdaTabla}>
                        <button
                          type="button"
                          onClick={() => setComprobanteExpandidoId(expandido ? "" : comprobante.id)}
                          style={botonEditar}
                        >
                          {expandido ? "Ocultar" : "Ver"} {comprobante.lineas.length}
                        </button>
                      </td>
                      <td style={celdaTabla}>{comprobante.totalItems}</td>
                      <td style={celdaTabla}>{comprobante.estado}</td>
                      <td style={celdaTabla}>
                        <button type="button" onClick={() => abrirComprobante(primeraLinea)} style={botonEditar}>
                          Comprobante
                        </button>
                        {puedeGestionarEntregas && comprobante.estado === "Activa" ? (
                          <button disabled={estaGuardando(`anular-${primeraLinea.id}`)} onClick={() => anularEntrega(primeraLinea.id)} style={botonEliminar}>
                            {estaGuardando(`anular-${primeraLinea.id}`) ? "Anulando..." : "Anular"}
                          </button>
                        ) : (
                          comprobante.motivoAnulacion || "-"
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>

          {comprobanteExpandidoId && (
            <section style={resumenLineasEntrega}>
              <strong>Detalle del comprobante</strong>
              <table style={tabla}>
                <thead>
                  <tr style={encabezadoTabla}>
                    <th style={celdaTabla}>Producto</th>
                    <th style={celdaTabla}>Variante</th>
                    <th style={celdaTabla}>Cantidad</th>
                    <th style={celdaTabla}>Motivo</th>
                    <th style={celdaTabla}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {(comprobantesFiltrados.find((item) => item.id === comprobanteExpandidoId)?.lineas || []).map((item) => (
                    <tr key={item.id} style={item.estado === "Anulada" ? filaAnulada : undefined}>
                      <td style={celdaTabla}>{item.producto}</td>
                      <td style={celdaTabla}>{item.variante}</td>
                      <td style={celdaTabla}>{item.cantidad} {item.unidad}</td>
                      <td style={celdaTabla}>{item.motivo}</td>
                      <td style={celdaTabla}>{item.estado || "Activa"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

            </>
          )}

          {mostrarCambioContrasena && (
            <div style={modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="titulo-contrasena">
              <form onSubmit={cambiarContrasena} style={modalPanel}>
                <h2 id="titulo-contrasena" style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                  <KeyRound size={24} />
                  Cambiar contraseña
                </h2>
                <p style={{ margin: "12px 0", color: "#5f6b85" }}>
                  Usa una clave nueva de al menos 6 caracteres.
                </p>
                <Campo texto="Nueva contraseña">
                  <input
                    type="password"
                    value={formularioContrasena.nueva}
                    onChange={(e) => setFormularioContrasena({ ...formularioContrasena, nueva: e.target.value })}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    style={campoFormulario}
                  />
                </Campo>
                <Campo texto="Confirmar contraseña">
                  <input
                    type="password"
                    value={formularioContrasena.confirmar}
                    onChange={(e) => setFormularioContrasena({ ...formularioContrasena, confirmar: e.target.value })}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    style={campoFormulario}
                  />
                </Campo>
                <div style={modalAcciones}>
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarCambioContrasena(false)
                      setFormularioContrasena({ nueva: "", confirmar: "" })
                    }}
                    disabled={estaGuardando("contrasena")}
                    style={botonSecundario}
                  >
                    Cancelar
                  </button>
                  <button disabled={estaGuardando("contrasena")} style={botonPrincipal}>
                    <KeyRound size={18} />
                    {estaGuardando("contrasena") ? "Guardando..." : "Guardar contraseña"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {anulacionPendiente && (
            <div style={modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="titulo-anulacion">
              <form onSubmit={confirmarAnulacion} style={modalPanel}>
                <h2 id="titulo-anulacion" style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                  <ShieldAlert size={24} />
                  Anular comprobante
                </h2>
                <div style={modalResumen}>
                  <strong>{anulacionPendiente.entregaSeleccionada.numeroComprobante || anulacionPendiente.entregaSeleccionada.id}</strong>
                  <span>Se anularán {anulacionPendiente.lineas.length} líneas activas.</span>
                  <span>Se devolverán {anulacionPendiente.totalDevuelto} ítems al stock.</span>
                </div>
                <Campo texto="Motivo de anulación">
                  <textarea
                    value={motivoAnulacion}
                    onChange={(e) => setMotivoAnulacion(e.target.value)}
                    placeholder="Escribe un motivo claro"
                    required
                    minLength={8}
                    style={{ ...campoFormulario, minHeight: "104px", resize: "vertical" }}
                  />
                </Campo>
                <div style={modalAcciones}>
                  <button
                    type="button"
                    onClick={cancelarAnulacion}
                    disabled={estaGuardando(`anular-${anulacionPendiente.entregaId}`)}
                    style={botonSecundario}
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={
                      estaGuardando(`anular-${anulacionPendiente.entregaId}`) ||
                      motivoAnulacion.trim().length < 8
                    }
                    style={botonEliminar}
                  >
                    {estaGuardando(`anular-${anulacionPendiente.entregaId}`) ? "Anulando..." : "Confirmar anulación"}
                  </button>
                </div>
              </form>
            </div>
          )}
    </LayoutInventario>
  )
}

export default App
