import { useId, useMemo, useState } from "react"

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
  placeholder = "Selecciona una opción",
  required = false,
  disabled = false,
  style,
}) {
  const id = useId()
  const [textoTemporal, setTextoTemporal] = useState("")
  const opciones = useMemo(() => options.map(normalizarOpcion), [options])
  const seleccion = opciones.find((opcion) => String(opcion.value) === String(value))
  const textoVisible = textoTemporal || seleccion?.label || ""
  const opcionesActivas = opciones.filter((opcion) => !opcion.disabled)

  function actualizarTexto(nuevoTexto) {
    setTextoTemporal(nuevoTexto)

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

  return (
    <>
      <input
        list={id}
        value={textoVisible}
        onChange={(e) => actualizarTexto(e.target.value)}
        onBlur={confirmarTexto}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        style={style}
      />
      <datalist id={id}>
        {opcionesActivas.map((opcion) => (
          <option key={String(opcion.value)} value={opcion.label} />
        ))}
      </datalist>
    </>
  )
}
