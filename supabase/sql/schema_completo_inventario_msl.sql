-- Esquema completo de Inventario MSL
-- Ejecutar en Supabase SQL Editor si se necesita reconstruir o documentar la base.

create extension if not exists pgcrypto;

create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  correo text not null unique,
  rol text not null check (rol in ('Administrador', 'Gestion Humana', 'Bodega', 'Consulta')),
  estado text not null default 'Activo' check (estado in ('Activo', 'Inactivo')),
  creado_en timestamptz not null default now()
);

create table if not exists public.catalogo_productos (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (categoria in ('Dotación', 'EPP')),
  nombre text not null,
  tipo text not null,
  unidad text not null,
  variantes text[] not null default '{}',
  stock_minimo integer not null default 0,
  creado_en timestamptz not null default now(),
  unique (categoria, nombre)
);

create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text not null check (categoria in ('Dotación', 'EPP')),
  tipo text not null,
  variante text not null,
  unidad text not null,
  stock_actual integer not null default 0,
  stock_minimo integer not null default 0,
  ubicacion text not null default 'Bodega GH',
  estado text not null default 'Activo' check (estado in ('Activo', 'Inactivo')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (categoria, nombre, tipo, variante, unidad)
);

create table if not exists public.colaboradores (
  id uuid primary key default gen_random_uuid(),
  identificacion text not null unique,
  nombre_completo text not null,
  cargo text not null,
  sub_area text not null,
  grupo text not null,
  centro_costos text not null,
  nombre_centro_costos text not null,
  sexo text not null default 'Femenino',
  estado text not null default 'Activo' check (estado in ('Activo', 'Retirado')),
  talla_antifluido text not null default 'N/A',
  talla_bata text not null default 'N/A',
  talla_camisa text not null default 'N/A',
  talla_pantalon text not null default 'N/A',
  talla_botas text not null default '',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists public.comprobantes (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  colaborador_id uuid not null references public.colaboradores(id),
  fecha date not null,
  motivo text not null,
  responsable text not null,
  observacion text,
  estado text not null default 'Activa' check (estado in ('Activa', 'Anulada')),
  motivo_anulacion text,
  creado_por uuid references auth.users(id),
  creado_en timestamptz not null default now(),
  anulado_en timestamptz
);

create table if not exists public.entregas (
  id uuid primary key default gen_random_uuid(),
  comprobante_id uuid not null references public.comprobantes(id) on delete cascade,
  colaborador_id uuid not null references public.colaboradores(id),
  producto_id uuid not null references public.productos(id),
  producto text not null,
  categoria text not null,
  tipo text not null,
  variante text not null,
  unidad text not null,
  cantidad integer not null check (cantidad > 0),
  stock_resultante integer not null,
  estado text not null default 'Activa' check (estado in ('Activa', 'Anulada')),
  creado_en timestamptz not null default now()
);

create table if not exists public.movimientos (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id),
  comprobante_id uuid references public.comprobantes(id),
  producto text not null,
  variante text not null,
  unidad text not null,
  tipo_movimiento text not null,
  cantidad integer not null check (cantidad > 0),
  fecha date not null default current_date,
  observacion text,
  stock_resultante integer not null,
  creado_por uuid references auth.users(id),
  creado_en timestamptz not null default now()
);

create table if not exists public.auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references auth.users(id),
  accion text not null,
  tabla text not null,
  registro_id uuid,
  detalle jsonb,
  creado_en timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'productos_stock_actual_no_negativo') then
    alter table public.productos
      add constraint productos_stock_actual_no_negativo check (stock_actual >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'productos_stock_minimo_no_negativo') then
    alter table public.productos
      add constraint productos_stock_minimo_no_negativo check (stock_minimo >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'entregas_stock_resultante_no_negativo') then
    alter table public.entregas
      add constraint entregas_stock_resultante_no_negativo check (stock_resultante >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'movimientos_stock_resultante_no_negativo') then
    alter table public.movimientos
      add constraint movimientos_stock_resultante_no_negativo check (stock_resultante >= 0);
  end if;
