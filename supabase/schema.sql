-- ══════════════════════════════════════════════════════════════
-- MenuFlow — Schema de base de datos para Supabase
-- Correr esto en: Supabase Dashboard → SQL Editor → New query → Run
-- Esto es el paso que falta para que el celular y la PC vean los mismos
-- datos en tiempo real (ver LEEME.md → "Por qué el celular y la PC no
-- siempre ven lo mismo").
-- ══════════════════════════════════════════════════════════════

create table if not exists sucursales (
  id text primary key,
  nombre text not null,
  direccion text,
  telefono text,
  activa boolean default true,
  created_at timestamptz default now()
);

create table if not exists mesas (
  id text primary key,
  numero int not null,
  estado text not null default 'libre',
  dispositivos text[] default '{}',
  pos_x numeric default 50,
  pos_y numeric default 50,
  forma text default 'redonda',
  capacidad int default 4,
  sucursal_id text references sucursales(id),
  nota_staff text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists categorias (
  id text primary key,
  nombre text not null,
  emoji text,
  orden int default 0
);

create table if not exists platos (
  id text primary key,
  nombre text not null,
  descripcion text,
  precio numeric not null,
  categoria_id text references categorias(id),
  ingredientes jsonb default '[]',
  insumos_requeridos jsonb default '[]',
  modificadores jsonb default '[]',
  tags text[] default '{}',
  calorias int, proteinas int, carbohidratos int, grasas int,
  imagen_url text,
  disponible boolean default true,
  destacado boolean default false,
  orden int default 0,
  rating numeric default 0,
  total_reviews int default 0,
  reviews_muestra jsonb default '[]',
  maridaje jsonb default '[]'
);

create table if not exists insumos (
  id text primary key,
  nombre text not null,
  cantidad numeric default 0,
  unidad text default 'unidad',
  cantidad_critica numeric default 0,
  cantidad_pedido_sugerido numeric default 0,
  proveedor text,
  costo_unitario numeric default 0,
  activo boolean default true,
  sucursal_id text references sucursales(id),
  ultima_actualizacion timestamptz default now()
);

create table if not exists pedidos (
  id text primary key,
  mesa_id text references mesas(id),
  mesa_numero int,
  items jsonb not null default '[]',
  estado text not null default 'en_cocina',
  total numeric not null default 0,
  propina numeric default 0,
  dispositivo_id text,
  sucursal_id text references sucursales(id),
  origen text default 'mesa',
  metodo_pago text,
  cliente_email text,
  confirmado_staff boolean default false,
  preference_id text,
  mp_payment_id text,
  panera text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists reservas (
  id text primary key,
  nombre text, telefono text, email text,
  fecha date, hora text, personas int,
  estado text default 'pendiente',
  notas text,
  sucursal_id text references sucursales(id),
  created_at timestamptz default now()
);

create table if not exists llamados_mozo (
  id text primary key,
  mesa_id text references mesas(id),
  mesa_numero int,
  motivo text,
  atendido boolean default false,
  created_at timestamptz default now()
);

create table if not exists gastos (
  id text primary key,
  categoria text, descripcion text, monto numeric,
  fecha date,
  sucursal_id text references sucursales(id),
  created_at timestamptz default now()
);

create table if not exists puntos_clientes (
  email text primary key,
  puntos int default 0
);

-- Habilitar Realtime (para que el dashboard/cocina reciban cambios al instante)
alter publication supabase_realtime add table mesas, pedidos, llamados_mozo;

-- Row Level Security — habilitado pero permisivo por defecto (anon key puede
-- leer/escribir). Para un uso real con clientes públicos, restringí estas
-- políticas según tu caso (por ejemplo, que un comensal solo pueda escribir
-- pedidos de su propia mesa_id, verificado del lado del servidor).
alter table mesas enable row level security;
alter table pedidos enable row level security;
alter table platos enable row level security;
alter table insumos enable row level security;
alter table reservas enable row level security;
alter table llamados_mozo enable row level security;
alter table gastos enable row level security;
alter table puntos_clientes enable row level security;

create policy "lectura publica" on mesas for select using (true);
create policy "escritura publica" on mesas for all using (true);
create policy "lectura publica" on pedidos for select using (true);
create policy "escritura publica" on pedidos for all using (true);
create policy "lectura publica" on platos for select using (true);
create policy "escritura publica" on platos for all using (true);
create policy "lectura publica" on insumos for select using (true);
create policy "escritura publica" on insumos for all using (true);
create policy "lectura publica" on reservas for select using (true);
create policy "escritura publica" on reservas for all using (true);
create policy "lectura publica" on llamados_mozo for select using (true);
create policy "escritura publica" on llamados_mozo for all using (true);
create policy "lectura publica" on gastos for select using (true);
create policy "escritura publica" on gastos for all using (true);
create policy "lectura publica" on puntos_clientes for select using (true);
create policy "escritura publica" on puntos_clientes for all using (true);
