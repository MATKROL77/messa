-- Bitácora: quién hizo qué.
--
-- Viaja por la misma tabla `estado_operativo` que el resto del estado, así que
-- lo único que hace falta es que el tipo 'bitacora' sea válido. Se guarda una
-- fila por evento —no un paquete— porque un registro que sólo crece no puede
-- reemplazarse entero: el último dispositivo en hablar borraría lo que
-- anotaron los demás.
--
-- Correr una sola vez sobre la base del proyecto.

alter table estado_operativo drop constraint if exists estado_operativo_tipo_valido;

alter table estado_operativo add constraint estado_operativo_tipo_valido
  check (tipo in ('mesa','pedido','llamado','elemento','bitacora','carta','stock','agenda','finanzas','ajustes'));

-- La bitácora se consulta por fecha descendente y casi siempre de una sucursal
-- sola. Sin este índice, con un año de operación la pantalla tardaría.
create index if not exists estado_operativo_bitacora_idx
  on estado_operativo (sucursal_id, updated_at desc)
  where tipo = 'bitacora';