end $$;

create or replace function public.rol_usuario()
returns text
language sql
security definer
set search_path = public
as $$
  select rol
  from public.perfiles
  where id = auth.uid()
    and estado = 'Activo'
$$;

create or replace function public.set_actualizado_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

create or replace function public.registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  accion_auditoria text;
  registro uuid;
  detalle_json jsonb;
begin
  if tg_op = 'INSERT' then
    accion_auditoria := 'INSERT';
    registro := new.id;
    detalle_json := jsonb_build_object('nuevo', to_jsonb(new));
  elsif tg_op = 'UPDATE' then
    accion_auditoria := 'UPDATE';
    registro := new.id;
    detalle_json := jsonb_build_object('anterior', to_jsonb(old), 'nuevo', to_jsonb(new));
  elsif tg_op = 'DELETE' then
    accion_auditoria := 'DELETE';
    registro := old.id;
    detalle_json := jsonb_build_object('anterior', to_jsonb(old));
  end if;

  insert into public.auditoria (
    usuario_id,
    accion,
    tabla,
    registro_id,
    detalle
  )
  values (
    auth.uid(),
    accion_auditoria,
    tg_table_name,
    registro,
    detalle_json
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
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

create or replace function public.guardar_colaborador_rpc(
  p_colaborador_id uuid,
  p_colaborador jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_rol text;
  v_colaborador public.colaboradores%rowtype;
begin
  if v_usuario_id is null then
    raise exception 'Usuario no autenticado.';
  end if;

  select rol into v_rol
  from public.perfiles
  where id = v_usuario_id
    and estado = 'Activo';

  if v_rol not in ('Administrador', 'Gestion Humana') then
    raise exception 'No tienes permiso para modificar colaboradores.';
  end if;

  if nullif(trim(p_colaborador->>'identificacion'), '') is null then
    raise exception 'La identificación es obligatoria.';
  end if;

  if nullif(trim(p_colaborador->>'nombre_completo'), '') is null then
    raise exception 'El nombre completo es obligatorio.';
  end if;

  if p_colaborador_id is null then
    insert into public.colaboradores (
      identificacion,
      nombre_completo,
      cargo,
      sub_area,
      grupo,
      centro_costos,
      nombre_centro_costos,
      sexo,
      estado,
      talla_antifluido,
      talla_bata,
      talla_camisa,
      talla_pantalon,
      talla_botas
    )
    values (
      trim(p_colaborador->>'identificacion'),
      trim(p_colaborador->>'nombre_completo'),
      coalesce(nullif(trim(p_colaborador->>'cargo'), ''), 'Sin cargo'),
      coalesce(nullif(trim(p_colaborador->>'sub_area'), ''), 'Sin sub área'),
      coalesce(nullif(trim(p_colaborador->>'grupo'), ''), 'Sin grupo'),
      coalesce(nullif(trim(p_colaborador->>'centro_costos'), ''), 'Sin centro'),
      coalesce(nullif(trim(p_colaborador->>'nombre_centro_costos'), ''), 'Sin centro'),
      coalesce(nullif(trim(p_colaborador->>'sexo'), ''), 'Femenino'),
      coalesce(nullif(trim(p_colaborador->>'estado'), ''), 'Activo'),
      coalesce(nullif(trim(p_colaborador->>'talla_antifluido'), ''), 'N/A'),
      coalesce(nullif(trim(p_colaborador->>'talla_bata'), ''), 'N/A'),
      coalesce(nullif(trim(p_colaborador->>'talla_camisa'), ''), 'N/A'),
      coalesce(nullif(trim(p_colaborador->>'talla_pantalon'), ''), 'N/A'),
      coalesce(trim(p_colaborador->>'talla_botas'), '')
    )
    returning * into v_colaborador;
  else
    update public.colaboradores
    set
      identificacion = trim(p_colaborador->>'identificacion'),
      nombre_completo = trim(p_colaborador->>'nombre_completo'),
      cargo = coalesce(nullif(trim(p_colaborador->>'cargo'), ''), 'Sin cargo'),
      sub_area = coalesce(nullif(trim(p_colaborador->>'sub_area'), ''), 'Sin sub área'),
      grupo = coalesce(nullif(trim(p_colaborador->>'grupo'), ''), 'Sin grupo'),
      centro_costos = coalesce(nullif(trim(p_colaborador->>'centro_costos'), ''), 'Sin centro'),
      nombre_centro_costos = coalesce(nullif(trim(p_colaborador->>'nombre_centro_costos'), ''), 'Sin centro'),
      sexo = coalesce(nullif(trim(p_colaborador->>'sexo'), ''), 'Femenino'),
      estado = coalesce(nullif(trim(p_colaborador->>'estado'), ''), 'Activo'),
      talla_antifluido = coalesce(nullif(trim(p_colaborador->>'talla_antifluido'), ''), 'N/A'),
      talla_bata = coalesce(nullif(trim(p_colaborador->>'talla_bata'), ''), 'N/A'),
      talla_camisa = coalesce(nullif(trim(p_colaborador->>'talla_camisa'), ''), 'N/A'),
      talla_pantalon = coalesce(nullif(trim(p_colaborador->>'talla_pantalon'), ''), 'N/A'),
      talla_botas = coalesce(trim(p_colaborador->>'talla_botas'), '')
    where id = p_colaborador_id
    returning * into v_colaborador;

    if not found then
      raise exception 'El colaborador no existe.';
    end if;
  end if;

  return to_jsonb(v_colaborador);
end;
$$;

create or replace function public.eliminar_colaborador_rpc(
  p_colaborador_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_rol text;
  v_colaborador public.colaboradores%rowtype;
  v_entregas integer;
begin
  if v_usuario_id is null then
    raise exception 'Usuario no autenticado.';
  end if;

  select rol into v_rol
  from public.perfiles
  where id = v_usuario_id
    and estado = 'Activo';

  if v_rol not in ('Administrador', 'Gestion Humana') then
    raise exception 'No tienes permiso para eliminar o retirar colaboradores.';
  end if;

  select *
  into v_colaborador
  from public.colaboradores
  where id = p_colaborador_id
  for update;

  if not found then
    raise exception 'El colaborador no existe.';
  end if;

  select count(*)::integer
  into v_entregas
  from public.entregas
  where colaborador_id = p_colaborador_id;

  if v_entregas > 0 then
    update public.colaboradores
    set estado = 'Retirado'
    where id = p_colaborador_id
    returning * into v_colaborador;

    return jsonb_build_object(
      'accion', 'retirado',
      'colaborador', to_jsonb(v_colaborador)
    );
  end if;

  delete from public.colaboradores
  where id = p_colaborador_id;

  return jsonb_build_object(
    'accion', 'eliminado',
    'colaboradorId', p_colaborador_id
  );
end;
$$;

create or replace function public.listar_responsables_entrega_rpc()
returns table (
  id uuid,
  nombre text,
  correo text,
  rol text,
  estado text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_rol text;
begin
  if v_usuario_id is null then
    raise exception 'Usuario no autenticado.';
  end if;

  select p.rol into v_rol
  from public.perfiles p
  where p.id = v_usuario_id
    and p.estado = 'Activo';

  if v_rol is null then
    raise exception 'El usuario no tiene perfil activo.';
  end if;

  return query
  select
    p.id,
    p.nombre,
    p.correo,
    p.rol,
    p.estado
  from public.perfiles p
  where p.estado = 'Activo'
  order by p.nombre;
end;
$$;

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

create or replace function public.registrar_entrega_rpc(
  p_colaborador_id uuid,
  p_fecha date,
  p_motivo text,
  p_responsable text,
  p_observacion text,
  p_lineas jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_rol text;
  v_colaborador public.colaboradores%rowtype;
  v_comprobante_id uuid := gen_random_uuid();
  v_numero text;
  v_linea record;
  v_producto public.productos%rowtype;
  v_stock_final integer;
  v_entregas jsonb := '[]'::jsonb;
  v_movimientos jsonb := '[]'::jsonb;
  v_entrega_id uuid;
  v_movimiento_id uuid;
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

  if v_rol not in ('Administrador', 'Gestion Humana') then
    raise exception 'No tienes permiso para registrar entregas.';
  end if;

  if p_colaborador_id is null then
    raise exception 'Debes seleccionar un colaborador.';
  end if;

  if p_fecha is null then
    raise exception 'La fecha de entrega es obligatoria.';
  end if;

  if nullif(trim(p_motivo), '') is null then
    raise exception 'El motivo de entrega es obligatorio.';
  end if;

  if nullif(trim(p_responsable), '') is null then
    raise exception 'El responsable de entrega es obligatorio.';
  end if;

  if p_lineas is null
     or jsonb_typeof(p_lineas) <> 'array'
     or jsonb_array_length(p_lineas) = 0 then
    raise exception 'Debes enviar al menos una línea de entrega.';
  end if;

  select *
  into v_colaborador
  from public.colaboradores
  where id = p_colaborador_id
  for update;

  if not found then
    raise exception 'El colaborador no existe.';
  end if;

  if v_colaborador.estado = 'Retirado' then
    raise exception 'No se puede registrar una entrega a un colaborador retirado.';
  end if;

  v_numero := 'CE-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(v_comprobante_id::text, 1, 8));

  insert into public.comprobantes (
    id,
    numero,
    colaborador_id,
    fecha,
    motivo,
    responsable,
    observacion,
    estado,
    creado_por
  )
  values (
    v_comprobante_id,
    v_numero,
    p_colaborador_id,
    p_fecha,
    trim(p_motivo),
    trim(p_responsable),
    nullif(trim(coalesce(p_observacion, '')), ''),
    'Activa',
    v_usuario_id
  );

  for v_linea in
    select
      producto_id,
      sum(cantidad)::integer as cantidad
    from jsonb_to_recordset(p_lineas) as x(
      producto_id uuid,
      cantidad integer
    )
    group by producto_id
  loop
    if v_linea.producto_id is null then
      raise exception 'Una línea no tiene producto.';
    end if;

    if v_linea.cantidad is null or v_linea.cantidad <= 0 then
      raise exception 'La cantidad debe ser mayor a cero.';
    end if;

    select *
    into v_producto
    from public.productos
    where id = v_linea.producto_id
    for update;

    if not found then
      raise exception 'El producto % no existe.', v_linea.producto_id;
    end if;

    if v_producto.estado = 'Inactivo' then
      raise exception 'El producto % está inactivo.', v_producto.nombre;
    end if;

    if v_producto.stock_actual < v_linea.cantidad then
      raise exception 'No hay stock suficiente para % - %. Stock actual: %, solicitado: %.',
        v_producto.nombre,
        v_producto.variante,
        v_producto.stock_actual,
        v_linea.cantidad;
    end if;

    v_stock_final := v_producto.stock_actual - v_linea.cantidad;

    update public.productos
    set stock_actual = v_stock_final
    where id = v_producto.id;

    v_entrega_id := gen_random_uuid();

    insert into public.entregas (
      id,
      comprobante_id,
      colaborador_id,
      producto_id,
      producto,
      categoria,
      tipo,
      variante,
      unidad,
      cantidad,
      stock_resultante,
      estado
    )
    values (
      v_entrega_id,
      v_comprobante_id,
      p_colaborador_id,
      v_producto.id,
      v_producto.nombre,
      v_producto.categoria,
      v_producto.tipo,
      v_producto.variante,
      v_producto.unidad,
      v_linea.cantidad,
      v_stock_final,
      'Activa'
    );

    v_movimiento_id := gen_random_uuid();

    insert into public.movimientos (
      id,
      producto_id,
      comprobante_id,
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
      v_movimiento_id,
      v_producto.id,
      v_comprobante_id,
      v_producto.nombre,
      v_producto.variante,
      v_producto.unidad,
      'Entrega',
      v_linea.cantidad,
      p_fecha,
      'Entrega a ' || v_colaborador.nombre_completo || '. Motivo: ' || trim(p_motivo) || '. Comprobante: ' || v_numero,
      v_stock_final,
      v_usuario_id
    );

    v_entregas := v_entregas || jsonb_build_array(
      jsonb_build_object(
        'id', v_entrega_id,
        'comprobanteId', v_comprobante_id,
        'numeroComprobante', v_numero,
        'estado', 'Activa',
        'colaboradorId', p_colaborador_id,
        'colaborador', v_colaborador.nombre_completo,
        'identificacion', v_colaborador.identificacion,
        'grupo', v_colaborador.grupo,
        'centroCostos', v_colaborador.centro_costos,
        'nombreCentroCostos', v_colaborador.nombre_centro_costos,
        'productoId', v_producto.id,
        'producto', v_producto.nombre,
        'categoria', v_producto.categoria,
        'tipo', v_producto.tipo,
        'variante', v_producto.variante,
        'unidad', v_producto.unidad,
        'cantidad', v_linea.cantidad,
        'fecha', p_fecha,
        'motivo', trim(p_motivo),
        'responsable', trim(p_responsable),
        'observacion', coalesce(p_observacion, ''),
        'stockResultante', v_stock_final
      )
    );

    v_movimientos := v_movimientos || jsonb_build_array(
      jsonb_build_object(
        'id', v_movimiento_id,
        'comprobanteId', v_comprobante_id,
        'productoId', v_producto.id,
        'producto', v_producto.nombre,
        'variante', v_producto.variante,
        'unidad', v_producto.unidad,
        'tipoMovimiento', 'Entrega',
        'cantidad', v_linea.cantidad,
        'fecha', p_fecha,
        'observacion', 'Entrega a ' || v_colaborador.nombre_completo || '. Motivo: ' || trim(p_motivo) || '. Comprobante: ' || v_numero,
        'stockResultante', v_stock_final
      )
    );
  end loop;

  return jsonb_build_object(
    'comprobante', jsonb_build_object(
      'id', v_comprobante_id,
      'numero', v_numero,
      'colaboradorId', p_colaborador_id,
      'fecha', p_fecha,
      'motivo', trim(p_motivo),
      'responsable', trim(p_responsable),
      'observacion', coalesce(p_observacion, ''),
      'estado', 'Activa'
    ),
    'entregas', v_entregas,
    'movimientos', v_movimientos
  );
end;
$$;

create or replace function public.anular_comprobante_rpc(
  p_entrega_id uuid,
  p_motivo_anulacion text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_rol text;
  v_entrega public.entregas%rowtype;
  v_comprobante public.comprobantes%rowtype;
  v_linea record;
  v_producto public.productos%rowtype;
  v_stock_final integer;
  v_movimiento_id uuid;
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

  if v_rol is null then
    raise exception 'El usuario no tiene perfil activo.';
  end if;

  if v_rol not in ('Administrador', 'Gestion Humana') then
    raise exception 'No tienes permiso para anular comprobantes.';
  end if;

  if p_entrega_id is null then
    raise exception 'Debes enviar una entrega para anular.';
  end if;

  if nullif(trim(p_motivo_anulacion), '') is null
     or length(trim(p_motivo_anulacion)) < 8 then
    raise exception 'La anulación necesita un motivo de al menos 8 caracteres.';
  end if;

  select *
  into v_entrega
  from public.entregas
  where id = p_entrega_id;

  if not found then
    raise exception 'La entrega no existe.';
  end if;

  select *
  into v_comprobante
  from public.comprobantes
  where id = v_entrega.comprobante_id
  for update;

  if not found then
    raise exception 'El comprobante no existe.';
  end if;

  if v_comprobante.estado = 'Anulada' then
    raise exception 'El comprobante ya está anulado.';
  end if;

  update public.comprobantes
  set
    estado = 'Anulada',
    motivo_anulacion = trim(p_motivo_anulacion),
    anulado_en = now()
  where id = v_comprobante.id;

  for v_linea in
    select *
    from public.entregas
    where comprobante_id = v_comprobante.id
      and estado = 'Activa'
    order by creado_en, id
    for update
  loop
    select *
    into v_producto
    from public.productos
    where id = v_linea.producto_id
    for update;

    if not found then
      raise exception 'El producto de la entrega % no existe.', v_linea.id;
    end if;

    v_stock_final := v_producto.stock_actual + v_linea.cantidad;

    update public.productos
    set stock_actual = v_stock_final
    where id = v_producto.id;

    update public.entregas
    set estado = 'Anulada'
    where id = v_linea.id;

    v_movimiento_id := gen_random_uuid();

    insert into public.movimientos (
      id,
      producto_id,
      comprobante_id,
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
      v_movimiento_id,
      v_producto.id,
      v_comprobante.id,
      v_producto.nombre,
      v_producto.variante,
      v_producto.unidad,
      'Anulación de comprobante',
      v_linea.cantidad,
      current_date,
      'Anulación comprobante ' || v_comprobante.numero || '. Motivo: ' || trim(p_motivo_anulacion),
      v_stock_final,
      v_usuario_id
    );

    v_movimientos := v_movimientos || jsonb_build_array(
      jsonb_build_object(
        'id', v_movimiento_id,
        'comprobanteId', v_comprobante.id,
        'productoId', v_producto.id,
        'producto', v_producto.nombre,
        'variante', v_producto.variante,
        'unidad', v_producto.unidad,
        'tipoMovimiento', 'Anulación de comprobante',
        'cantidad', v_linea.cantidad,
        'fecha', current_date,
        'observacion', 'Anulación comprobante ' || v_comprobante.numero || '. Motivo: ' || trim(p_motivo_anulacion),
        'stockResultante', v_stock_final
      )
    );

    v_productos := v_productos || jsonb_build_array(
      jsonb_build_object(
        'id', v_producto.id,
        'stockActual', v_stock_final
      )
    );
  end loop;

  return jsonb_build_object(
    'comprobanteId', v_comprobante.id,
    'numeroComprobante', v_comprobante.numero,
    'estado', 'Anulada',
    'motivoAnulacion', trim(p_motivo_anulacion),
    'movimientos', v_movimientos,
    'productos', v_productos
  );
end;
$$;

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

drop trigger if exists productos_set_actualizado_en on public.productos;
create trigger productos_set_actualizado_en
before update on public.productos
for each row
execute function public.set_actualizado_en();

drop trigger if exists colaboradores_set_actualizado_en on public.colaboradores;
create trigger colaboradores_set_actualizado_en
before update on public.colaboradores
for each row
execute function public.set_actualizado_en();

drop trigger if exists auditoria_productos on public.productos;
create trigger auditoria_productos
after insert or update or delete on public.productos
for each row execute function public.registrar_auditoria();

drop trigger if exists auditoria_colaboradores on public.colaboradores;
create trigger auditoria_colaboradores
after insert or update or delete on public.colaboradores
for each row execute function public.registrar_auditoria();

drop trigger if exists auditoria_comprobantes on public.comprobantes;
create trigger auditoria_comprobantes
after insert or update or delete on public.comprobantes
for each row execute function public.registrar_auditoria();

drop trigger if exists auditoria_entregas on public.entregas;
create trigger auditoria_entregas
after insert or update or delete on public.entregas
for each row execute function public.registrar_auditoria();

drop trigger if exists auditoria_movimientos on public.movimientos;
create trigger auditoria_movimientos
after insert or update or delete on public.movimientos
for each row execute function public.registrar_auditoria();

drop trigger if exists auditoria_catalogo_productos on public.catalogo_productos;
create trigger auditoria_catalogo_productos
after insert or update or delete on public.catalogo_productos
for each row execute function public.registrar_auditoria();

alter table public.perfiles enable row level security;
alter table public.catalogo_productos enable row level security;
alter table public.productos enable row level security;
alter table public.colaboradores enable row level security;
alter table public.comprobantes enable row level security;
alter table public.entregas enable row level security;
alter table public.movimientos enable row level security;
alter table public.auditoria enable row level security;

drop policy if exists "perfiles lectura propia o admin" on public.perfiles;
create policy "perfiles lectura propia o admin"
on public.perfiles
for select
to authenticated
using (
  id = auth.uid()
  or public.rol_usuario() = 'Administrador'
);

drop policy if exists "perfiles solo admin modifica" on public.perfiles;
create policy "perfiles solo admin modifica"
on public.perfiles
for all
to authenticated
using (public.rol_usuario() = 'Administrador')
with check (public.rol_usuario() = 'Administrador');

drop policy if exists "catalogo lectura autenticados" on public.catalogo_productos;
create policy "catalogo lectura autenticados"
on public.catalogo_productos
for select
to authenticated
using (true);

drop policy if exists "catalogo admin y bodega modifican" on public.catalogo_productos;
drop policy if exists "catalogo admin gh bodega modifican" on public.catalogo_productos;

drop policy if exists "productos lectura autenticados" on public.productos;
create policy "productos lectura autenticados"
on public.productos
for select
to authenticated
using (true);

drop policy if exists "productos admin y bodega modifican" on public.productos;
drop policy if exists "productos admin gh bodega modifican" on public.productos;

drop policy if exists "colaboradores lectura autenticados" on public.colaboradores;
create policy "colaboradores lectura autenticados"
on public.colaboradores
for select
to authenticated
using (true);

drop policy if exists "colaboradores admin y gh modifican" on public.colaboradores;

drop policy if exists "comprobantes lectura autenticados" on public.comprobantes;
create policy "comprobantes lectura autenticados"
on public.comprobantes
for select
to authenticated
using (true);

drop policy if exists "comprobantes admin y gh modifican" on public.comprobantes;

drop policy if exists "entregas lectura autenticados" on public.entregas;
create policy "entregas lectura autenticados"
on public.entregas
for select
to authenticated
using (true);

drop policy if exists "entregas admin y gh modifican" on public.entregas;

drop policy if exists "movimientos lectura autenticados" on public.movimientos;
create policy "movimientos lectura autenticados"
on public.movimientos
for select
to authenticated
using (true);

drop policy if exists "movimientos admin bodega gh modifican" on public.movimientos;

drop policy if exists "auditoria lectura admin" on public.auditoria;
create policy "auditoria lectura admin"
on public.auditoria
for select
  to authenticated
  using (public.rol_usuario() = 'Administrador');

drop policy if exists "auditoria insercion autenticados" on public.auditoria;

grant execute on function public.guardar_catalogo_producto_rpc(uuid, jsonb) to authenticated;
grant execute on function public.guardar_colaborador_rpc(uuid, jsonb) to authenticated;
grant execute on function public.eliminar_colaborador_rpc(uuid) to authenticated;
grant execute on function public.guardar_producto_movimiento_rpc(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.registrar_entrega_rpc(uuid, date, text, text, text, jsonb) to authenticated;
grant execute on function public.anular_comprobante_rpc(uuid, text) to authenticated;
grant execute on function public.eliminar_producto_admin_rpc(uuid) to authenticated;
grant execute on function public.listar_responsables_entrega_rpc() to authenticated;

insert into public.perfiles (
  id,
  nombre,
  correo,
  rol,
  estado
)
values
  (
    '43fc6d52-f3db-4189-9780-1c7004df2b55',
    'Angie Ladino',
    'angie.ladino@msl.net.co',
    'Consulta',
    'Activo'
  ),
  (
    'c3982873-4898-419f-97a4-8ccf7206c151',
    'Alejandro Jaramillo',
    'alejandro.jaramillo@msl.net.co',
    'Administrador',
    'Activo'
  )
on conflict (id) do update set
  nombre = excluded.nombre,
  correo = excluded.correo,
  rol = excluded.rol,
  estado = excluded.estado;
