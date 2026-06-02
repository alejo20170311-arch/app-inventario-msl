-- Reparacion de Compras/Facturas para Inventario MSL.
-- Ejecutar en Supabase SQL Editor si el modulo de compras no guarda, no adjunta facturas,
-- o si falta aplicar el SQL de compras en una base ya existente.

create table if not exists public.compras (
  id uuid primary key default gen_random_uuid(),
  numero_factura text not null unique,
  fecha date not null,
  proveedor text not null,
  responsable text not null,
  observacion text,
  factura_url text,
  factura_ruta text,
  estado text not null default 'Registrada' check (estado in ('Registrada', 'Anulada')),
  creado_por uuid references auth.users(id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists public.compra_lineas (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references public.compras(id) on delete cascade,
  producto_id uuid not null references public.productos(id),
  producto text not null,
  categoria text not null,
  tipo text not null,
  variante text not null,
  unidad text not null,
  cantidad integer not null check (cantidad > 0),
  valor_unitario numeric(14, 2) not null default 0 check (valor_unitario >= 0),
  observacion text,
  stock_resultante integer not null check (stock_resultante >= 0),
  creado_en timestamptz not null default now()
);

drop trigger if exists compras_set_actualizado_en on public.compras;
create trigger compras_set_actualizado_en
before update on public.compras
for each row
execute function public.set_actualizado_en();

drop trigger if exists auditoria_compras on public.compras;
create trigger auditoria_compras
after insert or update or delete on public.compras
for each row execute function public.registrar_auditoria();

drop trigger if exists auditoria_compra_lineas on public.compra_lineas;
create trigger auditoria_compra_lineas
after insert or update or delete on public.compra_lineas
for each row execute function public.registrar_auditoria();

alter table public.compras enable row level security;
alter table public.compra_lineas enable row level security;

drop policy if exists "compras lectura autenticados" on public.compras;
create policy "compras lectura autenticados"
on public.compras
for select
to authenticated
using (true);

drop policy if exists "compra lineas lectura autenticados" on public.compra_lineas;
create policy "compra lineas lectura autenticados"
on public.compra_lineas
for select
to authenticated
using (true);

create or replace function public.registrar_compra_rpc(
  p_compra jsonb,
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
  v_compra public.compras%rowtype;
  v_linea record;
  v_producto public.productos%rowtype;
  v_producto_actualizado public.productos%rowtype;
  v_linea_compra public.compra_lineas%rowtype;
  v_movimiento public.movimientos%rowtype;
  v_numero_factura text;
  v_fecha date;
  v_proveedor text;
  v_responsable text;
  v_observacion text;
  v_lineas jsonb := '[]'::jsonb;
  v_movimientos jsonb := '[]'::jsonb;
  v_productos jsonb := '[]'::jsonb;
begin
  if v_usuario_id is null then
    raise exception 'Usuario no autenticado.';
  end if;

  select rol into v_rol
  from public.perfiles
  where id = v_usuario_id
    and estado = 'Activo';

  if v_rol not in ('Administrador', 'Gestion Humana', 'Bodega') then
    raise exception 'No tienes permiso para registrar compras.';
  end if;

  if p_compra is null or jsonb_typeof(p_compra) <> 'object' then
    raise exception 'Debes enviar los datos de la compra.';
  end if;

  if p_lineas is null
     or jsonb_typeof(p_lineas) <> 'array'
     or jsonb_array_length(p_lineas) = 0 then
    raise exception 'Debes enviar al menos una linea de compra.';
  end if;

  v_numero_factura := nullif(trim(p_compra->>'numero_factura'), '');
  v_fecha := nullif(p_compra->>'fecha', '')::date;
  v_proveedor := nullif(trim(p_compra->>'proveedor'), '');
  v_responsable := nullif(trim(p_compra->>'responsable'), '');
  v_observacion := nullif(trim(coalesce(p_compra->>'observacion', '')), '');

  if v_numero_factura is null then
    raise exception 'El numero de factura es obligatorio.';
  end if;

  if v_fecha is null then
    raise exception 'La fecha de factura es obligatoria.';
  end if;

  if v_proveedor is null then
    raise exception 'El proveedor es obligatorio.';
  end if;

  if v_responsable is null then
    raise exception 'El responsable es obligatorio.';
  end if;

  if exists (
    select 1
    from public.compras
    where lower(numero_factura) = lower(v_numero_factura)
  ) then
    raise exception 'Ya existe una compra con esa factura.';
  end if;

  insert into public.compras (
    numero_factura,
    fecha,
    proveedor,
    responsable,
    observacion,
    creado_por
  )
  values (
    v_numero_factura,
    v_fecha,
    v_proveedor,
    v_responsable,
    v_observacion,
    v_usuario_id
  )
  returning * into v_compra;

  for v_linea in
    select *
    from jsonb_to_recordset(p_lineas) as x(
      producto_id uuid,
      cantidad integer,
      valor_unitario numeric,
      observacion text
    )
  loop
    if v_linea.producto_id is null then
      raise exception 'Una linea no tiene producto.';
    end if;

    if v_linea.cantidad is null or v_linea.cantidad <= 0 then
      raise exception 'La cantidad debe ser mayor a cero.';
    end if;

    if coalesce(v_linea.valor_unitario, 0) < 0 then
      raise exception 'El valor unitario no puede ser negativo.';
    end if;

    select *
    into v_producto
    from public.productos
    where id = v_linea.producto_id
    for update;

    if not found then
      raise exception 'El producto % no existe.', v_linea.producto_id;
    end if;

    if v_producto.estado <> 'Activo' then
      raise exception 'El producto % esta inactivo.', v_producto.nombre;
    end if;

    update public.productos
    set stock_actual = stock_actual + v_linea.cantidad
    where id = v_producto.id
    returning * into v_producto_actualizado;

    insert into public.compra_lineas (
      compra_id,
      producto_id,
      producto,
      categoria,
      tipo,
      variante,
      unidad,
      cantidad,
      valor_unitario,
      observacion,
      stock_resultante
    )
    values (
      v_compra.id,
      v_producto.id,
      v_producto.nombre,
      v_producto.categoria,
      v_producto.tipo,
      v_producto.variante,
      v_producto.unidad,
      v_linea.cantidad,
      coalesce(v_linea.valor_unitario, 0),
      nullif(trim(coalesce(v_linea.observacion, '')), ''),
      v_producto_actualizado.stock_actual
    )
    returning * into v_linea_compra;

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
      'Compra',
      v_linea.cantidad,
      v_fecha,
      'Compra factura ' || v_numero_factura || '. Proveedor: ' || v_proveedor,
      v_producto_actualizado.stock_actual,
      v_usuario_id
    )
    returning * into v_movimiento;

    v_lineas := v_lineas || jsonb_build_array(to_jsonb(v_linea_compra));
    v_movimientos := v_movimientos || jsonb_build_array(to_jsonb(v_movimiento));
    v_productos := v_productos || jsonb_build_array(to_jsonb(v_producto_actualizado));
  end loop;

  return jsonb_build_object(
    'compra', to_jsonb(v_compra) || jsonb_build_object('compra_lineas', v_lineas),
    'movimientos', v_movimientos,
    'productos', v_productos
  );
end;
$$;

create or replace function public.adjuntar_factura_compra_rpc(
  p_compra_id uuid,
  p_factura_url text,
  p_factura_ruta text
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
  v_lineas jsonb;
begin
  if v_usuario_id is null then
    raise exception 'Usuario no autenticado.';
  end if;

  select rol into v_rol
  from public.perfiles
  where id = v_usuario_id
    and estado = 'Activo';

  if v_rol not in ('Administrador', 'Gestion Humana', 'Bodega') then
    raise exception 'No tienes permiso para adjuntar facturas.';
  end if;

  if p_compra_id is null then
    raise exception 'Debes seleccionar una compra.';
  end if;

  if nullif(trim(coalesce(p_factura_url, '')), '') is null
     and nullif(trim(coalesce(p_factura_ruta, '')), '') is null then
    raise exception 'Debes enviar la factura adjunta.';
  end if;

  update public.compras
  set
    factura_url = nullif(trim(coalesce(p_factura_url, '')), ''),
    factura_ruta = nullif(trim(coalesce(p_factura_ruta, '')), '')
  where id = p_compra_id
  returning * into v_compra;

  if not found then
    raise exception 'La compra no existe.';
  end if;

  select coalesce(jsonb_agg(to_jsonb(linea) order by linea.creado_en), '[]'::jsonb)
  into v_lineas
  from public.compra_lineas linea
  where linea.compra_id = v_compra.id;

  return to_jsonb(v_compra) || jsonb_build_object('compra_lineas', v_lineas);
end;
$$;

grant execute on function public.registrar_compra_rpc(jsonb, jsonb) to authenticated;
grant execute on function public.adjuntar_factura_compra_rpc(uuid, text, text) to authenticated;

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
