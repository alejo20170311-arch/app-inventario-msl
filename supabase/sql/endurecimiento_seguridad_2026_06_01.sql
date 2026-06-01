-- Endurecimiento adicional contra manipulaciones desde el navegador.
-- Ejecutar en Supabase SQL Editor después de las migraciones anteriores.

create or replace function public.guardar_perfil_rpc(
  p_perfil jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_rol text;
  v_perfil public.perfiles%rowtype;
  v_perfil_id uuid := (p_perfil->>'id')::uuid;
begin
  if v_usuario_id is null then
    raise exception 'Usuario no autenticado.';
  end if;

  select rol into v_rol
  from public.perfiles
  where id = v_usuario_id
    and estado = 'Activo';

  if v_rol <> 'Administrador' then
    raise exception 'Solo un administrador puede gestionar usuarios.';
  end if;

  if v_perfil_id is null then
    raise exception 'El ID de usuario es obligatorio.';
  end if;

  insert into public.perfiles (
    id,
    nombre,
    correo,
    rol,
    estado
  )
  values (
    v_perfil_id,
    nullif(trim(p_perfil->>'nombre'), ''),
    lower(nullif(trim(p_perfil->>'correo'), '')),
    nullif(trim(p_perfil->>'rol'), ''),
    coalesce(nullif(trim(p_perfil->>'estado'), ''), 'Activo')
  )
  on conflict (id) do update
  set
    nombre = excluded.nombre,
    correo = excluded.correo,
    rol = excluded.rol,
    estado = excluded.estado
  returning * into v_perfil;

  return to_jsonb(v_perfil);
end;
$$;

create or replace function public.cambiar_estado_perfil_rpc(
  p_perfil_id uuid,
  p_estado text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_rol text;
  v_estado text := nullif(trim(p_estado), '');
  v_perfil public.perfiles%rowtype;
begin
  if v_usuario_id is null then
    raise exception 'Usuario no autenticado.';
  end if;

  select rol into v_rol
  from public.perfiles
  where id = v_usuario_id
    and estado = 'Activo';

  if v_rol <> 'Administrador' then
    raise exception 'Solo un administrador puede cambiar usuarios.';
  end if;

  if p_perfil_id = v_usuario_id and v_estado = 'Inactivo' then
    raise exception 'No puedes inactivar tu propio usuario.';
  end if;

  if v_estado not in ('Activo', 'Inactivo') then
    raise exception 'Estado de usuario inválido.';
  end if;

  update public.perfiles
  set estado = v_estado
  where id = p_perfil_id
  returning * into v_perfil;

  if not found then
    raise exception 'El perfil no existe.';
  end if;

  return to_jsonb(v_perfil);
end;
$$;

create or replace function public.validar_responsable_comprobante()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(trim(new.responsable), '') is null then
    raise exception 'El responsable de entrega es obligatorio.';
  end if;

  if not exists (
    select 1
    from public.perfiles
    where estado = 'Activo'
      and nombre = new.responsable
  ) then
    raise exception 'El responsable de entrega debe ser un usuario activo.';
  end if;

  return new;
end;
$$;

drop trigger if exists validar_responsable_comprobante on public.comprobantes;
create trigger validar_responsable_comprobante
before insert or update of responsable on public.comprobantes
for each row execute function public.validar_responsable_comprobante();

grant execute on function public.guardar_perfil_rpc(jsonb) to authenticated;
grant execute on function public.cambiar_estado_perfil_rpc(uuid, text) to authenticated;
