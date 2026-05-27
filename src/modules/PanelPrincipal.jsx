import {
  celdaTabla,
  dashboardGrid,
  encabezadoTabla,
  filaAnulada,
  panelBloque,
  panelGrid,
  tabla,
} from "../styles"

export function PanelPrincipal({
  indicadoresPanel,
  renderIndicador,
  productosStockBajo,
  productosMasEntregados,
  entregasPorCentroCostos,
  entregasRecientes,
}) {
  return (
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
          <h3 style={{ marginTop: 0 }}>Más entregados este mes</h3>
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
                <th style={celdaTabla}>Ítems</th>
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
  )
}
