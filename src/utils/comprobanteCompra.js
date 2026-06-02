import { valorSeguro } from "./inventario"

function dinero(valor) {
  const numero = Number(valor || 0)

  if (!Number.isFinite(numero) || numero <= 0) return "-"

  return numero.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  })
}

export function abrirComprobanteCompra(compra) {
  if (!compra) return false

  const logoUrl = new URL(`${import.meta.env.BASE_URL}logo-msl-Azul.jpg`, window.location.origin).href
  const lineas = compra.lineas || []
  const totalItems = lineas.reduce((total, linea) => total + Number(linea.cantidad || 0), 0)
  const totalValor = lineas.reduce(
    (total, linea) => total + Number(linea.cantidad || 0) * Number(linea.valorUnitario || 0),
    0
  )
  const filas = lineas.map((linea) => `
    <tr>
      <td>${valorSeguro(linea.producto)}</td>
      <td>${valorSeguro(linea.tipo)}</td>
      <td>${valorSeguro(linea.variante)}</td>
      <td>${valorSeguro(linea.cantidad)}</td>
      <td>${valorSeguro(linea.unidad)}</td>
      <td>${dinero(linea.valorUnitario)}</td>
      <td>${valorSeguro(linea.stockResultante)}</td>
    </tr>
  `).join("")
  const ventana = window.open("", "_blank", "width=900,height=1100")

  if (!ventana) return false

  ventana.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${window.location.origin}; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" />
        <title>Compra ${valorSeguro(compra.numeroFactura)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Arial, sans-serif;
            color: #000000;
            background: #FFFFFF;
          }
          .pagina {
            width: 216mm;
            min-height: 279mm;
            padding: 20mm;
            margin: 0 auto;
          }
          .encabezado {
            display: grid;
            grid-template-columns: 32% 44% 24%;
            border: 1px solid #000000;
            min-height: 28mm;
            margin-bottom: 18px;
          }
          .logo, .titulo, .datos {
            display: grid;
            align-items: center;
            border-right: 1px solid #000000;
            padding: 10px;
          }
          .logo { justify-items: center; }
          .logo img { width: 145px; max-width: 90%; }
          .titulo {
            justify-items: center;
            text-align: center;
            font-weight: 900;
            font-size: 15px;
          }
          .datos {
            border-right: none;
            font-size: 12px;
            gap: 6px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            border: 1px solid #D8DEE6;
            margin-bottom: 18px;
          }
          .campo {
            padding: 10px 12px;
            border-bottom: 1px solid #D8DEE6;
          }
          .campo:nth-child(odd) { border-right: 1px solid #D8DEE6; }
          .campo:nth-last-child(-n + 2) { border-bottom: none; }
          .label {
            display: block;
            font-size: 11px;
            font-weight: 900;
            color: #333333;
            margin-bottom: 4px;
            text-transform: uppercase;
          }
          .valor { font-size: 14px; }
          table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #D8DEE6;
          }
          th {
            background: #F3F6FA;
            text-align: left;
            text-transform: uppercase;
            font-size: 11px;
          }
          th, td {
            border-top: 1px solid #D8DEE6;
            padding: 9px 10px;
            font-size: 12px;
          }
          .resumen {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin: 18px 0;
          }
          .dato {
            border: 1px solid #D8DEE6;
            padding: 12px;
            background: #F8FAFC;
          }
          .observacion {
            margin-top: 18px;
            border: 1px solid #D8DEE6;
            padding: 12px;
            min-height: 52px;
          }
          .acciones {
            position: fixed;
            right: 18px;
            top: 18px;
          }
          button {
            background: #0100FE;
            color: #FFFFFF;
            border: none;
            padding: 10px 14px;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
          }
          @media print {
            .acciones { display: none; }
            .pagina { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="acciones">
          <button type="button" onclick="window.print()">Imprimir / Guardar PDF</button>
        </div>
        <main class="pagina">
          <section class="encabezado">
            <div class="logo">
              <img src="${logoUrl}" alt="MSL Group" />
            </div>
            <div class="titulo">
              <div>REGISTRO DE COMPRA</div>
              <div>Inventario Dotación y EPP</div>
            </div>
            <div class="datos">
              <strong>Factura</strong>
              <span>${valorSeguro(compra.numeroFactura)}</span>
              <strong>Estado</strong>
              <span>${valorSeguro(compra.estado)}</span>
            </div>
          </section>

          <section class="grid">
            <div class="campo">
              <span class="label">Fecha</span>
              <span class="valor">${valorSeguro(compra.fecha)}</span>
            </div>
            <div class="campo">
              <span class="label">Proveedor</span>
              <span class="valor">${valorSeguro(compra.proveedor)}</span>
            </div>
            <div class="campo">
              <span class="label">Responsable</span>
              <span class="valor">${valorSeguro(compra.responsable)}</span>
            </div>
            <div class="campo">
              <span class="label">Registrada en</span>
              <span class="valor">${valorSeguro(String(compra.creadoEn || "").slice(0, 19).replace("T", " "))}</span>
            </div>
          </section>

          <section class="resumen">
            <div class="dato">
              <span class="label">Líneas</span>
              <strong>${lineas.length}</strong>
            </div>
            <div class="dato">
              <span class="label">Ítems comprados</span>
              <strong>${totalItems}</strong>
            </div>
            <div class="dato">
              <span class="label">Valor total</span>
              <strong>${dinero(totalValor)}</strong>
            </div>
          </section>

          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Variante</th>
                <th>Cantidad</th>
                <th>Unidad</th>
                <th>Valor unitario</th>
                <th>Stock final</th>
              </tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>

          <section class="observacion">
            <span class="label">Observación</span>
            <div>${valorSeguro(compra.observacion || "-")}</div>
          </section>
        </main>
      </body>
    </html>
  `)
  ventana.document.close()

  return true
}
