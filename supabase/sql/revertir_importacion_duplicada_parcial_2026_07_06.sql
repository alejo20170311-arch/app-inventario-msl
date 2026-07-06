-- Reversion parcial segura de importacion duplicada.
--
-- Aplica solo a productos donde:
--   stock_actual - cantidad_duplicada >= 0
--
-- Los productos que quedarian negativos NO se tocan.
-- Para esos, ejecuta primero diagnosticar_importacion_duplicada_2026_07_06.sql
-- y ajustalos con conteo o decision manual.

begin;

with movimientos_objetivo as (
  select
    m.producto_id,
    sum(m.cantidad)::integer as cantidad_a_reversar,
    min(m.creado_por) as usuario_referencia
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
  'Reversion parcial de importacion duplicada: productos-msl (13).xlsx del 2026-07-06',
  stock_final,
  usuario_referencia
from actualizados;

commit;

-- Resumen posterior: productos que aun quedan bloqueados.
with movimientos_objetivo as (
  select
    m.producto_id,
    p.nombre,
    p.categoria,
    p.tipo,
    p.variante,
    p.unidad,
    p.stock_actual,
    sum(m.cantidad)::integer as cantidad_a_reversar
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
  'PENDIENTE: requiere conteo o ajuste manual' as estado_revision,
  nombre,
  categoria,
  tipo,
  variante,
  unidad,
  stock_actual,
  cantidad_a_reversar,
  stock_actual - cantidad_a_reversar as stock_despues_reverso
from movimientos_objetivo
where stock_actual - cantidad_a_reversar < 0
order by nombre, tipo, variante;

