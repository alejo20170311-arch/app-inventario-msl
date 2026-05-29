-- Actualiza permisos de Gestion Humana y reemplaza el catalogo EPP.
-- Ejecutar en Supabase SQL Editor sobre la base publicada.

create or replace function public.guardar_producto_movimiento_rpc(
  p_producto_id uuid,
  p_producto jsonb,
  p_movimiento jsonb default null
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
  v_movimiento public.movimientos%rowtype;
  v_cantidad integer;
  v_tipo_movimiento text;
  v_fecha date;
  v_observacion text;
  v_stock_final integer;
begin
  if v_usuario_id is null then
    raise exception 'Usuario no autenticado.';
  end if;

  select rol
  into v_rol
  from public.perfiles
  where id = v_usuario_id
    and estado = 'Activo';

  if v_rol is null then
    raise exception 'El usuario no tiene perfil activo.';
  end if;

  if v_rol not in ('Administrador', 'Gestion Humana', 'Bodega') then
    raise exception 'No tienes permiso para modificar inventario.';
  end if;

  if p_producto is null or jsonb_typeof(p_producto) <> 'object' then
    raise exception 'Debes enviar los datos del producto.';
  end if;

  if p_movimiento is not null and jsonb_typeof(p_movimiento) <> 'object' then
    raise exception 'El movimiento debe ser un objeto JSON.';
  end if;

  if p_movimiento is not null then
    v_tipo_movimiento := nullif(trim(p_movimiento->>'tipo_movimiento'), '');
    v_cantidad := nullif(p_movimiento->>'cantidad', '')::integer;
    v_fecha := coalesce(nullif(p_movimiento->>'fecha', '')::date, current_date);
    v_observacion := nullif(trim(coalesce(p_movimiento->>'observacion', '')), '');

    if v_tipo_movimiento is null then
      raise exception 'El tipo de movimiento es obligatorio.';
    end if;

    if v_cantidad is null or v_cantidad <= 0 then
      raise exception 'La cantidad debe ser mayor a cero.';
    end if;

    if (
      v_tipo_movimiento ilike '%ajuste%'
      or lower(v_tipo_movimiento) in ('devolucion', 'devolución')
    ) and length(coalesce(v_observacion, '')) < 8 then
      raise exception 'Escribe una observación clara para devoluciones y ajustes.';
    end if;
  end if;

  if p_producto_id is null then
    if nullif(trim(p_producto->>'nombre'), '') is null then
      raise exception 'El nombre del producto es obligatorio.';
    end if;

    if nullif(trim(p_producto->>'categoria'), '') not in ('Dotación', 'EPP') then
      raise exception 'La categoría del producto no es válida.';
    end if;

    v_stock_final := coalesce(nullif(p_producto->>'stock_actual', '')::integer, 0);

    if v_stock_final < 0 then
      raise exception 'El stock no puede ser negativo.';
    end if;

    insert into public.productos (
      nombre,
      categoria,
      tipo,
      variante,
      unidad,
      stock_actual,
      stock_minimo,
      ubicacion,
      estado
    )
    values (
      trim(p_producto->>'nombre'),
      trim(p_producto->>'categoria'),
      trim(p_producto->>'tipo'),
      trim(p_producto->>'variante'),
      trim(p_producto->>'unidad'),
      v_stock_final,
      coalesce(nullif(p_producto->>'stock_minimo', '')::integer, 0),
      coalesce(nullif(trim(p_producto->>'ubicacion'), ''), 'Bodega GH'),
      coalesce(nullif(trim(p_producto->>'estado'), ''), 'Activo')
    )
    returning * into v_producto;
  else
    select *
    into v_producto
    from public.productos
    where id = p_producto_id
    for update;

    if not found then
      raise exception 'El producto no existe.';
    end if;

    if p_movimiento is not null
       and v_producto.estado = 'Inactivo'
       and coalesce(nullif(trim(p_producto->>'estado'), ''), v_producto.estado) = 'Inactivo' then
      raise exception 'No se pueden registrar movimientos sobre un producto inactivo.';
    end if;

    v_stock_final := v_producto.stock_actual;

    if p_movimiento is not null then
      if lower(v_tipo_movimiento) = 'ajuste negativo' then
        v_stock_final := v_producto.stock_actual - v_cantidad;
      else
        v_stock_final := v_producto.stock_actual + v_cantidad;
      end if;

      if v_stock_final < 0 then
        raise exception 'Este movimiento dejaría el stock en negativo.';
      end if;
    end if;

    update public.productos
    set
      nombre = coalesce(nullif(trim(p_producto->>'nombre'), ''), v_producto.nombre),
      categoria = coalesce(nullif(trim(p_producto->>'categoria'), ''), v_producto.categoria),
      tipo = coalesce(nullif(trim(p_producto->>'tipo'), ''), v_producto.tipo),
      variante = coalesce(nullif(trim(p_producto->>'variante'), ''), v_producto.variante),
      unidad = coalesce(nullif(trim(p_producto->>'unidad'), ''), v_producto.unidad),
      stock_actual = v_stock_final,
      stock_minimo = coalesce(nullif(p_producto->>'stock_minimo', '')::integer, v_producto.stock_minimo),
      ubicacion = coalesce(nullif(trim(p_producto->>'ubicacion'), ''), v_producto.ubicacion),
      estado = coalesce(nullif(trim(p_producto->>'estado'), ''), v_producto.estado)
    where id = v_producto.id
    returning * into v_producto;
  end if;

  if p_movimiento is not null then
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
      v_tipo_movimiento,
      v_cantidad,
      v_fecha,
      v_observacion,
      v_producto.stock_actual,
      v_usuario_id
    )
    returning * into v_movimiento;
  end if;

  return jsonb_build_object(
    'producto', to_jsonb(v_producto),
    'movimiento', case
      when p_movimiento is null then null
      else to_jsonb(v_movimiento)
    end
  );
