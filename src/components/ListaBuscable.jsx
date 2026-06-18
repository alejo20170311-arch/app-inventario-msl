import { useMemo, useState } from "react"

function normalizarOpcion(opcion) {
  if (typeof opcion === "string") {
    return {
      value: opcion,
      label: opcion,
    }
  }

  return {
    value: opcion.value,
    label: opcion.label ?? opcion.value,
    disabled: opcion.disabled,
  }
}

export function ListaBuscable({
  value,
  onChange,
  options,
  placeholder = "Selecciona una opcion",
  required = false,
  disabled = false,
  soloLista = false,
  anchoLista = "100%",
  style,
}) {
  const [textoTemporal, setTextoTemporal] = useState("")
  const [listaAbierta, setListaAbierta] = useState(false)
  const opciones = useMemo(() => options.map(normalizarOpcion), [options])
  const seleccion = opciones.find((opcion) => String(opcion.value) === String(value))
  const textoVisible = textoTemporal || seleccion?.label || ""
  const opcionesActivas = opciones.filter((opcion) => !opcion.disabled)
  const textoFiltro = textoTemporal.trim().toLowerCase()
  const opcionesVisibles = (textoFiltro
    ? opcionesActivas.filter((opcion) =>
      opcion.label.toLowerCase().includes(textoFiltro) ||
      String(opcion.value).toLowerCase().includes(textoFiltro)
    )
    : opcionesActivas
  ).slice(0, 80)

  function actualizarTexto(nuevoTexto) {
    setTextoTemporal(nuevoTexto)
    setListaAbierta(true)

    const opcionSeleccionada = opcionesActivas.find(
      (opcion) =>
        opcion.label.toLowerCase() === nuevoTexto.toLowerCase() ||
        String(opcion.value).toLowerCase() === nuevoTexto.toLowerCase()
    )

    if (opcionSeleccionada) {
      onChange(opcionSeleccionada.value)
      setTextoTemporal("")
      return
    }

    onChange("")
  }

  function confirmarTexto() {
    if (!textoTemporal) return

    const opcionSeleccionada = opcionesActivas.find(
      (opcion) =>
        opcion.label.toLowerCase() === textoTemporal.toLowerCase() ||
        String(opcion.value).toLowerCase() === textoTemporal.toLowerCase()
    )

    if (opcionSeleccionada) {
      onChange(opcionSeleccionada.value)
      setTextoTemporal("")
      return
    }

    setTextoTemporal("")
  }

  function seleccionarOpcion(opcion) {
    onChange(opcion.value)
    setTextoTemporal("")
    setListaAbierta(false)
  }

  if (soloLista) {
    const valorActual = value ?? ""
    const valorExiste = opciones.some((opcion) => String(opcion.value) === String(valorActual))

    return (
      <select
        value={valorExiste ? valorActual : ""}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        style={style}
      >
        {!valorExiste && (
          <option value="" disabled={required}>
            {placeholder}
          </option>
        )}
        {opciones.map((opcion) => (
          <option
            key={String(opcion.value)}
            value={opcion.value}
            disabled={opcion.disabled}
          >
            {opcion.label}
          </option>
        ))}
      </select>
    )
  }

  return (
    <span style={{ position: "relative", display: "grid", minWidth: 0, width: "100%" }}>
      <input
        value={textoVisible}
        onChange={(e) => actualizarTexto(e.target.value)}
        onFocus={() => setListaAbierta(true)}
        onBlur={() => {
          confirmarTexto()
          setListaAbierta(false)
        }}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        title={textoVisible}
        style={style}
      />
      {listaAbierta && !disabled && opcionesVisibles.length > 0 && (
        <div
          style={{
            position: "absolute",
            zIndex: 80,
            top: "calc(100% + 6px)",
            left: 0,
            width: anchoLista,
            minWidth: "100%",
            maxWidth: "calc(100vw - 72px)",
            maxHeight: "320px",
            overflowY: "auto",
            background: "#ffffff",
            border: "1px solid #dbe3f0",
            borderRadius: "8px",
            boxShadow: "0 18px 44px rgba(15, 23, 42, 0.18)",
            padding: "8px",
          }}
        >
          {opcionesVisibles.map((opcion) => (
            <button
              key={String(opcion.value)}
              type="button"
              title={opcion.label}
              onMouseDown={(e) => {
                e.preventDefault()
                seleccionarOpcion(opcion)
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "10px 12px",
                background: String(opcion.value) === String(value) ? "#eef3ff" : "transparent",
                color: "#070b1d",
                border: "none",
                borderRadius: "6px",
                textAlign: "left",
                fontWeight: 700,
                lineHeight: 1.3,
                whiteSpace: "normal",
                cursor: "pointer",
              }}
            >
              {opcion.label}
            </button>
          ))}
        </div>
      )}
    </span>
  )
}
