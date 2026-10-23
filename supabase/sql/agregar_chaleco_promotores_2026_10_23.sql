-- Nuevos campos independientes. Las columnas anteriores se conservan.
begin;

alter table public.colaboradores
  add column if not exists talla_camiseta_manufactura text,
  add column if not exists talla_camisa_polo text,
  add column if not exists talla_chaqueta_jean text,
  add column if not exists talla_chaleco_promotor text not null default 'N/A';

-- Mantener la referencia anterior para personas sin reporte nuevo.
update public.colaboradores
set talla_camiseta_manufactura = coalesce(talla_camiseta_manufactura,
      case when coalesce(talla_camisa, '') not in ('', 'N/A') then talla_camisa else talla_antifluido end),
    talla_camisa_polo = coalesce(talla_camisa_polo, talla_camisa),
    talla_chaqueta_jean = coalesce(talla_chaqueta_jean, talla_camisa)
where talla_camiseta_manufactura is null or talla_camisa_polo is null or talla_chaqueta_jean is null;

create or replace function public.guardar_colaborador_rpc(
  p_colaborador_id uuid,
  p_colaborador jsonb
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
begin
  if v_usuario_id is null then
    raise exception 'Usuario no autenticado.';
  end if;

  select rol into v_rol
  from public.perfiles
  where id = v_usuario_id
    and estado = 'Activo';

  if v_rol is null or v_rol not in ('Administrador', 'Gestion Humana') then
    raise exception 'No tienes permiso para modificar colaboradores.';
  end if;

  if nullif(trim(p_colaborador->>'identificacion'), '') is null then
    raise exception 'La identificacion es obligatoria.';
  end if;

  if nullif(trim(p_colaborador->>'nombre_completo'), '') is null then
    raise exception 'El nombre completo es obligatorio.';
  end if;

  if p_colaborador_id is null then
    insert into public.colaboradores (
      identificacion,
      nombre_completo,
      cargo,
      sub_area,
      grupo,
      centro_costos,
      nombre_centro_costos,
      tipo_dotacion,
      sexo,
      estado,
      talla_antifluido,
      talla_bata,
      talla_camisa,
      talla_camiseta_manufactura,
      talla_camisa_polo,
      talla_chaqueta_jean,
      talla_chaleco_promotor,
      talla_pantalon,
      talla_botas
    )
    values (
      trim(p_colaborador->>'identificacion'),
      trim(p_colaborador->>'nombre_completo'),
      coalesce(nullif(trim(p_colaborador->>'cargo'), ''), 'Sin cargo'),
      coalesce(nullif(trim(p_colaborador->>'sub_area'), ''), 'Sin sub area'),
      coalesce(nullif(trim(p_colaborador->>'grupo'), ''), 'Sin grupo'),
      coalesce(nullif(trim(p_colaborador->>'centro_costos'), ''), 'Sin centro'),
      coalesce(nullif(trim(p_colaborador->>'nombre_centro_costos'), ''), 'Sin centro'),
      coalesce(nullif(trim(p_colaborador->>'tipo_dotacion'), ''), 'No aplica'),
      coalesce(nullif(trim(p_colaborador->>'sexo'), ''), 'Femenino'),
      coalesce(nullif(trim(p_colaborador->>'estado'), ''), 'Activo'),
      coalesce(nullif(trim(p_colaborador->>'talla_antifluido'), ''), 'N/A'),
      coalesce(nullif(trim(p_colaborador->>'talla_bata'), ''), 'N/A'),
      coalesce(nullif(trim(p_colaborador->>'talla_camisa'), ''), 'N/A'),
      coalesce(nullif(trim(p_colaborador->>'talla_camiseta_manufactura'), ''), 'N/A'),
      coalesce(nullif(trim(p_colaborador->>'talla_camisa_polo'), ''), 'N/A'),
      coalesce(nullif(trim(p_colaborador->>'talla_chaqueta_jean'), ''), 'N/A'),
      coalesce(nullif(trim(p_colaborador->>'talla_chaleco_promotor'), ''), 'N/A'),
      coalesce(nullif(trim(p_colaborador->>'talla_pantalon'), ''), 'N/A'),
      coalesce(trim(p_colaborador->>'talla_botas'), '')
    )
    returning * into v_colaborador;
  else
    update public.colaboradores
    set
      identificacion = trim(p_colaborador->>'identificacion'),
      nombre_completo = trim(p_colaborador->>'nombre_completo'),
      cargo = coalesce(nullif(trim(p_colaborador->>'cargo'), ''), 'Sin cargo'),
      sub_area = coalesce(nullif(trim(p_colaborador->>'sub_area'), ''), 'Sin sub area'),
      grupo = coalesce(nullif(trim(p_colaborador->>'grupo'), ''), 'Sin grupo'),
      centro_costos = coalesce(nullif(trim(p_colaborador->>'centro_costos'), ''), 'Sin centro'),
      nombre_centro_costos = coalesce(nullif(trim(p_colaborador->>'nombre_centro_costos'), ''), 'Sin centro'),
      tipo_dotacion = coalesce(nullif(trim(p_colaborador->>'tipo_dotacion'), ''), 'No aplica'),
      sexo = coalesce(nullif(trim(p_colaborador->>'sexo'), ''), 'Femenino'),
      estado = coalesce(nullif(trim(p_colaborador->>'estado'), ''), 'Activo'),
      talla_antifluido = coalesce(nullif(trim(p_colaborador->>'talla_antifluido'), ''), 'N/A'),
      talla_bata = coalesce(nullif(trim(p_colaborador->>'talla_bata'), ''), 'N/A'),
      talla_camisa = coalesce(nullif(trim(p_colaborador->>'talla_camisa'), ''), 'N/A'),
      talla_camiseta_manufactura = case when p_colaborador ? 'talla_camiseta_manufactura'
        then coalesce(nullif(trim(p_colaborador->>'talla_camiseta_manufactura'), ''), 'N/A') else talla_camiseta_manufactura end,
      talla_camisa_polo = case when p_colaborador ? 'talla_camisa_polo'
        then coalesce(nullif(trim(p_colaborador->>'talla_camisa_polo'), ''), 'N/A') else talla_camisa_polo end,
      talla_chaqueta_jean = case when p_colaborador ? 'talla_chaqueta_jean'
        then coalesce(nullif(trim(p_colaborador->>'talla_chaqueta_jean'), ''), 'N/A') else talla_chaqueta_jean end,
      talla_chaleco_promotor = case when p_colaborador ? 'talla_chaleco_promotor'
        then coalesce(nullif(trim(p_colaborador->>'talla_chaleco_promotor'), ''), 'N/A') else talla_chaleco_promotor end,
      talla_pantalon = coalesce(nullif(trim(p_colaborador->>'talla_pantalon'), ''), 'N/A'),
      talla_botas = coalesce(trim(p_colaborador->>'talla_botas'), '')
    where id = p_colaborador_id
    returning * into v_colaborador;

    if not found then
      raise exception 'El colaborador no existe.';
    end if;
  end if;

  return to_jsonb(v_colaborador);
end;
$$;

notify pgrst, 'reload schema';
commit;