end;
$$;

create or replace function public.guardar_catalogo_producto_rpc(
  p_catalogo_id uuid,
  p_catalogo jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_rol text;
  v_catalogo public.catalogo_productos%rowtype;
begin
  if v_usuario_id is null then
    raise exception 'Usuario no autenticado.';
  end if;

  select rol into v_rol
  from public.perfiles
  where id = v_usuario_id
    and estado = 'Activo';

  if v_rol not in ('Administrador', 'Gestion Humana', 'Bodega') then
    raise exception 'No tienes permiso para modificar el catálogo.';
  end if;

  if nullif(trim(p_catalogo->>'categoria'), '') not in ('Dotación', 'EPP') then
    raise exception 'La categoría del catálogo no es válida.';
  end if;

  if nullif(trim(p_catalogo->>'nombre'), '') is null then
    raise exception 'El nombre del elemento es obligatorio.';
  end if;

  if p_catalogo_id is null then
    insert into public.catalogo_productos (
      categoria,
      nombre,
      tipo,
      unidad,
      variantes,
      stock_minimo
    )
    values (
      trim(p_catalogo->>'categoria'),
      trim(p_catalogo->>'nombre'),
      trim(p_catalogo->>'tipo'),
      trim(p_catalogo->>'unidad'),
      coalesce(
        array(select jsonb_array_elements_text(coalesce(p_catalogo->'variantes', '[]'::jsonb))),
        '{}'::text[]
      ),
      coalesce(nullif(p_catalogo->>'stock_minimo', '')::integer, 0)
    )
    returning * into v_catalogo;
  else
    update public.catalogo_productos
    set
      categoria = trim(p_catalogo->>'categoria'),
      nombre = trim(p_catalogo->>'nombre'),
      tipo = trim(p_catalogo->>'tipo'),
      unidad = trim(p_catalogo->>'unidad'),
      variantes = coalesce(
        array(select jsonb_array_elements_text(coalesce(p_catalogo->'variantes', '[]'::jsonb))),
        '{}'::text[]
      ),
      stock_minimo = coalesce(nullif(p_catalogo->>'stock_minimo', '')::integer, 0)
    where id = p_catalogo_id
    returning * into v_catalogo;

    if not found then
      raise exception 'El elemento del catálogo no existe.';
    end if;
  end if;

  return to_jsonb(v_catalogo);
end;
$$;

drop policy if exists "catalogo admin y bodega modifican" on public.catalogo_productos;
drop policy if exists "catalogo admin gh bodega modifican" on public.catalogo_productos;
create policy "catalogo admin gh bodega modifican"
on public.catalogo_productos
for all
to authenticated
using (public.rol_usuario() in ('Administrador', 'Gestion Humana', 'Bodega'))
with check (public.rol_usuario() in ('Administrador', 'Gestion Humana', 'Bodega'));

drop policy if exists "productos admin y bodega modifican" on public.productos;
drop policy if exists "productos admin gh bodega modifican" on public.productos;
create policy "productos admin gh bodega modifican"
on public.productos
for all
to authenticated
using (public.rol_usuario() in ('Administrador', 'Gestion Humana', 'Bodega'))
with check (public.rol_usuario() in ('Administrador', 'Gestion Humana', 'Bodega'));

delete from public.catalogo_productos
where categoria = 'EPP';

insert into public.catalogo_productos (
  categoria,
  nombre,
  tipo,
  unidad,
  variantes,
  stock_minimo
)
values
  ('EPP', 'Casco en trabajo en alturas', 'Trabajo en alturas', 'Unidad', array['Única'], 0),
  ('EPP', 'Gafas de seguridad', 'Protección visual', 'Unidad', array['Única'], 0),
  ('EPP', 'Careta Esmerilar', 'Protección facial', 'Unidad', array['Única'], 0),
  ('EPP', 'Visor de seguridad', 'Protección facial', 'Unidad', array['Única'], 0),
  ('EPP', 'Tapaoidos', 'Protección auditiva', 'Par', array['Única'], 0),
  ('EPP', 'Mascara Respirador Media Cara', 'Protección respiratoria', 'Unidad', array['Única'], 0),
  ('EPP', 'Filtros mascara media cara', 'Protección respiratoria', 'Par', array['Única'], 0),
  ('EPP', 'Tapabocas N95', 'Protección respiratoria', 'Unidad', array['Única'], 0),
  ('EPP', 'Tapabocas negro quirurgico', 'Protección respiratoria', 'Unidad', array['Única'], 0),
  ('EPP', 'Traje en PVC', 'Protección corporal', 'Unidad', array['Única'], 0),
  ('EPP', 'Peto de carnaza', 'Protección corporal', 'Unidad', array['Única'], 0),
  ('EPP', 'Delantal Industrial PVC', 'Protección corporal', 'Unidad', array['Única'], 0),
  ('EPP', 'Guantes de lavanderia medio brazo', 'Protección manos', 'Par', array['Única'], 0),
  ('EPP', 'Trajes Tyvec', 'Protección corporal', 'Unidad', array['Única'], 0),
  ('EPP', 'Guantes de carnaza', 'Protección manos', 'Par', array['Única'], 0),
  ('EPP', 'Guantes de nitrilo', 'Protección manos', 'Caja', array['Única'], 0),
  ('EPP', 'Guantes de tela', 'Protección manos', 'Par', array['Única'], 0),
  ('EPP', 'Guantes para calor', 'Protección manos', 'Par', array['Única'], 0),
  ('EPP', 'Guantes dieléctricos', 'Protección manos', 'Par', array['Única'], 0),
  ('EPP', 'Canguros (mantenimiento)', 'Mantenimiento', 'Unidad', array['Única'], 0),
  ('EPP', 'Tapaoidos tipo copa', 'Protección auditiva', 'Unidad', array['Única'], 0)
on conflict (categoria, nombre) do update set
  tipo = excluded.tipo,
  unidad = excluded.unidad,
  variantes = excluded.variantes;
