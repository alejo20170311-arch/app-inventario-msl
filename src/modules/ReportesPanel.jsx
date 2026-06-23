import { Boxes, Download, RefreshCw, Target, TrendingUp, Wallet } from "lucide-react"

import { Campo } from "../components/Campo"
import { ListaBuscable } from "../components/ListaBuscable"
import {
  accionesModulo,
  botonPrincipal,
  botonSecundario,
  campoFormulario,
  celdaTabla,
  encabezadoTabla,
  filaBotones,
  gridFormulario,
  tabla,
} from "../styles"

const azul = "#0100FE"
const verde = "#008A4C"
const amarillo = "#F5B301"
const rojo = "#B91C1C"
const negro = "#050505"
const borde = "#D8DEE6"
const textoSuave = "#5F6B85"

const dashboardShell = {
  display: "grid",
  gap: "18px",
  marginTop: "18px",
}

const filtrosPanel = {
  background: "#ffffff",
  border: `1px solid ${borde}`,
  borderRadius: "8px",
  padding: "18px",
  boxShadow: "0 16px 38px rgba(15, 23, 42, 0.08)",
}

const kpiGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "16px",
}

const panelGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "18px",
}

const panelAncho = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "18px",
}

const card = {
  background: "#ffffff",
  border: `1px solid ${borde}`,
  borderRadius: "8px",
  padding: "20px",
  boxShadow: "0 16px 38px rgba(15, 23, 42, 0.08)",
  minWidth: 0,
  overflowX: "auto",
}

const tituloPanel = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "14px",
}

function moneda(valor) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(valor || 0))
}

function porcentaje(valor) {
  return `${Math.round(Number(valor || 0))}%`
}

