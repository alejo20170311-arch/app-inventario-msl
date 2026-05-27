create or replace function public.guardar_catalogo_producto_rpc(
  p_catalogo_id uuid,
  p_catalogo jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_rol text;
  v_catalogo public.catalogo_productos%rowtype;
begin
  if v_usuario_id is null then
    raise exception 'Usuario no autenticado.';
  end if;

  select rol into v_rol
  from public.perfiles
  where id = v_usuario_id
    and estado = 'Activo';

  if v_rol not in ('Administrador', 'Bodega') then
    raise exception 'No tienes permiso para modificar el catálogo.';
  end if;

  if nullif(trim(p_catalogo->>'categoria'), '') not in ('Dotación', 'EPP') then
    raise exception 'La categoría del catálogo no es válida.';
  end if;

  if nullif(trim(p_catalogo->>'nombre'), '') is null then
    raise exception 'El nombre del elemento es obligatorio.';
  end if;

  if p_catalogo_id is null then
    insert into public.catalogo_productos (
      categoria,
      nombre,
      tipo,
      unidad,
      variantes,
      stock_minimo
    )
    values (
      trim(p_catalogo->>'categoria'),
      trim(p_catalogo->>'nombre'),
      trim(p_catalogo->>'tipo'),
      trim(p_catalogo->>'unidad'),
      coalesce(
        array(select jsonb_array_elements_text(coalesce(p_catalogo->'variantes', '[]'::jsonb))),
        '{}'::text[]
      ),
      coalesce(nullif(p_catalogo->>'stock_minimo', '')::integer, 0)
    )
    returning * into v_catalogo;
  else
    update public.catalogo_productos
    set
      categoria = trim(p_catalogo->>'categoria'),
      nombre = trim(p_catalogo->>'nombre'),
      tipo = trim(p_catalogo->>'tipo'),
      unidad = trim(p_catalogo->>'unidad'),
      variantes = coalesce(
        array(select jsonb_array_elements_text(coalesce(p_catalogo->'variantes', '[]'::jsonb))),
        '{}'::text[]
      ),
      stock_minimo = coalesce(nullif(p_catalogo->>'stock_minimo', '')::integer, 0)
    where id = p_catalogo_id
    returning * into v_catalogo;

    if not found then
      raise exception 'El elemento del catálogo no existe.';
    end if;
  end if;

  return to_jsonb(v_catalogo);
end;
$$;

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

  if v_rol not in ('Administrador', 'Gestion Humana') then
    raise exception 'No tienes permiso para modificar colaboradores.';
  end if;

  if nullif(trim(p_colaborador->>'identificacion'), '') is null then
    raise exception 'La identificación es obligatoria.';
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
      sexo,
      estado,
      talla_antifluido,
      talla_bata,
      talla_camisa,
      talla_pantalon,
      talla_botas
    )
    values (
      trim(p_colaborador->>'identificacion'),
      trim(p_colaborador->>'nombre_completo'),
      coalesce(nullif(trim(p_colaborador->>'cargo'), ''), 'Sin cargo'),
      coalesce(nullif(trim(p_colaborador->>'sub_area'), ''), 'Sin sub área'),
      coalesce(nullif(trim(p_colaborador->>'grupo'), ''), 'Sin grupo'),
      coalesce(nullif(trim(p_colaborador->>'centro_costos'), ''), 'Sin centro'),
      coalesce(nullif(trim(p_colaborador->>'nombre_centro_costos'), ''), 'Sin centro'),
      coalesce(nullif(trim(p_colaborador->>'sexo'), ''), 'Femenino'),
      coalesce(nullif(trim(p_colaborador->>'estado'), ''), 'Activo'),
      coalesce(nullif(trim(p_colaborador->>'talla_antifluido'), ''), 'N/A'),
      coalesce(nullif(trim(p_colaborador->>'talla_bata'), ''), 'N/A'),
      coalesce(nullif(trim(p_colaborador->>'talla_camisa'), ''), 'N/A'),
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
      sub_area = coalesce(nullif(trim(p_colaborador->>'sub_area'), ''), 'Sin sub área'),
      grupo = coalesce(nullif(trim(p_colaborador->>'grupo'), ''), 'Sin grupo'),
      centro_costos = coalesce(nullif(trim(p_colaborador->>'centro_costos'), ''), 'Sin centro'),
      nombre_centro_costos = coalesce(nullif(trim(p_colaborador->>'nombre_centro_costos'), ''), 'Sin centro'),
      sexo = coalesce(nullif(trim(p_colaborador->>'sexo'), ''), 'Femenino'),
      estado = coalesce(nullif(trim(p_colaborador->>'estado'), ''), 'Activo'),
      talla_antifluido = coalesce(nullif(trim(p_colaborador->>'talla_antifluido'), ''), 'N/A'),
      talla_bata = coalesce(nullif(trim(p_colaborador->>'talla_bata'), ''), 'N/A'),
      talla_camisa = coalesce(nullif(trim(p_colaborador->>'talla_camisa'), ''), 'N/A'),
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
