import { valorSeguro } from "./inventario"

export function abrirComprobanteEntrega({ entregaSeleccionada, entregas }) {
  const entregasComprobante = entregaSeleccionada.comprobanteId
    ? entregas.filter((item) => item.comprobanteId === entregaSeleccionada.comprobanteId)
    : [entregaSeleccionada]
  const totalItemsComprobante = entregasComprobante.reduce(
    (total, item) => total + Number(item.cantidad || 0),
    0
  )
  const todasAnuladas = entregasComprobante.every(
    (item) => item.estado === "Anulada"
  )
  const algunaAnulada = entregasComprobante.some(
    (item) => item.estado === "Anulada"
  )
  const estadoComprobante = todasAnuladas
    ? "Anulada"
    : algunaAnulada
      ? "Parcialmente anulada"
      : "Activa"
  const filasProductos = entregasComprobante.map((item) => `
    <tr class="${item.estado === "Anulada" ? "anulada" : ""}">
      <td>${valorSeguro(item.producto)}</td>
      <td>${valorSeguro(item.variante)}</td>
      <td>${valorSeguro(item.cantidad)}</td>
      <td>${valorSeguro(item.unidad)}</td>
      <td>${valorSeguro(item.motivo)}</td>
      <td>${valorSeguro(item.estado || "Activa")}</td>
    </tr>
  `).join("")
  const ventana = window.open("", "_blank", "width=900,height=1100")

  if (!ventana) return false

  const contenido = `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Comprobante de entrega</title>
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
            padding: 22mm;
            margin: 0 auto;
          }
          .encabezado-calidad {
            display: grid;
            grid-template-columns: 32% 47% 21%;
            border: 1px solid #000000;
            min-height: 30mm;
            margin-bottom: 16px;
          }
          .logo-formato,
          .titulo-formato,
          .datos-formato {
            display: flex;
            align-items: center;
            border-right: 1px solid #000000;
          }
          .logo-formato {
            justify-content: center;
            padding: 10px;
          }
          .logo-formato img {
            width: 150px;
            max-width: 90%;
          }
          .titulo-formato {
            justify-content: center;
            flex-direction: column;
            gap: 18px;
            text-align: center;
            font-weight: bold;
            font-size: 16px;
          }
          .datos-formato {
            display: grid;
            align-items: stretch;
            border-right: none;
            font-size: 12px;
          }
          .fila-formato {
            display: flex;
            align-items: center;
            padding: 6px 8px;
            border-bottom: 1px solid #000000;
          }
          .fila-formato:last-child {
            border-bottom: none;
          }
          .datos-acta {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            border: 1px solid #D8DEE6;
            margin-bottom: 22px;
          }
          .dato-acta {
            padding: 9px 10px;
            border-right: 1px solid #D8DEE6;
            font-size: 12px;
          }
          .dato-acta:last-child {
            border-right: none;
          }
          .bloque {
            margin-top: 22px;
          }
          .titulo-bloque {
            background: #000000;
            color: #FFFFFF;
            padding: 10px 12px;
            font-weight: bold;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            border: 1px solid #D8DEE6;
            border-top: none;
          }
          .campo {
            padding: 10px 12px;
            border-top: 1px solid #D8DEE6;
          }
          .campo:nth-child(odd) {
            border-right: 1px solid #D8DEE6;
          }
          .label {
            display: block;
            font-size: 11px;
            font-weight: bold;
            color: #333333;
            margin-bottom: 4px;
            text-transform: uppercase;
          }
          .valor {
            font-size: 14px;
          }
          .observacion {
            border: 1px solid #D8DEE6;
            border-top: none;
            padding: 12px;
            min-height: 58px;
          }
          .tabla-items {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #D8DEE6;
            border-top: none;
          }
          .tabla-items th {
            background: #F3F6FA;
            text-align: left;
            font-size: 12px;
            text-transform: uppercase;
          }
          .tabla-items th,
          .tabla-items td {
            border-top: 1px solid #D8DEE6;
            padding: 10px 12px;
            font-size: 13px;
          }
          .anulada {
            color: #6B7280;
            text-decoration: line-through;
          }
          .firmas {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 40px;
            margin-top: 70px;
          }
          .firma {
            border-top: 1px solid #000000;
            padding-top: 8px;
            font-size: 13px;
          }
          .texto-legal {
            margin-top: 24px;
            border: 1px solid #D8DEE6;
            padding: 14px 16px;
            font-size: 12px;
            line-height: 1.55;
            text-align: justify;
          }
          .texto-legal p {
            margin: 0 0 10px;
          }
          .texto-legal p:last-child {
            margin-bottom: 0;
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
          <button onclick="window.print()">Imprimir / Guardar PDF</button>
        </div>
        <main class="pagina">
          <header class="encabezado-calidad">
            <div class="logo-formato">
              <img src="/logo-msl-Azul.jpg" alt="MSL Group" />
            </div>
            <div class="titulo-formato">
              <div>ACTA DE ENTREGA</div>
              <div>DOTACIoN Y EPPS</div>
            </div>
            <div class="datos-formato">
              <div class="fila-formato">Codigo: F-GH-11</div>
              <div class="fila-formato">Version: 07</div>
              <div class="fila-formato">Fecha: 05 ene 2026</div>
            </div>
          </header>

          <section class="datos-acta">
            <div class="dato-acta"><span class="label">Fecha entrega</span>${valorSeguro(entregaSeleccionada.fecha)}</div>
            <div class="dato-acta"><span class="label">Estado</span>${valorSeguro(estadoComprobante)}</div>
            <div class="dato-acta"><span class="label">Comprobante</span>${valorSeguro(entregaSeleccionada.numeroComprobante || entregaSeleccionada.id)}</div>
            <div class="dato-acta"><span class="label">Lineas</span>${valorSeguro(entregasComprobante.length)}</div>
          </section>

          <section class="bloque">
            <div class="titulo-bloque">Datos del colaborador</div>
            <div class="grid">
              <div class="campo"><span class="label">Nombre</span><span class="valor">${valorSeguro(entregaSeleccionada.colaborador)}</span></div>
              <div class="campo"><span class="label">Identificacion</span><span class="valor">${valorSeguro(entregaSeleccionada.identificacion)}</span></div>
              <div class="campo"><span class="label">Grupo</span><span class="valor">${valorSeguro(entregaSeleccionada.grupo)}</span></div>
              <div class="campo"><span class="label">Centro de costos</span><span class="valor">${valorSeguro(entregaSeleccionada.centroCostos)}</span></div>
              <div class="campo"><span class="label">Nombre centro de costos</span><span class="valor">${valorSeguro(entregaSeleccionada.nombreCentroCostos)}</span></div>
              <div class="campo"><span class="label">Responsable entrega</span><span class="valor">${valorSeguro(entregaSeleccionada.responsable)}</span></div>
            </div>
          </section>

          <section class="bloque">
            <div class="titulo-bloque">Elementos entregados</div>
            <table class="tabla-items">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Talla/variante</th>
                  <th>Cantidad</th>
                  <th>Unidad</th>
                  <th>Motivo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                ${filasProductos}
              </tbody>
            </table>
            <div class="observacion">
              <span class="label">Observacion</span>
              ${valorSeguro(entregaSeleccionada.observacion)}
              <br /><br />
              <span class="label">Total items</span>
              ${valorSeguro(totalItemsComprobante)}
            </div>
          </section>

          <section class="texto-legal">
            <p>La dotacion que aqui se entrega es y sera de la empresa en todo momento, en caso de terminacion del contrato de trabajo o entrega de nueva dotacion, me comprometo a hacer la devolucion de forma inmediata.</p>
            <p>En caso de daño de la dotacion o parte de ella, el trabajador debe devolverla a la empresa.</p>
            <p>Autorizo expresamente a la empresa mediante este documento a descontar de salarios y liquidacion de prestaciones los valores de la dotacion cuando en cualquiera de los casos anteriores no la devuelve al empleador.</p>
          </section>

          <section class="firmas">
            <div class="firma">
              Firma colaborador<br />
              ${valorSeguro(entregaSeleccionada.colaborador)}<br />
              Documento: ${valorSeguro(entregaSeleccionada.identificacion)}
            </div>
            <div class="firma">
              Firma responsable de entrega<br />
              ${valorSeguro(entregaSeleccionada.responsable)}
            </div>
          </section>
        </main>
      </body>
    </html>
  `

  ventana.document.open()
  ventana.document.write(contenido)
  ventana.document.close()
  return true
}
