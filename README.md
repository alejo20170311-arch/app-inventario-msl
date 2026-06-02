# Inventario MSL

Aplicación web para controlar inventario de dotación y EPP, registrar entregas a colaboradores, consultar comprobantes, generar reportes y mantener auditoría de cambios.

## Requisitos

- Node.js instalado.
- Proyecto de Supabase configurado.
- Variables locales en `.env.local`.

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Comandos

```bash
npm install
npm run dev
npm run build
npm run lint
```

En Windows, si PowerShell bloquea `npm`, usa:

```bash
npm.cmd run dev
npm.cmd run build
npm.cmd run lint
```

## Módulos

- Panel: resumen de productos, colaboradores, entregas, stock bajo y actividad del mes.
- Productos: catálogo, existencias, stock mínimo, estados y exportación.
- Movimientos: entradas, devoluciones, ajustes, entregas y anulaciones.
- Colaboradores: registro, edición, retiro e importación CSV.
- Entregas: comprobantes, líneas de entrega, historial y anulaciones.
- Reportes: filtros por fecha, centro, categoría, estado, consumo, stock bajo y pedido sugerido.
- Usuarios: administración de perfiles internos de la app.
- Auditoría: cambios recientes registrados en base de datos.

## Roles

- Administrador: acceso completo.
- Gestion Humana: gestión de colaboradores, productos permitidos y entregas.
- Bodega: gestión de productos e inventario.
- Consulta: lectura.

Las validaciones principales viven tanto en la interfaz como en funciones RPC de Supabase para evitar cambios no autorizados desde el cliente.

## Base de Datos

El esquema principal está en:

```text
supabase/sql/schema_completo_inventario_msl.sql
```

Scripts útiles:

- `supabase/sql/configurar_avatar_storage.sql`: crea el bucket `avatars` para fotos de perfil.
- `supabase/sql/actualizar_seguridad_responsables_2026_06_01.sql`: agrega responsables de entrega y cierra escrituras directas sensibles para que pasen por RPC.
- `supabase/sql/agregar_compras_facturas_2026_06_02.sql`: agrega compras por factura, líneas de compra, adjuntos de factura y RPC transaccional.
- `supabase/sql/actualizar_catalogo_epp_2026_05_29.sql`: actualización de catálogo EPP.
- `supabase/sql/limpiar_pruebas_inventario.sql`: limpieza de datos de prueba.

## Fotos de Perfil

La app intenta guardar la foto en Supabase Storage, bucket `avatars`. Si el bucket no está configurado, usa temporalmente metadata del usuario como respaldo.

Para activar Storage, ejecuta una vez:

```text
supabase/sql/configurar_avatar_storage.sql
```

## Seguridad

- No compartas contraseñas en chats, tickets o documentación.
- Cambia las claves compartidas durante pruebas.
- Mantén RLS activo en Supabase.
- Aplica las escrituras sensibles mediante RPC; no habilites políticas directas de escritura sobre productos, movimientos, entregas, comprobantes, colaboradores o catálogo salvo una migración controlada.
- Revisa periódicamente los perfiles activos y la auditoría.
- Usa contraseñas únicas para cuentas administrativas.

## Notas de Mantenimiento

La app está hecha con React, Vite y Supabase. Los módulos nuevos deben seguir el patrón de `src/modules`, dejando `src/App.jsx` como orquestador de estado y permisos.
