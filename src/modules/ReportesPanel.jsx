import { Download } from "lucide-react"

import { Campo } from "../components/Campo"
import { GraficoBarras } from "../components/GraficoBarras"
import { ListaBuscable } from "../components/ListaBuscable"
import {
  accionesModulo,
  botonPrincipal,
  botonSecundario,
  campoFormulario,
  celdaTabla,
  dashboardGrid,
  encabezadoTabla,
  filaBotones,
  gridFormulario,
  panelBloque,
  panelGrid,
  tabla,
  tarjetaIndicador,
} from "../styles"

export function ReportesPanel({
  filtrosReporte,
  actualizarFiltroReporte,
  opcionesCentrosReporte,
  categoriasDisponibles,
  busquedaReportes,
  setBusquedaReportes,
  totalEntregadoReporte,
  totalActivoReporte,
  totalAnuladoReporte,
  entregasActivasReporte,
  entregasAnuladasReporte,
  colaboradoresReporte,
  productosStockBajo,
  productosReporteGrafico,
  centrosReporteGrafico,
  colaboradoresReporteGrafico,
  categoriaPedido,
  setCategoriaPedido,
  productosPedidoAutomatico,
  planeacionDotacion,
  productosReporte,
  centrosReporte,
  productosStockBajoReporte,
  exportarReporteCompletoExcel,
  exportarReporteEntregasFiltradas,
  exportarReporteConsumoProductos,
  exportarReporteCentros,
  exportarReporteStockBajo,
  exportarPedidoAutomatico,
}) {
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
            <ListaBuscable
              value={filtrosReporte.centroCostos}
              onChange={(valor) => actualizarFiltroReporte("centroCostos", valor || "Todos")}
              options={opcionesCentrosReporte}
              placeholder="Todos"
              style={campoFormulario}
            />
          </Campo>

          <Campo texto="Categoría">
            <ListaBuscable
              value={filtrosReporte.categoria}
              onChange={(valor) => actualizarFiltroReporte("categoria", valor || "Todas")}
              options={["Todas", ...categoriasDisponibles]}
              placeholder="Todas"
              soloLista
              style={campoFormulario}
            />
          </Campo>

          <Campo texto="Estado">
            <ListaBuscable
              value={filtrosReporte.estado}
              onChange={(valor) => actualizarFiltroReporte("estado", valor || "Todas")}
              options={["Todas", "Activas", "Anuladas"]}
              placeholder="Todas"
              style={campoFormulario}
            />
          </Campo>

          <Campo texto="Buscar">
            <input
              value={busquedaReportes}
              onChange={(e) => setBusquedaReportes(e.target.value)}
              placeholder="Colaborador, producto, comprobante, grupo o responsable"
              style={campoFormulario}
            />
          </Campo>
        </form>
      </section>

      <div style={dashboardGrid}>
        <div style={tarjetaIndicador("#0100FE")}>
          <strong>Ítems filtrados</strong>
          <h2>{totalEntregadoReporte}</h2>
        </div>
        <div style={tarjetaIndicador("#008a4c")}>
          <strong>Ítems activos</strong>
          <h2>{totalActivoReporte}</h2>
        </div>
        <div style={tarjetaIndicador("#b91c1c")}>
          <strong>Ítems anulados</strong>
          <h2>{totalAnuladoReporte}</h2>
        </div>
        <div style={tarjetaIndicador("#000000")}>
          <strong>Líneas activas / anuladas</strong>
          <h2>{entregasActivasReporte.length} / {entregasAnuladasReporte.length}</h2>
        </div>
        <div style={tarjetaIndicador("#77A9FF")}>
          <strong>Colaboradores</strong>
          <h2>{colaboradoresReporte.length}</h2>
        </div>
        <div style={tarjetaIndicador("#000000")}>
          <strong>Stock bajo</strong>
          <h2>{productosStockBajo.length}</h2>
        </div>
      </div>

      <div style={panelGrid}>
        <section style={panelBloque}>
          <h3 style={{ marginTop: 0 }}>Gráfico de consumo por producto</h3>
          <GraficoBarras
            datos={productosReporteGrafico}
            etiqueta="etiqueta"
            valor="cantidad"
            color="#0100FE"
          />
        </section>

        <section style={panelBloque}>
          <h3 style={{ marginTop: 0 }}>Gráfico por centro de costos</h3>
          <GraficoBarras
            datos={centrosReporteGrafico}
            etiqueta="centro"
            valor="cantidad"
            color="#008a4c"
          />
        </section>

        <section style={panelBloque}>
          <h3 style={{ marginTop: 0 }}>Colaboradores con más entregas</h3>
          <GraficoBarras
            datos={colaboradoresReporteGrafico}
            etiqueta="colaborador"
            valor="cantidad"
            color="#050505"
          />
        </section>

        <section style={panelBloque}>
          <h3 style={{ marginTop: 0 }}>Pedido automático por stock bajo</h3>
          <Campo texto="Categoría del pedido">
            <ListaBuscable
              value={categoriaPedido}
              onChange={(valor) => setCategoriaPedido(valor || "EPP")}
              options={categoriasDisponibles}
              soloLista
              style={campoFormulario}
            />
          </Campo>

          <div style={{ ...filaBotones, marginTop: "12px" }}>
            <button
              type="button"
              onClick={exportarPedidoAutomatico}
              disabled={productosPedidoAutomatico.length === 0}
              style={productosPedidoAutomatico.length === 0 ? { ...botonSecundario, opacity: 0.55, cursor: "not-allowed" } : botonSecundario}
            >
              <Download size={18} />
              Descargar pedido sugerido
            </button>
          </div>

          <table style={tabla}>
            <thead>
              <tr style={encabezadoTabla}>
                <th style={celdaTabla}>Producto</th>
                <th style={celdaTabla}>Stock</th>
                <th style={celdaTabla}>Mínimo</th>
                <th style={celdaTabla}>Pedido sugerido</th>
              </tr>
            </thead>
            <tbody>
              {productosPedidoAutomatico.length === 0 ? (
                <tr>
                  <td colSpan="4" style={celdaTabla}>No hay productos de {categoriaPedido} por pedir.</td>
                </tr>
              ) : (
                productosPedidoAutomatico.map((producto) => (
                  <tr key={producto.id}>
                    <td style={celdaTabla}>{producto.nombre} - {producto.variante}</td>
                    <td style={celdaTabla}>{producto.stockActual} {producto.unidad}</td>
                    <td style={celdaTabla}>{producto.stockMinimo}</td>
                    <td style={celdaTabla}>{producto.cantidadSugerida} {producto.unidad}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section style={panelBloque}>
          <h3 style={{ marginTop: 0 }}>Planeación de dotación</h3>
          <table style={tabla}>
            <thead>
              <tr style={encabezadoTabla}>
                <th style={celdaTabla}>Colaborador</th>
                <th style={celdaTabla}>Ciclo</th>
                <th style={celdaTabla}>Solicitar</th>
                <th style={celdaTabla}>Entrega</th>
                <th style={celdaTabla}>Última dotación</th>
                <th style={celdaTabla}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {planeacionDotacion.length === 0 ? (
                <tr>
                  <td colSpan="6" style={celdaTabla}>No hay colaboradores activos para planear dotación.</td>
                </tr>
              ) : (
                planeacionDotacion.slice(0, 12).map((item) => (
                  <tr key={item.colaboradorId}>
                    <td style={celdaTabla}>{item.colaborador}</td>
                    <td style={celdaTabla}>{item.ciclo}</td>
                    <td style={celdaTabla}>{item.fechaSolicitud}</td>
                    <td style={celdaTabla}>{item.fechaEntrega}</td>
                    <td style={celdaTabla}>{item.ultimaDotacion}</td>
                    <td style={celdaTabla}>{item.estado}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>

      <div style={panelGrid}>
        <section style={panelBloque}>
          <h3 style={{ marginTop: 0 }}>Consumo por producto</h3>
          <table style={tabla}>
            <thead>
              <tr style={encabezadoTabla}>
                <th style={celdaTabla}>Producto</th>
                <th style={celdaTabla}>Categoría</th>
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
                <th style={celdaTabla}>Código</th>
                <th style={celdaTabla}>Ítems</th>
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
          <h3 style={{ marginTop: 0 }}>Colaboradores con más entregas</h3>
          <table style={tabla}>
            <thead>
              <tr style={encabezadoTabla}>
                <th style={celdaTabla}>Colaborador</th>
                <th style={celdaTabla}>Centro</th>
                <th style={celdaTabla}>Ítems</th>
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
              {productosStockBajoReporte.length === 0 ? (
                <tr>
                  <td colSpan="3" style={celdaTabla}>Sin productos en stock bajo.</td>
                </tr>
              ) : (
                productosStockBajoReporte.map((producto) => (
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
  )
}
