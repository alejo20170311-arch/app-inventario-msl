-- Permite que solo Administrador elimine definitivamente un producto y su historial asociado.
-- Ejecutar en Supabase SQL Editor antes de usar el botón Eliminar definitivo.

create or replace function public.eliminar_producto_admin_rpc(
  p_producto_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_rol text;
  v_producto public.productos%rowtype;
  v_comprobantes uuid[];
  v_movimientos_eliminados integer := 0;
  v_entregas_eliminadas integer := 0;
  v_comprobantes_eliminados integer := 0;
begin
  if v_usuario_id is null then
    raise exception 'Usuario no autenticado.';
  end if;

  select rol
  into v_rol
  from public.perfiles
  where id = v_usuario_id
    and estado = 'Activo';

  if v_rol <> 'Administrador' then
    raise exception 'Solo un administrador puede eliminar productos definitivamente.';
  end if;

  select *
  into v_producto
  from public.productos
  where id = p_producto_id
  for update;

  if not found then
    raise exception 'El producto no existe.';
  end if;

  select coalesce(array_agg(distinct comprobante_id), '{}')
  into v_comprobantes
  from public.entregas
  where producto_id = p_producto_id
    and comprobante_id is not null;

  delete from public.movimientos
  where producto_id = p_producto_id;
  get diagnostics v_movimientos_eliminados = row_count;

  delete from public.entregas
  where producto_id = p_producto_id;
  get diagnostics v_entregas_eliminadas = row_count;

  delete from public.comprobantes c
  where c.id = any(v_comprobantes)
    and not exists (
      select 1
      from public.entregas e
      where e.comprobante_id = c.id
    );
  get diagnostics v_comprobantes_eliminados = row_count;

  delete from public.productos
  where id = p_producto_id;

  return jsonb_build_object(
    'productoId', p_producto_id,
    'movimientosEliminados', v_movimientos_eliminados,
    'entregasEliminadas', v_entregas_eliminadas,
    'comprobantesEliminados', v_comprobantes_eliminados
  );
end;
$$;

grant execute on function public.eliminar_producto_admin_rpc(uuid) to authenticated;
