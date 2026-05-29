-- Actualiza el catalogo EPP con los tipos y tallas definidos para la app.
-- Ejecutar en Supabase SQL Editor despues de publicar el frontend.

alter table public.productos
  drop constraint if exists productos_categoria_nombre_variante_unidad_key;

alter table public.productos
  add constraint productos_categoria_nombre_tipo_variante_unidad_key
  unique (categoria, nombre, tipo, variante, unidad);

delete from public.catalogo_productos
where categoria = 'EPP'
  and nombre = 'Tapaoidos tipo copa';

update public.catalogo_productos
set nombre = 'Tapabocas quirurgico'
where categoria = 'EPP'
  and nombre = 'Tapabocas negro quirurgico';

insert into public.catalogo_productos (
  categoria,
  nombre,
  tipo,
  unidad,
  variantes,
  stock_minimo
)
values
  ('EPP', 'Casco en trabajo en alturas', 'Amarillo, Blanco, Azul, Verde', 'Unidad', array['Unica'], 0),
  ('EPP', 'Gafas de seguridad', 'Proteccion visual', 'Unidad', array['Unica'], 0),
  ('EPP', 'Careta Esmerilar', 'Proteccion facial', 'Unidad', array['Unica'], 0),
  ('EPP', 'Visor de seguridad', 'Proteccion facial', 'Unidad', array['Unica'], 0),
  ('EPP', 'Tapaoidos', 'Insercion, Copa', 'Par', array['Unica'], 0),
  ('EPP', 'Mascara Respirador Media Cara', 'Proteccion respiratoria', 'Unidad', array['Unica'], 0),
  ('EPP', 'Filtros mascara media cara', 'Proteccion respiratoria', 'Par', array['Unica'], 0),
  ('EPP', 'Tapabocas N95', 'Blanco, Negro', 'Unidad', array['Unica'], 0),
  ('EPP', 'Tapabocas quirurgico', 'Azul, Negro', 'Unidad', array['Unica'], 0),
  ('EPP', 'Traje en PVC', 'Proteccion corporal', 'Unidad', array['S', 'M', 'L', 'XL', '2XL'], 0),
  ('EPP', 'Peto de carnaza', 'Proteccion corporal', 'Unidad', array['S', 'M', 'L', 'XL', '2XL'], 0),
  ('EPP', 'Delantal Industrial PVC', 'Negro, Amarillo', 'Unidad', array['Unica'], 0),
  ('EPP', 'Guantes de lavanderia medio brazo', 'Proteccion manos', 'Par', array['S', 'M', 'L', 'XL', '2XL'], 0),
  ('EPP', 'Trajes Tyvec', 'Proteccion corporal', 'Unidad', array['S', 'M', 'L', 'XL', '2XL'], 0),
  ('EPP', 'Guantes de carnaza', 'Proteccion manos', 'Par', array['S', 'M', 'L', 'XL', '2XL'], 0),
  ('EPP', 'Guantes de nitrilo', 'Proteccion manos', 'Caja', array['S', 'M', 'L', 'XL', '2XL'], 0),
  ('EPP', 'Guantes de tela', 'Proteccion manos', 'Par', array['S', 'M', 'L', 'XL', '2XL'], 0),
  ('EPP', 'Guantes para calor', 'Proteccion manos', 'Par', array['S', 'M', 'L', 'XL', '2XL'], 0),
  ('EPP', 'Guantes dielectricos', 'Proteccion manos', 'Par', array['S', 'M', 'L', 'XL', '2XL'], 0),
  ('EPP', 'Canguros (mantenimiento)', 'Mantenimiento', 'Unidad', array['Unica'], 0)
on conflict (categoria, nombre) do update set
  tipo = excluded.tipo,
  unidad = excluded.unidad,
  variantes = excluded.variantes;
