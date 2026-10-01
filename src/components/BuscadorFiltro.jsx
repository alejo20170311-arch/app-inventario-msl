import { startTransition, useEffect, useRef } from "react"

export function BuscadorFiltro({ value, onChange, ...props }) {
  const inputRef = useRef(null)
  const temporizadorRef = useRef(null)
  const enviadoRef = useRef(value)
  const pendienteRef = useRef(null)

  useEffect(() => {
    if (value !== enviadoRef.current) {
      clearTimeout(temporizadorRef.current)
      pendienteRef.current = null
      enviadoRef.current = value
      inputRef.current.value = value
    }
  }, [value])

  useEffect(() => () => clearTimeout(temporizadorRef.current), [])

  function aplicarBusqueda(enSegundoPlano = true) {
    clearTimeout(temporizadorRef.current)
    if (pendienteRef.current === null) return

    const texto = pendienteRef.current
    pendienteRef.current = null
    enviadoRef.current = texto
    if (enSegundoPlano) {
      startTransition(() => onChange(texto))
    } else {
      onChange(texto)
    }
  }

  return (
    <input
      {...props}
      ref={inputRef}
      defaultValue={value}
      onChange={(event) => {
        // Keep typing independent of the tables and inventory calculations.
        pendienteRef.current = event.target.value
        clearTimeout(temporizadorRef.current)
        temporizadorRef.current = setTimeout(aplicarBusqueda, 150)
      }}
      onBlur={() => aplicarBusqueda(false)}
    />
  )
}
