export function Campo({ texto, children }) {
  return (
    <label style={{ display: "grid", gap: "6px", fontWeight: "bold" }}>
      {texto}
      {children}
    </label>
  )
}
