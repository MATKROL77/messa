-- ══════════════════════════════════════════════════════════════
-- MESSA — Migración 04: cuentas de clientes, equipo y rangos
--
-- Correr en: Supabase Dashboard → SQL Editor → New query → pegar → Run.
--
-- Por qué hay que pegarlo a mano: la API REST de Supabase (PostgREST), que es
-- a la que llega la service role key, NO ejecuta DDL. Sólo lee y escribe
-- filas de tablas que ya existen. Crear tablas requiere el SQL Editor o la
-- cadena de conexión de Postgres. Es un paso único.
--
-- Es aditiva: no toca ninguna tabla ni columna existente.
-- ══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- 1. Clientes (comensales). Cuenta propia, separada del staff.
-- ──────────────────────────────────────────────────────────────
create table if not exists clientes (
  email text primary key,
  password_hash text not null,
  nombre text not null,
  telefono text,
  puntos int not null default 0,
  -- Rango del programa de fidelidad. Se recalcula solo según los puntos.
  rango text not null default 'bronce',
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  ultima_visita timestamptz
);

alter table clientes drop constraint if exists clientes_rango_valido;
alter table clientes add constraint clientes_rango_valido
  check (rango in ('bronce', 'plata', 'oro', 'platino'));

alter table clientes drop constraint if exists clientes_puntos_no_negativos;
alter table clientes add constraint clientes_puntos_no_negativos
  check (puntos >= 0);

create index if not exists clientes_puntos_idx on clientes (puntos desc);

-- ──────────────────────────────────────────────────────────────
-- 2. Equipo (staff). Cuentas que el dueño crea y borra desde el
--    backoffice, sin tocar variables de entorno ni redeployar.
--    Las cuentas fijas de .env siguen funcionando en paralelo y
--    tienen prioridad: son el "último recurso" si la base se cae.
-- ──────────────────────────────────────────────────────────────
create table if not exists usuarios_staff (
  email text primary key,
  password_hash text not null,
  nombre text not null,
  rol text not null default 'staff',
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  creado_por text,
  ultimo_acceso timestamptz
);

alter table usuarios_staff drop constraint if exists usuarios_staff_rol_valido;
alter table usuarios_staff add constraint usuarios_staff_rol_valido
  check (rol in ('admin', 'gerente', 'editor', 'staff'));
-- 'creator' a propósito NO está permitido acá: ese rango sólo existe en las
-- variables de entorno del servidor, para que nadie pueda auto-asignárselo
-- creando una fila.

-- ──────────────────────────────────────────────────────────────
-- 3. Movimientos de puntos. Libro mayor: cada suma o resta queda
--    registrada, así el saldo de `clientes.puntos` es auditable y
--    el cliente ve su historial.
-- ──────────────────────────────────────────────────────────────
create table if not exists movimientos_puntos (
  id text primary key,
  cliente_email text not null references clientes(email) on delete cascade,
  puntos int not null,
  motivo text not null,
  referencia text,
  created_at timestamptz not null default now()
);

create index if not exists movimientos_puntos_cliente_idx
  on movimientos_puntos (cliente_email, created_at desc);

-- ──────────────────────────────────────────────────────────────
-- 4. Seguridad. Estas tres tablas guardan hashes de contraseña y
--    datos personales, así que NO son públicas como el resto del
--    schema: RLS activo y sin ninguna policy. Con eso, la anon key
--    del navegador no puede leerlas ni escribirlas. Sólo la service
--    role key (que vive únicamente en el servidor, en los secrets
--    del Worker) las alcanza, porque saltea RLS por diseño.
-- ──────────────────────────────────────────────────────────────
alter table clientes enable row level security;
alter table usuarios_staff enable row level security;
alter table movimientos_puntos enable row level security;

drop policy if exists "lectura publica" on clientes;
drop policy if exists "escritura publica" on clientes;
drop policy if exists "lectura publica" on usuarios_staff;
drop policy if exists "escritura publica" on usuarios_staff;
drop policy if exists "lectura publica" on movimientos_puntos;
drop policy if exists "escritura publica" on movimientos_puntos;

-- ──────────────────────────────────────────────────────────────
-- 5. `puntos_clientes` (tabla vieja, email → puntos) queda como
--    está para no romper nada. Si ya tenías puntos cargados ahí,
--    esta línea los migra a las cuentas nuevas cuando el cliente
--    se registre con el mismo email. Es segura de correr siempre.
-- ──────────────────────────────────────────────────────────────
-- update clientes c set puntos = greatest(c.puntos, p.puntos)
--   from puntos_clientes p where lower(p.email) = c.email;

-- ──────────────────────────────────────────────────────────────
-- Rollback manual (sólo si decidís abandonar la funcionalidad):
-- drop table if exists movimientos_puntos;
-- drop table if exists clientes;
-- drop table if exists usuarios_staff;
-- ──────────────────────────────────────────────────────────────
