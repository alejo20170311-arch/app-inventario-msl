-- Compras por factura para Inventario MSL.
-- Version sin PL/pgSQL para evitar que el SQL Editor corte funciones por punto y coma internos.

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
language sql
security definer
set search_path = public
return (
with
entrada as (
  select
    auth.uid() as usuario_id,
    nullif(trim(p_compra->>'numero_factura'), '') as numero_factura,
    nullif(p_compra->>'fecha', '')::date as fecha,
    nullif(trim(p_compra->>'proveedor'), '') as proveedor,
    nullif(trim(p_compra->>'responsable'), '') as responsable,
    nullif(trim(coalesce(p_compra->>'observacion', '')), '') as observacion
),
permiso as (
  select exists (
    select 1
    from public.perfiles p
    join entrada e on p.id = e.usuario_id
    where p.estado = 'Activo'
      and p.rol in ('Administrador', 'Gestion Humana', 'Bodega')
  ) as permitido
),
lineas_raw as (
  select
    x.producto_id,
    x.cantidad,
    coalesce(x.valor_unitario, 0) as valor_unitario,
    nullif(trim(coalesce(x.observacion, '')), '') as observacion
  from jsonb_to_recordset(coalesce(p_lineas, '[]'::jsonb)) as x(
    producto_id uuid,
    cantidad integer,
    valor_unitario numeric,
    observacion text
  )
),
lineas_producto as (
  select
    lr.producto_id,
    lr.cantidad,
    lr.valor_unitario,
    lr.observacion,
    p.nombre,
    p.categoria,
    p.tipo,
    p.variante,
    p.unidad
  from lineas_raw lr
  join public.productos p on p.id = lr.producto_id
  where p.estado = 'Activo'
    and lr.cantidad > 0
    and lr.valor_unitario >= 0
),
validacion as (
  select
    e.usuario_id is not null
    and (select permitido from permiso)
    and e.numero_factura is not null
    and e.fecha is not null
    and e.proveedor is not null
    and e.responsable is not null
    and jsonb_typeof(coalesce(p_lineas, 'null'::jsonb)) = 'array'
    and (select count(*) from lineas_raw) > 0
    and (select count(*) from lineas_raw) = (select count(*) from lineas_producto)
    and not exists (
      select 1
      from public.compras c
      where lower(c.numero_factura) = lower(e.numero_factura)
    ) as ok
  from entrada e
),
compra_insertada as (
  insert into public.compras (
    numero_factura,
    fecha,
    proveedor,
    responsable,
    observacion,
    creado_por
  )
  select
    e.numero_factura,
    e.fecha,
    e.proveedor,
    e.responsable,
    e.observacion,
    e.usuario_id
  from entrada e
  cross join validacion v
  where v.ok
  returning *
),
cantidades as (
  select producto_id, sum(cantidad)::integer as cantidad_total
  from lineas_producto
  group by producto_id
),
productos_actualizados as (
  update public.productos p
  set stock_actual = p.stock_actual + c.cantidad_total
  from cantidades c
  where p.id = c.producto_id
    and exists (select 1 from compra_insertada)
  returning p.*
),
lineas_insertadas as (
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
  select
    ci.id,
    lp.producto_id,
    lp.nombre,
    lp.categoria,
    lp.tipo,
    lp.variante,
    lp.unidad,
    lp.cantidad,
    lp.valor_unitario,
    lp.observacion,
    pa.stock_actual
  from compra_insertada ci
  join lineas_producto lp on true
  join productos_actualizados pa on pa.id = lp.producto_id
  returning *
),
movimientos_insertados as (
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
  select
    li.producto_id,
    li.producto,
    li.variante,
    li.unidad,
    'Compra',
    li.cantidad,
    ci.fecha,
    'Compra factura ' || ci.numero_factura || '. Proveedor: ' || ci.proveedor,
    li.stock_resultante,
    ci.creado_por
  from lineas_insertadas li
  join compra_insertada ci on ci.id = li.compra_id
  returning *
)
select jsonb_build_object(
  'compra',
  case
    when exists (select 1 from compra_insertada) then
      (select to_jsonb(ci) || jsonb_build_object(
        'compra_lineas',
        coalesce((select jsonb_agg(to_jsonb(li) order by li.creado_en) from lineas_insertadas li), '[]'::jsonb)
      ) from compra_insertada ci)
    else null
  end,
  'movimientos',
  coalesce((select jsonb_agg(to_jsonb(mi) order by mi.creado_en) from movimientos_insertados mi), '[]'::jsonb),
  'productos',
  coalesce((select jsonb_agg(to_jsonb(pa) order by pa.nombre) from productos_actualizados pa), '[]'::jsonb)
)
);

create or replace function public.adjuntar_factura_compra_rpc(
  p_compra_id uuid,
  p_factura_url text,
  p_factura_ruta text
)
returns jsonb
language sql
security definer
set search_path = public
return (
with
permiso as (
  select exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and p.estado = 'Activo'
      and p.rol in ('Administrador', 'Gestion Humana', 'Bodega')
  ) as permitido
),
compra_actualizada as (
  update public.compras c
  set
    factura_url = nullif(trim(coalesce(p_factura_url, '')), ''),
    factura_ruta = nullif(trim(coalesce(p_factura_ruta, '')), '')
  where c.id = p_compra_id
    and (select permitido from permiso)
    and (
      nullif(trim(coalesce(p_factura_url, '')), '') is not null
      or nullif(trim(coalesce(p_factura_ruta, '')), '') is not null
    )
  returning *
)
select
  case
    when exists (select 1 from compra_actualizada) then
      (select to_jsonb(ca) || jsonb_build_object(
        'compra_lineas',
        coalesce((
          select jsonb_agg(to_jsonb(cl) order by cl.creado_en)
          from public.compra_lineas cl
          where cl.compra_id = ca.id
        ), '[]'::jsonb)
      ) from compra_actualizada ca)
    else null
  end
);

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
