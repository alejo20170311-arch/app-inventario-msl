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

  if v_rol not in ('Administrador', 'Bodega') then
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

    if p_movimiento is not null and v_producto.estado = 'Inactivo' then
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
