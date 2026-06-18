export function Campo({ texto, children, style }) {
  return (
    <label style={{ display: "grid", gap: "6px", fontWeight: "bold", ...style }}>
      {texto}
      {children}
    </label>
  )
}
