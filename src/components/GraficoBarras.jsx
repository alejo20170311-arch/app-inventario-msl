import {
  barraGrafico,
  etiquetaGrafico,
  filaGrafico,
  graficoBarras,
  pistaGrafico,
  valorGrafico,
} from "../styles"

export function GraficoBarras({
  datos,
  etiqueta,
  valor,
  unidad = "",
  color = "#0500ff",
  vacio = "Sin datos para los filtros seleccionados.",
}) {
  const maximo = Math.max(...datos.map((item) => Number(item[valor] || 0)), 0)

  if (datos.length === 0 || maximo === 0) {
    return <p style={{ margin: "14px 0 0" }}>{vacio}</p>
  }

  return (
    <div style={graficoBarras}>
      {datos.map((item) => {
        const cantidad = Number(item[valor] || 0)
        const ancho = `${Math.max(5, Math.round((cantidad / maximo) * 100))}%`

        return (
          <div key={`${item[etiqueta]}-${cantidad}`} style={filaGrafico}>
            <span title={item[etiqueta]} style={etiquetaGrafico}>
              {item[etiqueta]}
            </span>
            <span style={pistaGrafico}>
              <span style={{ ...barraGrafico(color), width: ancho }} />
            </span>
            <span style={valorGrafico}>
              {cantidad}{unidad ? ` ${unidad}` : ""}
            </span>
          </div>
        )
      })}
    </div>
  )
}