function mesEtiqueta(fecha) {
  const [anio, mes] = String(fecha || "").split("-")

  if (!anio || !mes) return "Sin fecha"

  return `${mes}/${anio.slice(2)}`
}

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function KpiCard({ icono: Icono, titulo, valor, detalle, color = azul, principal = false }) {
  return (
    <section
      style={{
        ...card,
        minHeight: principal ? "178px" : "132px",
        borderBottom: `4px solid ${color}`,
        display: "grid",
        alignContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
        <strong style={{ color: textoSuave, fontSize: "13px", textTransform: "uppercase" }}>{titulo}</strong>
        <span style={{
          width: "42px",
          height: "42px",
          display: "grid",
          placeItems: "center",
          borderRadius: "8px",
          background: `${color}14`,
          color,
        }}>
          <Icono size={22} />
        </span>
      </div>
      <div>
        <div style={{ fontSize: principal ? "54px" : "32px", lineHeight: 1, fontWeight: 900, color }}>
          {valor}
        </div>
        {detalle && <p style={{ margin: "10px 0 0", color: textoSuave, fontSize: "13px" }}>{detalle}</p>}
      </div>
    </section>
  )
}

function Dona({ datos, centro, vacio = "Sin datos" }) {
  const total = datos.reduce((suma, item) => suma + Number(item.valor || 0), 0)
  const radio = 42
  const circunferencia = 2 * Math.PI * radio

  if (total <= 0) {
    return <p style={{ color: textoSuave }}>{vacio}</p>
  }

  const segmentos = datos.reduce((acumulado, item) => {
    const inicio = acumulado.offset
    const longitud = (Number(item.valor || 0) / total) * circunferencia

    return {
      offset: inicio + longitud,
      items: [
        ...acumulado.items,
        {
          ...item,
          longitud,
          inicio,
        },
      ],
    }
  }, { offset: 0, items: [] }).items

  return (
    <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: "16px", alignItems: "center" }}>
      <svg viewBox="0 0 120 120" width="150" height="150" role="img" aria-label="Gráfico de dona">
        <circle cx="60" cy="60" r={radio} fill="none" stroke="#EEF3FF" strokeWidth="18" />
        {segmentos.map((item) => (
          <circle
            key={item.nombre}
            cx="60"
            cy="60"
            r={radio}
            fill="none"
            stroke={item.color}
            strokeWidth="18"
            strokeDasharray={`${item.longitud} ${circunferencia - item.longitud}`}
            strokeDashoffset={-item.inicio}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
            style={{ transition: "stroke-dasharray 520ms ease" }}
          />
        ))}
        <text x="60" y="56" textAnchor="middle" fontSize="18" fontWeight="900" fill={negro}>{centro}</text>
        <text x="60" y="74" textAnchor="middle" fontSize="10" fill={textoSuave}>total</text>
      </svg>
      <div style={{ display: "grid", gap: "9px" }}>
        {datos.map((item) => (
          <div key={item.nombre} style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "13px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: item.color }} />
              {item.nombre}
            </span>
            <strong>{item.valor}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

function BarrasHorizontales({ datos, etiqueta, valor, formatoValor = (v) => v, colorPorItem }) {
  const maximo = Math.max(...datos.map((item) => Number(item[valor] || 0)), 0)

  if (datos.length === 0 || maximo <= 0) return <p style={{ color: textoSuave }}>Sin datos para los filtros seleccionados.</p>

  return (
    <div style={{ display: "grid", gap: "12px" }}>
      {datos.map((item) => {
        const cantidad = Number(item[valor] || 0)
        const color = colorPorItem ? colorPorItem(item) : azul

        return (
          <div key={`${item[etiqueta]}-${cantidad}`} style={{ display: "grid", gridTemplateColumns: "minmax(120px, 1fr) 2fr auto", gap: "10px", alignItems: "center", fontSize: "13px" }}>
            <span title={item[etiqueta]} style={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item[etiqueta]}</span>
            <span style={{ height: "13px", borderRadius: "999px", background: "#EEF3FF", overflow: "hidden" }}>
              <span style={{ display: "block", width: `${Math.max(5, (cantidad / maximo) * 100)}%`, height: "100%", background: color, borderRadius: "999px", transition: "width 520ms ease" }} />
            </span>
            <strong>{formatoValor(cantidad)}</strong>
          </div>
        )
      })}
    </div>
  )
}

function TendenciaMensual({ datos }) {
  const maximo = Math.max(...datos.map((item) => Number(item.valor || 0)), 0)

  if (datos.length === 0 || maximo <= 0) return <p style={{ color: textoSuave }}>Sin gasto mensual para los filtros seleccionados.</p>

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${datos.length}, minmax(42px, 1fr))`, gap: "10px", alignItems: "end", minHeight: "210px" }}>
      {datos.map((item) => (
        <div key={item.mes} title={moneda(item.valor)} style={{ display: "grid", gap: "8px", alignItems: "end", height: "190px" }}>
          <span style={{
            alignSelf: "end",
            minHeight: "8px",
            height: `${Math.max(8, (Number(item.valor || 0) / maximo) * 150)}px`,
            background: "linear-gradient(180deg, #0100FE 0%, #77A9FF 100%)",
            borderRadius: "6px 6px 2px 2px",
            transition: "height 520ms ease",
          }} />
          <small style={{ textAlign: "center", color: textoSuave, fontWeight: 800 }}>{item.mes}</small>
        </div>
      ))}
    </div>
  )
}

function estadoInventario(producto) {
  if (Number(producto.stockActual || 0) <= 0) return { texto: "Agotado", color: rojo }
  if (Number(producto.stockMinimo || 0) > 0 && Number(producto.stockActual || 0) <= Number(producto.stockMinimo || 0)) {
    return { texto: "Bajo", color: amarillo }
  }
  return { texto: "Suficiente", color: verde }
}

function esReposicion(entrega) {
  const motivo = normalizar(entrega.motivo)
  return ["deterioro", "cambio de talla", "perdida", "reposicion"].some((texto) => motivo.includes(texto))
}

export function ReportesPanel({
  filtrosReporte,
  actualizarFiltroReporte,
  opcionesCentrosReporte,
  categoriasDisponibles,
  busquedaReportes,
  setBusquedaReportes,
  productos,
  colaboradores,
  entregasReporte,
  obtenerValorUnitarioProducto,
  categoriaPedido,
  setCategoriaPedido,
  productosPedidoAutomatico,
  planeacionDotacion,
  exportarReporteCompletoExcel,
  exportarReporteEntregasFiltradas,
  exportarReporteConsumoProductos,
  exportarReporteCentros,
  exportarReporteStockBajo,
  exportarPedidoAutomatico,
}) {
  const productosDotacion = productos.filter((producto) =>
    producto.categoria === "Dotación" &&
    producto.estado === "Activo" &&
    (filtrosReporte.productoId === "Todos" || String(producto.id) === String(filtrosReporte.productoId))
  )
  const entregasDotacion = entregasReporte.filter((item) => (item.estado || "Activa") === "Activa" && item.categoria === "Dotación")
  const colaboradoresDerecho = colaboradores.filter((colaborador) =>
    colaborador.estado === "Activo" &&
    (colaborador.tipoDotacion || "No aplica") !== "No aplica" &&
    (filtrosReporte.centroCostos === "Todos" || colaborador.centroCostos === filtrosReporte.centroCostos)
  )
  const colaboradoresEntregados = new Set(entregasDotacion.map((item) => String(item.colaboradorId || item.identificacion || item.colaborador)))
  const cumplimiento = colaboradoresDerecho.length > 0
    ? (colaboradoresEntregados.size / colaboradoresDerecho.length) * 100
    : 0
  const pendientes = Math.max(0, colaboradoresDerecho.length - colaboradoresEntregados.size)
  const entregasConCosto = entregasDotacion.map((entrega) => {
    const producto = productos.find((item) => String(item.id) === String(entrega.productoId))
    const valorUnitario = producto ? obtenerValorUnitarioProducto(producto) : 0

    return {
      ...entrega,
      valorUnitario,
      valorTotal: Number(entrega.cantidad || 0) * Number(valorUnitario || 0),
    }
  })
  const totalInvertido = entregasConCosto.reduce((total, item) => total + item.valorTotal, 0)
  const promedioColaborador = colaboradoresEntregados.size > 0 ? totalInvertido / colaboradoresEntregados.size : 0
  const costoPorCentro = Object.values(entregasConCosto.reduce((acumulado, item) => {
    const clave = item.centroCostos || "Sin centro"

    acumulado[clave] = acumulado[clave] || {
      centro: item.nombreCentroCostos || clave,
      valor: 0,
    }
    acumulado[clave].valor += item.valorTotal
    return acumulado
  }, {})).sort((a, b) => b.valor - a.valor).slice(0, 8)
  const tendenciaMensual = Object.values(entregasConCosto.reduce((acumulado, item) => {
    const mes = String(item.fecha || "").slice(0, 7) || "Sin fecha"

    acumulado[mes] = acumulado[mes] || { mes: mesEtiqueta(mes), valor: 0, orden: mes }
    acumulado[mes].valor += item.valorTotal
    return acumulado
  }, {})).sort((a, b) => String(a.orden).localeCompare(String(b.orden))).slice(-6)
  const reposiciones = entregasDotacion.filter(esReposicion)
  const porcentajeReposicion = entregasDotacion.length > 0 ? (reposiciones.length / entregasDotacion.length) * 100 : 0
  const rankingReposiciones = Object.values(reposiciones.reduce((acumulado, item) => {
    const clave = item.identificacion || item.colaborador

    acumulado[clave] = acumulado[clave] || {
      colaborador: item.colaborador,
      centroCostos: item.centroCostos,
      cantidad: 0,
    }
    acumulado[clave].cantidad += Number(item.cantidad || 0)
    return acumulado
  }, {})).sort((a, b) => b.cantidad - a.cantidad).slice(0, 8)
  const totalPrendas = productosDotacion.reduce((total, producto) => total + Number(producto.stockActual || 0), 0)
  const referenciasBajas = productosDotacion.filter((producto) => estadoInventario(producto).texto === "Bajo")
  const referenciasAgotadas = productosDotacion.filter((producto) => estadoInventario(producto).texto === "Agotado")
  const disponibilidad = productosDotacion
    .map((producto) => ({
      ...producto,
      etiqueta: `${producto.nombre} - ${producto.variante}`,
      stock: Number(producto.stockActual || 0),
      alerta: estadoInventario(producto),
    }))
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 10)
  const comparativoMensual = tendenciaMensual.length >= 2
    ? tendenciaMensual[tendenciaMensual.length - 1].valor - tendenciaMensual[tendenciaMensual.length - 2].valor
    : 0
  const opcionesProductosReporte = [
    { value: "Todos", label: "Todos" },
    ...productos
      .filter((producto) => filtrosReporte.categoria === "Todas" || producto.categoria === filtrosReporte.categoria)
      .map((producto) => ({
        value: producto.id,
        label: `${producto.nombre} - ${producto.variante}`,
      })),
  ]

  return (
    <>
      <div style={accionesModulo}>
        <button type="button" onClick={exportarReporteCompletoExcel} style={botonPrincipal}>
          <Download size={18} />
          Exportar reporte Excel
        </button>
        <button type="button" onClick={exportarReporteEntregasFiltradas} style={botonSecundario}>
          <Download size={18} />
          Entregas XLSX
        </button>
        <button type="button" onClick={exportarReporteConsumoProductos} style={botonSecundario}>
          <Download size={18} />
          Consumo XLSX
        </button>
        <button type="button" onClick={exportarReporteCentros} style={botonSecundario}>
          <Download size={18} />
          Centros XLSX
        </button>
        <button type="button" onClick={exportarReporteStockBajo} style={botonSecundario}>
          <Download size={18} />
          Stock bajo XLSX
        </button>
      </div>

      <div style={{ marginTop: "34px" }}>
        <h2 style={{ margin: 0 }}>Dashboard gerencial de dotación</h2>
        <p style={{ margin: "8px 0 0", color: textoSuave }}>
          Control de cumplimiento legal, inversión, reposiciones e inventario disponible para Gestión Humana.
        </p>
      </div>

      <section style={filtrosPanel}>
        <form style={gridFormulario}>
          <Campo texto="Desde">
            <input type="date" value={filtrosReporte.desde} onChange={(e) => actualizarFiltroReporte("desde", e.target.value)} style={campoFormulario} />
          </Campo>
          <Campo texto="Hasta">
            <input type="date" value={filtrosReporte.hasta} onChange={(e) => actualizarFiltroReporte("hasta", e.target.value)} style={campoFormulario} />
          </Campo>
          <Campo texto="Centro de costos">
            <ListaBuscable value={filtrosReporte.centroCostos} onChange={(valor) => actualizarFiltroReporte("centroCostos", valor || "Todos")} options={opcionesCentrosReporte} placeholder="Todos" style={campoFormulario} />
          </Campo>
          <Campo texto="Categoría">
            <ListaBuscable value={filtrosReporte.categoria} onChange={(valor) => actualizarFiltroReporte("categoria", valor || "Todas")} options={["Todas", ...categoriasDisponibles]} placeholder="Todas" soloLista style={campoFormulario} />
          </Campo>
          <Campo texto="Producto">
            <ListaBuscable value={filtrosReporte.productoId} onChange={(valor) => actualizarFiltroReporte("productoId", valor || "Todos")} options={opcionesProductosReporte} placeholder="Todos" style={campoFormulario} />
          </Campo>
          <Campo texto="Buscar">
            <input value={busquedaReportes} onChange={(e) => setBusquedaReportes(e.target.value)} placeholder="Colaborador, comprobante o responsable" style={campoFormulario} />
          </Campo>
        </form>
      </section>

      <div style={dashboardShell}>
        <div style={kpiGrid}>
          <KpiCard icono={Target} titulo="Cumplimiento de entrega" valor={porcentaje(cumplimiento)} detalle={`${colaboradoresEntregados.size} entregados de ${colaboradoresDerecho.length} con derecho`} color={azul} principal />
          <KpiCard icono={Wallet} titulo="Total invertido" valor={moneda(totalInvertido)} detalle={`Promedio por colaborador: ${moneda(promedioColaborador)}`} color={verde} />
          <KpiCard icono={RefreshCw} titulo="Reposiciones adicionales" valor={porcentaje(porcentajeReposicion)} detalle={`${reposiciones.length} reposiciones sobre ${entregasDotacion.length} líneas de dotación`} color={amarillo} />
          <KpiCard icono={Boxes} titulo="Inventario disponible" valor={totalPrendas} detalle={`${referenciasBajas.length} bajo stock | ${referenciasAgotadas.length} agotadas`} color={referenciasAgotadas.length ? rojo : verde} />
          <KpiCard icono={TrendingUp} titulo="Comparativo mensual" valor={moneda(comparativoMensual)} detalle={comparativoMensual >= 0 ? "Más gasto que el mes anterior" : "Menor gasto que el mes anterior"} color={comparativoMensual >= 0 ? azul : verde} />
        </div>

        <div style={panelGrid}>
          <section style={card}>
            <div style={tituloPanel}>
              <h3 style={{ margin: 0 }}>Cumplimiento legal de dotación</h3>
            </div>
            <Dona
              centro={colaboradoresDerecho.length}
              datos={[
                { nombre: "Entregados", valor: colaboradoresEntregados.size, color: azul },
                { nombre: "Pendientes", valor: pendientes, color: rojo },
              ]}
            />
          </section>

          <section style={card}>
            <div style={tituloPanel}>
              <h3 style={{ margin: 0 }}>Entrega normal vs reposición</h3>
            </div>
            <Dona
              centro={entregasDotacion.length}
              datos={[
                { nombre: "Entrega normal", valor: Math.max(0, entregasDotacion.length - reposiciones.length), color: verde },
                { nombre: "Reposición", valor: reposiciones.length, color: amarillo },
              ]}
            />
          </section>
        </div>

        <div style={panelAncho}>
          <section style={card}>
            <div style={tituloPanel}>
              <h3 style={{ margin: 0 }}>Costo de dotación por centro de costos</h3>
              <strong>{moneda(totalInvertido)}</strong>
            </div>
            <BarrasHorizontales datos={costoPorCentro} etiqueta="centro" valor="valor" formatoValor={moneda} />
          </section>

          <section style={card}>
            <div style={tituloPanel}>
              <h3 style={{ margin: 0 }}>Tendencia mensual del gasto</h3>
            </div>
            <TendenciaMensual datos={tendenciaMensual} />
          </section>
        </div>

        <div style={panelGrid}>
          <section style={card}>
            <div style={tituloPanel}>
              <h3 style={{ margin: 0 }}>Control de inventario de dotación</h3>
            </div>
            <BarrasHorizontales
              datos={disponibilidad}
              etiqueta="etiqueta"
              valor="stock"
              colorPorItem={(item) => item.alerta.color}
            />
          </section>

          <section style={card}>
            <div style={tituloPanel}>
              <h3 style={{ margin: 0 }}>Ranking de reposiciones</h3>
            </div>
            <table style={tabla}>
              <thead>
                <tr style={encabezadoTabla}>
                  <th style={celdaTabla}>Colaborador</th>
                  <th style={celdaTabla}>Centro</th>
                  <th style={celdaTabla}>Reposiciones</th>
                </tr>
              </thead>
              <tbody>
                {rankingReposiciones.length === 0 ? (
                  <tr><td colSpan="3" style={celdaTabla}>Sin reposiciones para los filtros seleccionados.</td></tr>
                ) : rankingReposiciones.map((item) => (
                  <tr key={`${item.colaborador}-${item.centroCostos}`}>
                    <td style={celdaTabla}>{item.colaborador}</td>
                    <td style={celdaTabla}>{item.centroCostos}</td>
                    <td style={celdaTabla}>{item.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <section style={card}>
          <div style={tituloPanel}>
            <div>
              <h3 style={{ margin: 0 }}>Pedido sugerido y planeación</h3>
              <p style={{ margin: "6px 0 0", color: textoSuave, fontSize: "13px" }}>
                El pedido sugerido de dotación usa colaboradores pendientes del próximo ciclo, stock actual y stock mínimo.
              </p>
            </div>
            <div style={{ minWidth: "220px" }}>
              <Campo texto="Categoría del pedido">
                <ListaBuscable value={categoriaPedido} onChange={(valor) => setCategoriaPedido(valor || "EPP")} options={categoriasDisponibles} soloLista style={campoFormulario} />
              </Campo>
            </div>
          </div>
          <div style={{ ...filaBotones, marginTop: "12px" }}>
            <button type="button" onClick={exportarPedidoAutomatico} disabled={productosPedidoAutomatico.length === 0} style={productosPedidoAutomatico.length === 0 ? { ...botonSecundario, opacity: 0.55, cursor: "not-allowed" } : botonSecundario}>
              <Download size={18} />
              Descargar pedido sugerido
            </button>
            <span style={{ color: textoSuave, fontSize: "13px" }}>
              {planeacionDotacion.filter((item) => item.estado !== "Entregado ciclo").length} colaboradores pendientes de ciclo.
            </span>
          </div>
        </section>
      </div>
    </>
  )
}
