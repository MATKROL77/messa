-- Migración aditiva y segura: media editorial + tiempo de preparación.
-- Ejecutar una vez sobre una base Supabase existente. No modifica ni borra
-- imagen_url, por lo que todos los platos anteriores continúan funcionando.

alter table platos add column if not exists tiempo_preparacion_minutos int;
alter table platos add column if not exists imagen_card_url text;
alter table platos add column if not exists imagen_hero_url text;
alter table platos add column if not exists imagen_recorte_url text;
alter table platos add column if not exists video_url text;
alter table platos add column if not exists poster_video_url text;
alter table platos add column if not exists focal_x numeric;
alter table platos add column if not exists focal_y numeric;
alter table platos add column if not exists color_fondo_media text;
alter table platos add column if not exists animacion_media text default 'none';

alter table platos drop constraint if exists platos_tiempo_preparacion_positivo;
alter table platos add constraint platos_tiempo_preparacion_positivo
  check (tiempo_preparacion_minutos is null or tiempo_preparacion_minutos > 0);

-- Rollback manual (solo si decidís abandonar la funcionalidad):
-- alter table platos drop constraint if exists platos_tiempo_preparacion_positivo;
-- alter table platos drop column if exists tiempo_preparacion_minutos,
--   drop column if exists imagen_card_url, drop column if exists imagen_hero_url,
--   drop column if exists imagen_recorte_url, drop column if exists video_url,
--   drop column if exists poster_video_url, drop column if exists focal_x,
--   drop column if exists focal_y, drop column if exists color_fondo_media,
--   drop column if exists animacion_media;
