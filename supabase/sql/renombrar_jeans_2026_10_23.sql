-- Guardar los nombres nuevos sin modificar cantidades ni historicos de compras/entregas.
begin;

create temporary table nombres_jeans (clave text primary key, nombre text not null) on commit drop;
insert into nombres_jeans values
  ('msljeanhombre', 'Pantalon Jean Hombre Cinta Reflectiva'),
  ('pantalonjeanhombrecintareflectiva', 'Pantalon Jean Hombre Cinta Reflectiva'),
  ('jeanhombre', 'Jean Hombre Licrado'),
  ('msljeanhombrelicrado', 'Jean Hombre Licrado'),
  ('pantalonjeanhombrelicrado', 'Jean Hombre Licrado'),
  ('jeanhombrelicrado', 'Jean Hombre Licrado'),
  ('msljeanmujer', 'Jean Mujer Licrado'),
  ('jeanmujer', 'Jean Mujer Licrado'),
  ('msljeanmujerlicrado', 'Jean Mujer Licrado'),
  ('pantalonjeanmujerlicrado', 'Jean Mujer Licrado'),
  ('jeanmujerlicrado', 'Jean Mujer Licrado');

create or replace function pg_temp.clave_nombre_jean(valor text)
returns text language sql immutable as $$
  select regexp_replace(translate(lower(coalesce(valor, '')), 'áéíóúüñ', 'aeiouun'), '[^a-z0-9]', '', 'g');
$$;

-- No fusionar productos distintos que coincidan en nombre, tipo y talla.
do $$
begin
  if exists (
    select 1 from public.productos p
    left join nombres_jeans n on n.clave = pg_temp.clave_nombre_jean(p.nombre)
    where p.categoria = 'Dotación'
    group by p.categoria, coalesce(n.nombre, p.nombre), p.tipo, p.variante, p.unidad
    having count(*) > 1 and bool_or(n.nombre is not null and n.nombre <> p.nombre)
  ) or exists (
    select 1 from public.catalogo_productos c
    left join nombres_jeans n on n.clave = pg_temp.clave_nombre_jean(c.nombre)
    where c.categoria = 'Dotación'
    group by c.categoria, coalesce(n.nombre, c.nombre)
    having count(*) > 1 and bool_or(n.nombre is not null and n.nombre <> c.nombre)
  ) then
    raise exception 'Hay nombres que quedarian duplicados. Revisar los jeans antes de renombrar; no se ha cambiado nada.';
  end if;
end;
$$;

create table if not exists public.respaldo_nombres_jeans_20261023 (
  tabla text not null, registro_id uuid not null, datos jsonb not null,
  respaldado_en timestamptz not null default now(), primary key (tabla, registro_id)
);
alter table public.respaldo_nombres_jeans_20261023 enable row level security;
revoke all on public.respaldo_nombres_jeans_20261023 from anon, authenticated;

insert into public.respaldo_nombres_jeans_20261023 (tabla, registro_id, datos)
select 'productos', p.id, jsonb_build_object('nombre', p.nombre)
from public.productos p join nombres_jeans n on n.clave = pg_temp.clave_nombre_jean(p.nombre)
where p.categoria = 'Dotación' and p.nombre <> n.nombre
union all
select 'catalogo_productos', c.id, jsonb_build_object('nombre', c.nombre)
from public.catalogo_productos c join nombres_jeans n on n.clave = pg_temp.clave_nombre_jean(c.nombre)
where c.categoria = 'Dotación' and c.nombre <> n.nombre
on conflict (tabla, registro_id) do nothing;

update public.productos p set nombre = n.nombre
from nombres_jeans n
where p.categoria = 'Dotación' and n.clave = pg_temp.clave_nombre_jean(p.nombre) and p.nombre <> n.nombre;

update public.catalogo_productos c set nombre = n.nombre
from nombres_jeans n
where c.categoria = 'Dotación' and n.clave = pg_temp.clave_nombre_jean(c.nombre) and c.nombre <> n.nombre;

create temporary table asignaciones_jeans on commit drop as
select c.id, string_agg(coalesce(n.nombre, trim(p.nombre)), '+' order by p.orden) as nueva_dotacion
from public.colaboradores c
cross join lateral unnest(string_to_array(c.tipo_dotacion, '+')) with ordinality as p(nombre, orden)
left join nombres_jeans n on n.clave = pg_temp.clave_nombre_jean(p.nombre)
group by c.id;

insert into public.respaldo_nombres_jeans_20261023 (tabla, registro_id, datos)
select 'colaboradores', c.id, jsonb_build_object('tipo_dotacion', c.tipo_dotacion)
from public.colaboradores c join asignaciones_jeans a on a.id = c.id
where c.tipo_dotacion is distinct from a.nueva_dotacion
on conflict (tabla, registro_id) do nothing;

update public.colaboradores c set tipo_dotacion = a.nueva_dotacion
from asignaciones_jeans a where c.id = a.id and c.tipo_dotacion is distinct from a.nueva_dotacion;

select nombre, variante, stock_actual from public.productos
where nombre in ('Pantalon Jean Hombre Cinta Reflectiva', 'Jean Hombre Licrado', 'Jean Mujer Licrado')
order by nombre, variante;

commit;
