-- Endurece escrituras directas y agrega responsables de entrega.
-- Ejecutar una vez en Supabase SQL Editor antes o junto con el nuevo frontend.

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

drop policy if exists "catalogo admin y bodega modifican" on public.catalogo_productos;
drop policy if exists "catalogo admin gh bodega modifican" on public.catalogo_productos;
drop policy if exists "productos admin y bodega modifican" on public.productos;
drop policy if exists "productos admin gh bodega modifican" on public.productos;
drop policy if exists "colaboradores admin y gh modifican" on public.colaboradores;
drop policy if exists "comprobantes admin y gh modifican" on public.comprobantes;
drop policy if exists "entregas admin y gh modifican" on public.entregas;
drop policy if exists "movimientos admin bodega gh modifican" on public.movimientos;
drop policy if exists "auditoria insercion autenticados" on public.auditoria;

grant execute on function public.guardar_catalogo_producto_rpc(uuid, jsonb) to authenticated;
grant execute on function public.guardar_colaborador_rpc(uuid, jsonb) to authenticated;
grant execute on function public.eliminar_colaborador_rpc(uuid) to authenticated;
grant execute on function public.guardar_producto_movimiento_rpc(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.registrar_entrega_rpc(uuid, date, text, text, text, jsonb) to authenticated;
grant execute on function public.anular_comprobante_rpc(uuid, text) to authenticated;
grant execute on function public.eliminar_producto_admin_rpc(uuid) to authenticated;
grant execute on function public.listar_responsables_entrega_rpc() to authenticated;
