-- ══════════════════════════════════════════════════════════════
-- MESSA — Migración 07: varios restaurantes, no sólo varias sucursales
--
-- Hasta acá el sistema tenía un solo nivel: la sucursal. Alcanzaba para
-- un restaurante con tres locales, no para venderle a dos restaurantes: todo
-- colgaba de `sucursal_id` y nada impedía que dos clientes distintos se vieran
-- los datos si adivinaban un id.
--
-- Este es el nivel que faltaba arriba:
--
--     MESSA
--      └── organización = el restaurante-cliente
--           └── sucursal
--                └── mesas, carta, pedidos, caja…
--
-- La organización NO viaja en la URL ni la elige el navegador: sale de la
-- sesión del empleado, que el servidor firma al iniciar sesión. Es la
-- diferencia entre un tabique y un cartel: si el cliente pudiera mandarla,
-- cambiar un número en la petición le abriría los datos del restaurante de
-- al lado.
-- ══════════════════════════════════════════════════════════════

create table if not exists organizaciones (
  id text primary key,
  nombre text not null,
  -- Nombre corto para la URL. Todavía no se usa para enrutar, pero se reserva
  -- desde ahora: agregarlo después obligaría a inventar uno para cada cliente
  -- que ya estuviera cargado.
  slug text unique not null,
  activa boolean not null default true,
  -- Estado comercial. Sin esto no hay forma de cortarle el servicio a quien
  -- deja de pagar sin borrarle los datos.
  plan text not null default 'activo' check (plan in ('prueba','activo','suspendido')),
  created_at timestamptz not null default now()
);

alter table organizaciones enable row level security;

-- La organización de cada empleado. Sin esto el login no puede saber a qué
-- restaurante pertenece quien entra.
alter table usuarios_staff add column if not exists organizacion_id text;
create index if not exists usuarios_staff_org_idx on usuarios_staff (organizacion_id);

-- Todo el estado operativo queda encerrado dentro de su organización.
alter table estado_operativo add column if not exists organizacion_id text;

-- Lo que ya existe pertenece al primer cliente. Sin este relleno, las filas
-- viejas quedarían sin dueño y desaparecerían de la app al filtrar.
update estado_operativo set organizacion_id = 'org-messa' where organizacion_id is null;
update usuarios_staff set organizacion_id = 'org-messa' where organizacion_id is null;

insert into organizaciones (id, nombre, slug, plan)
values ('org-messa', 'Resto', 'resto', 'activo')
on conflict (id) do nothing;

-- Recién ahora se puede exigir: si se exigiera antes, fallaría con las filas
-- que todavía no tenían dueño.
alter table estado_operativo alter column organizacion_id set not null;

-- Cada consulta del sync filtra por organización y sucursal a la vez.
drop index if exists estado_operativo_sucursal_idx;
create index if not exists estado_operativo_ambito_idx
  on estado_operativo (organizacion_id, sucursal_id, updated_at desc);

-- Dos restaurantes pueden tener, cada uno, una sucursal llamada 'suc1'. La
-- identidad de una fila es la organización MÁS el id, no el id solo.
alter table estado_operativo drop constraint if exists estado_operativo_pkey;
alter table estado_operativo add primary key (organizacion_id, id);
