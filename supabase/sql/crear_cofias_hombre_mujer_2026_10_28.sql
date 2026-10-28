-- Crear las dos nuevas cofias. La unisex y sus movimientos no se modifican.
begin;

insert into public.catalogo_productos (categoria, nombre, tipo, unidad, variantes, stock_minimo)
values
  ('Dotación', 'MSL Cofia hombre', 'Cofia', 'Unidad', array['Única'], 20),
  ('Dotación', 'MSL Cofia mujer', 'Cofia', 'Unidad', array['Única'], 20)
on conflict (categoria, nombre) do update set stock_minimo = 20;

-- Si ya existe la talla unica con otra escritura, conservar ese registro y su stock.
update public.productos set stock_minimo = 20
where categoria = 'Dotación' and nombre in ('MSL Cofia hombre', 'MSL Cofia mujer');

insert into public.productos (categoria, nombre, tipo, variante, unidad, stock_actual, stock_minimo, ubicacion, estado)
select 'Dotación', n.nombre, 'Cofia', 'Única', 'Unidad', 0, 20, 'Bodega GH', 'Activo'
from (values ('MSL Cofia hombre'), ('MSL Cofia mujer')) as n(nombre)
where not exists (
  select 1 from public.productos p where p.categoria = 'Dotación' and p.nombre = n.nombre
)
on conflict (categoria, nombre, tipo, variante, unidad) do nothing;

select nombre, variante, stock_actual, stock_minimo from public.productos
where categoria = 'Dotación' and nombre in ('MSL Cofia hombre', 'MSL Cofia mujer')
order by nombre, variante;

commit;
