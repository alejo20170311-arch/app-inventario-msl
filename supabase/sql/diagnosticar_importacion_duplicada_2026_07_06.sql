-- Diagnostico de importacion duplicada que no puede reversarse completa
-- porque algunos productos quedarian con stock negativo.
--
-- Ejecuta este archivo en Supabase SQL Editor.
-- No modifica datos. Solo muestra:
-- 1. Productos que se pueden reversar completos.
-- 2. Productos bloqueados que requieren conteo o ajuste manual.

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
    count(*) as movimientos_encontrados
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
  case
    when stock_actual - cantidad_a_reversar < 0 then 'BLOQUEADO: requiere conteo'
    else 'SE PUEDE REVERSAR'
  end as estado_revision,
  nombre,
  categoria,
  tipo,
  variante,
  unidad,
  stock_actual,
  cantidad_a_reversar,
  stock_actual - cantidad_a_reversar as stock_despues_reverso,
  case
    when stock_actual - cantidad_a_reversar < 0 then abs(stock_actual - cantidad_a_reversar)
    else 0
  end as faltante_para_reversar_completo,
  movimientos_encontrados
from movimientos_objetivo
order by
  case when stock_actual - cantidad_a_reversar < 0 then 0 else 1 end,
  nombre,
  tipo,
  variante;

