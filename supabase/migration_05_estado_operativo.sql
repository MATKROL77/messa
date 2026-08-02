-- ══════════════════════════════════════════════════════════════
-- MESSA — Migración 05: estado operativo compartido
--
-- El problema que resuelve: mesas, pedidos y llamados vivían en el
-- localStorage de cada dispositivo. Un pedido hecho desde el celular del
-- comensal no existía para la computadora de la cocina. Cada navegador tenía
-- su propia realidad.
--
-- Cómo lo resuelve: una sola tabla donde cada entidad viaja como JSON con su
-- marca de tiempo. Cada dispositivo empuja lo que cambió y se trae lo que
-- cambió en los demás. Gana siempre la versión más nueva de CADA entidad, no
-- del conjunto: dos mozos tocando mesas distintas al mismo tiempo no se pisan.
--
-- Por qué JSON y no una columna por campo: así el esquema no hay que migrarlo
-- cada vez que un pedido gana un campo, y la app sigue siendo la dueña de la
-- forma de sus datos. El precio es que no se puede consultar por SQL fino —
-- aceptable, porque quien consulta es siempre la propia app.
-- ══════════════════════════════════════════════════════════════

create table if not exists estado_operativo (
  id text primary key,
  tipo text not null,
  sucursal_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table estado_operativo drop constraint if exists estado_operativo_tipo_valido;
alter table estado_operativo add constraint estado_operativo_tipo_valido
  check (tipo in ('mesa', 'pedido', 'llamado', 'elemento'));

-- La consulta caliente es siempre la misma: "qué cambió en esta sucursal
-- desde la última vez que miré".
create index if not exists estado_operativo_sucursal_idx
  on estado_operativo (sucursal_id, updated_at desc);

-- Igual que las tablas de cuentas: RLS activo y sin ninguna policy, así la
-- anon key del navegador no la toca. Sólo entra el servidor, que además
-- valida quién pide qué (sesión del equipo, o el código del QR de la mesa).
alter table estado_operativo enable row level security;

-- Rollback manual:
-- drop table if exists estado_operativo;
