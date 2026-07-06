-- Reversar entradas accidentales creadas por una importacion completa de productos.
--
-- Caso detectado:
-- La importacion de productos interpretaba "stock actual" como una entrada nueva.
-- Si se importaba el archivo completo, cada producto con stock > 0 sumaba inventario otra vez.
--
-- Uso:
-- Ejecuta este archivo en Supabase SQL Editor.
-- Primero muestra la vista previa y luego aplica la reversion si ningun producto queda negativo.
--
-- Ajusta estos dos filtros si necesitas revertir otra importacion:
--   fecha: 2026-07-06
--   archivo: productos-msl (13).xlsx

-- =========================
-- VISTA PREVIA
-- =========================
with movimientos_objetivo as (
  select
    m.producto_id,
    p.nombre,
    p.categoria,
    p.tipo,
    p.variante,
    p.unidad,
    p.stock_actual,
    sum(m.cantidad)::integer as cantidad_a_reversar,
    count(*) as movimientos_encontrados,
    min(m.fecha) as primera_fecha,
    max(m.fecha) as ultima_fecha
  from public.movimientos m
  join public.productos p on p.id = m.producto_id
  where m.tipo_movimiento = 'Entrada'
    and m.fecha = date '2026-07-06'
    and m.observacion ilike '%productos-msl (13).xlsx%'
  group by
    m.producto_id,
    p.nombre,
    p.categoria,
    p.tipo,
    p.variante,
    p.unidad,
    p.stock_actual
)
select
  nombre,
  categoria,
  tipo,
  variante,
  unidad,
  stock_actual,
  cantidad_a_reversar,
  stock_actual - cantidad_a_reversar as stock_despues_reverso,
  movimientos_encontrados,
  primera_fecha,
  ultima_fecha,
  case
    when stock_actual - cantidad_a_reversar < 0 then 'NO APLICAR: quedaria negativo'
    else 'OK'
  end as validacion
from movimientos_objetivo
order by nombre, tipo, variante;

-- =========================
-- APLICAR REVERSO
-- =========================
begin;

do $$
declare
  v_negativos integer;
begin
  select count(*)
  into v_negativos
  from (
    select
      p.stock_actual - sum(m.cantidad)::integer as stock_despues_reverso
    from public.movimientos m
    join public.productos p on p.id = m.producto_id
    where m.tipo_movimiento = 'Entrada'
      and m.fecha = date '2026-07-06'
      and m.observacion ilike '%productos-msl (13).xlsx%'
    group by p.id, p.stock_actual
  ) revision
  where stock_despues_reverso < 0;

  if v_negativos > 0 then
    raise exception 'Reversion detenida: % producto(s) quedarian con stock negativo.', v_negativos;
  end if;
end $$;

with movimientos_objetivo as (
  select
    m.producto_id,
    sum(m.cantidad)::integer as cantidad_a_reversar,
    (min(m.creado_por::text))::uuid as usuario_referencia
  from public.movimientos m
  join public.productos p on p.id = m.producto_id
  where m.tipo_movimiento = 'Entrada'
    and m.fecha = date '2026-07-06'
    and m.observacion ilike '%productos-msl (13).xlsx%'
  group by m.producto_id
),
validos as (
  select
    mo.producto_id,
    mo.cantidad_a_reversar,
    mo.usuario_referencia,
    p.nombre,
    p.variante,
    p.unidad,
    p.stock_actual,
    p.stock_actual - mo.cantidad_a_reversar as stock_final
  from movimientos_objetivo mo
  join public.productos p on p.id = mo.producto_id
  where p.stock_actual - mo.cantidad_a_reversar >= 0
),
actualizados as (
  update public.productos p
  set stock_actual = v.stock_final,
      actualizado_en = now()
  from validos v
  where p.id = v.producto_id
  returning
    p.id,
    p.nombre,
    p.variante,
    p.unidad,
    v.cantidad_a_reversar,
    v.stock_final,
    v.usuario_referencia
)
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
  id,
  nombre,
  variante,
  unidad,
  'Ajuste negativo',
  cantidad_a_reversar,
  current_date,
  'Reversion de importacion duplicada: productos-msl (13).xlsx del 2026-07-06',
  stock_final,
  usuario_referencia
from actualizados;

commit;
