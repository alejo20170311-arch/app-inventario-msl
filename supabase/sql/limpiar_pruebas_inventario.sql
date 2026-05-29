-- Limpieza total de pruebas operativas.
-- Conserva perfiles, colaboradores, catalogo de productos y auditoria.
-- Ejecutar solo cuando quieras dejar inventario, movimientos y entregas en cero.

begin;

truncate table
  public.movimientos,
  public.entregas,
  public.comprobantes,
  public.productos
restart identity;

commit;

-- Si tambien quieres limpiar auditoria de pruebas, ejecuta aparte:
-- truncate table public.auditoria restart identity;
