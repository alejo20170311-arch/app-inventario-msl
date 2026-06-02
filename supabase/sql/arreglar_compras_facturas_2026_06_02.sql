-- Reparacion puntual para Compras por factura.
-- Ejecutar en Supabase SQL Editor si eliminar compras, ver adjuntos o subir PDF falla.

create or replace function public.eliminar_compra_rpc(
  p_compra_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_rol text;
  v_compra public.compras%rowtype;
  v_linea public.compra_lineas%rowtype;
  v_producto public.productos%rowtype;
  v_movimiento public.movimientos%rowtype;
  v_stock_final integer;
  v_movimientos jsonb := '[]'::jsonb;
  v_productos jsonb := '[]'::jsonb;
begin
  if v_usuario_id is null then
    raise exception 'Usuario no autenticado.';
  end if;

  select rol
  into v_rol
  from public.perfiles
  where id = v_usuario_id
    and estado = 'Activo';

  if v_rol not in ('Administrador', 'Gestion Humana', 'Bodega') then
    raise exception 'No tienes permiso para eliminar compras.';
  end if;

  select *
  into v_compra
  from public.compras
  where id = p_compra_id
  for update;

  if not found then
    raise exception 'La compra no existe.';
  end if;

  for v_linea in
    select *
    from public.compra_lineas
    where compra_id = v_compra.id
    order by creado_en
  loop
    select *
    into v_producto
    from public.productos
    where id = v_linea.producto_id
    for update;

    if not found then
      raise exception 'El producto de la compra % no existe.', v_linea.id;
    end if;

    v_stock_final := v_producto.stock_actual - v_linea.cantidad;

    if v_stock_final < 0 then
      raise exception 'No se puede eliminar la compra porque % quedaria con stock negativo.', v_producto.nombre;
    end if;

    update public.productos
    set stock_actual = v_stock_final
    where id = v_producto.id
    returning * into v_producto;

    insert into public.movimientos (
      producto_id,
      producto,
      variante,
      unidad,
      tipo_movimiento,
      cantidad,
      fecha,
      observacion,
      stock_resultante,
      creado_por
    )
    values (
      v_producto.id,
      v_producto.nombre,
      v_producto.variante,
      v_producto.unidad,
      'Eliminacion de compra',
      v_linea.cantidad,
      current_date,
      'Eliminacion compra factura ' || v_compra.numero_factura || '. Se descuenta la entrada registrada.',
      v_stock_final,
      v_usuario_id
    )
    returning * into v_movimiento;

    v_movimientos := v_movimientos || jsonb_build_array(to_jsonb(v_movimiento));
    v_productos := v_productos || jsonb_build_array(to_jsonb(v_producto));
  end loop;

  delete from public.compras
  where id = v_compra.id;

  return jsonb_build_object(
    'compraId', v_compra.id,
    'facturaRuta', coalesce(v_compra.factura_ruta, ''),
    'movimientos', v_movimientos,
    'productos', v_productos
  );
end;
$$;

grant execute on function public.eliminar_compra_rpc(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'facturas-compras',
  'facturas-compras',
  false,
  8388608,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "facturas compras lectura autenticados" on storage.objects;
create policy "facturas compras lectura autenticados"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'facturas-compras'
  and public.rol_usuario() is not null
);

drop policy if exists "facturas compras gestion escribe" on storage.objects;
create policy "facturas compras gestion escribe"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'facturas-compras'
  and public.rol_usuario() in ('Administrador', 'Gestion Humana', 'Bodega')
);

drop policy if exists "facturas compras gestion actualiza" on storage.objects;
create policy "facturas compras gestion actualiza"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'facturas-compras'
  and public.rol_usuario() in ('Administrador', 'Gestion Humana', 'Bodega')
)
with check (
  bucket_id = 'facturas-compras'
  and public.rol_usuario() in ('Administrador', 'Gestion Humana', 'Bodega')
);

drop policy if exists "facturas compras gestion elimina" on storage.objects;
create policy "facturas compras gestion elimina"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'facturas-compras'
  and public.rol_usuario() in ('Administrador', 'Gestion Humana', 'Bodega')
);
