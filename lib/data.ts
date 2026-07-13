import { Plato, Categoria, Insumo, ConfigRestaurante, PropinaConfig, Tema, Sucursal, ConfigDelivery, FidelidadConfig, RecompensaFidelidad } from '@/types'

export const sucursalesIniciales: Sucursal[] = [
  { id: 'suc1', nombre: 'Kansas Palermo', direccion: 'Av. Libertador 3900, CABA', telefono: '11 4802-0000', activa: true, created_at: new Date().toISOString() },
  { id: 'suc2', nombre: 'Kansas Nordelta', direccion: 'Av. de los Lagos 6500, Tigre', telefono: '11 4871-0000', activa: true, created_at: new Date().toISOString() },
]

export const categoriasIniciales: Categoria[] = [
  { id: 'entradas', nombre: 'Entradas', emoji: '🥗', orden: 1 },
  { id: 'pastas', nombre: 'Pastas', emoji: '🍝', orden: 2 },
  { id: 'carnes', nombre: 'Carnes', emoji: '🥩', orden: 3 },
  { id: 'pescados', nombre: 'Pescados', emoji: '🐟', orden: 4 },
  { id: 'postres', nombre: 'Postres', emoji: '🍮', orden: 5 },
  { id: 'bebidas', nombre: 'Bebidas', emoji: '🍷', orden: 6 },
]

export const tagsIniciales: string[] = ['Sin TACC', 'Vegetariano', 'Vegano', 'Sin Lactosa', 'Picante', 'Sin Azúcar', 'Apto Diabéticos', 'Kosher']

const u = () => new Date().toISOString()

export const insumosIniciales: Insumo[] = [
  { id: 'ins1', nombre: 'Ojo de bife', cantidad: 12, unidad: 'kg', cantidad_critica: 3, cantidad_pedido_sugerido: 15, proveedor: 'Frigorífico La Rural', costo_unitario: 2800, activo: true, sucursal_id: 'suc1', ultima_actualizacion: u() },
  { id: 'ins2', nombre: 'Pasta fresca tagliatelle', cantidad: 6, unidad: 'kg', cantidad_critica: 2, cantidad_pedido_sugerido: 8, proveedor: 'Pastificio Artesanal', costo_unitario: 850, activo: true, sucursal_id: 'suc1', ultima_actualizacion: u() },
  { id: 'ins3', nombre: 'Hongos porcini', cantidad: 1.5, unidad: 'kg', cantidad_critica: 0.5, cantidad_pedido_sugerido: 3, proveedor: 'Distribuidora Gourmet', costo_unitario: 4200, activo: true, sucursal_id: 'suc1', ultima_actualizacion: u() },
  { id: 'ins4', nombre: 'Salmón atlántico', cantidad: 8, unidad: 'kg', cantidad_critica: 2, cantidad_pedido_sugerido: 10, proveedor: 'Pesquera del Sur', costo_unitario: 3100, activo: true, sucursal_id: 'suc1', ultima_actualizacion: u() },
  { id: 'ins5', nombre: 'Mascarpone', cantidad: 4, unidad: 'kg', cantidad_critica: 1, cantidad_pedido_sugerido: 5, proveedor: 'Lácteos Premium', costo_unitario: 1200, activo: true, sucursal_id: 'suc1', ultima_actualizacion: u() },
  { id: 'ins6', nombre: 'Chocolate belga 70%', cantidad: 3, unidad: 'kg', cantidad_critica: 0.5, cantidad_pedido_sugerido: 4, proveedor: 'Distribuidora Cacao', costo_unitario: 2400, activo: true, sucursal_id: 'suc1', ultima_actualizacion: u() },
  { id: 'ins7', nombre: 'Langostinos', cantidad: 5, unidad: 'kg', cantidad_critica: 1.5, cantidad_pedido_sugerido: 7, proveedor: 'Pesquera del Sur', costo_unitario: 3800, activo: true, sucursal_id: 'suc1', ultima_actualizacion: u() },
  { id: 'ins8', nombre: 'Trufa negra', cantidad: 0.3, unidad: 'kg', cantidad_critica: 0.1, cantidad_pedido_sugerido: 0.5, proveedor: 'Importadora Gourmet', costo_unitario: 48000, activo: true, sucursal_id: 'suc1', ultima_actualizacion: u() },
  { id: 'ins9', nombre: 'Burrata', cantidad: 15, unidad: 'unidad', cantidad_critica: 4, cantidad_pedido_sugerido: 20, proveedor: 'Lácteos Premium', costo_unitario: 780, activo: true, sucursal_id: 'suc1', ultima_actualizacion: u() },
  { id: 'ins10', nombre: 'Arroz arbóreo', cantidad: 8, unidad: 'kg', cantidad_critica: 2, cantidad_pedido_sugerido: 10, proveedor: 'Distribuidora Granos', costo_unitario: 420, activo: true, sucursal_id: 'suc1', ultima_actualizacion: u() },
  { id: 'ins11', nombre: 'Pan artesanal (panera)', cantidad: 40, unidad: 'unidad', cantidad_critica: 10, cantidad_pedido_sugerido: 50, proveedor: 'Panadería Artesanal', costo_unitario: 180, activo: true, sucursal_id: 'suc1', ultima_actualizacion: u() },
  { id: 'ins12', nombre: 'Malbec Reserva (botella)', cantidad: 24, unidad: 'unidad', cantidad_critica: 6, cantidad_pedido_sugerido: 24, proveedor: 'Bodega Catena', costo_unitario: 1800, activo: true, sucursal_id: 'suc1', ultima_actualizacion: u() },
  // Sucursal 2 — stock propio e independiente
  { id: 'ins1b', nombre: 'Ojo de bife', cantidad: 7, unidad: 'kg', cantidad_critica: 3, cantidad_pedido_sugerido: 15, proveedor: 'Frigorífico Norte', costo_unitario: 2900, activo: true, sucursal_id: 'suc2', ultima_actualizacion: u() },
  { id: 'ins2b', nombre: 'Pasta fresca tagliatelle', cantidad: 4, unidad: 'kg', cantidad_critica: 2, cantidad_pedido_sugerido: 8, proveedor: 'Pastificio Artesanal', costo_unitario: 860, activo: true, sucursal_id: 'suc2', ultima_actualizacion: u() },
  { id: 'ins6b', nombre: 'Chocolate belga 70%', cantidad: 2, unidad: 'kg', cantidad_critica: 0.5, cantidad_pedido_sugerido: 4, proveedor: 'Distribuidora Cacao', costo_unitario: 2450, activo: true, sucursal_id: 'suc2', ultima_actualizacion: u() },
  { id: 'ins11b', nombre: 'Pan artesanal (panera)', cantidad: 25, unidad: 'unidad', cantidad_critica: 10, cantidad_pedido_sugerido: 50, proveedor: 'Panadería del Lago', costo_unitario: 190, activo: true, sucursal_id: 'suc2', ultima_actualizacion: u() },
]

const reviewsMuestraDefault = [
  { id: 'rv1', autor: 'Comensal verificado', rating: 5, comentario: 'Excelente presentación y sabor. Volvería sin dudar.', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 'rv2', autor: 'Comensal verificado', rating: 4, comentario: 'Muy bueno, la porción es generosa.', created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
]

export const platosIniciales: Plato[] = [
  { id: 'p1', nombre: 'Burrata con tomates cherry', descripcion: 'Burrata cremosa, tomates cherry asados, albahaca fresca, aceite de oliva extra virgen y reducción de balsámico.', precio: 4200, categoria_id: 'entradas', ingredientes: [{ id: 'i1', nombre: 'Burrata', removible: false }, { id: 'i2', nombre: 'Tomates cherry', removible: true }, { id: 'i3', nombre: 'Albahaca', removible: true }, { id: 'i4', nombre: 'Aceite de oliva', removible: false }, { id: 'i5', nombre: 'Reducción balsámico', removible: true }], insumos_requeridos: [{ insumo_id: 'ins9', cantidad_por_porcion: 1 }], modificadores: [], tags: ['Vegetariano', 'Sin TACC'], calorias: 280, proteinas: 14, carbohidratos: 8, grasas: 22, imagen_url: 'https://images.unsplash.com/photo-1607532941433-304659e8198a?w=600', disponible: true, destacado: false, orden: 1, rating: 4.8, total_reviews: 142, reviews_muestra: reviewsMuestraDefault, maridaje: [{ plato_id: 'b1', nombre: 'Chardonnay Reserva', precio: 3800, emoji: '🥂', porcentaje_conversion: 65 }] },
  { id: 'p2', nombre: 'Tagliatelle al funghi', descripcion: 'Pasta fresca artesanal, hongos porcini rehidratados, trufa negra rallada, parmesano 24 meses y manteca de hierbas.', precio: 5800, categoria_id: 'pastas', ingredientes: [{ id: 'i7', nombre: 'Pasta fresca', removible: false }, { id: 'i8', nombre: 'Hongos porcini', removible: false }, { id: 'i9', nombre: 'Trufa negra', removible: true }, { id: 'i10', nombre: 'Parmesano', removible: true }, { id: 'i11', nombre: 'Manteca', removible: true }, { id: 'i12', nombre: 'Ajo', removible: true }], insumos_requeridos: [{ insumo_id: 'ins2', cantidad_por_porcion: 0.2 }, { insumo_id: 'ins3', cantidad_por_porcion: 0.08 }, { insumo_id: 'ins8', cantidad_por_porcion: 0.005 }], modificadores: [{ id: 'mod1', nombre: 'Acompañamiento', obligatorio: true, multiple: false, opciones: [{ id: 'op1', nombre: 'Sin acompañamiento', precio_extra: 0 }, { id: 'op2', nombre: 'Pan de ajo', precio_extra: 800 }, { id: 'op3', nombre: 'Ensalada verde', precio_extra: 1200 }] }], tags: ['Vegetariano'], calorias: 318, proteinas: 12, carbohidratos: 44, grasas: 11, imagen_url: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600', disponible: true, destacado: true, orden: 2, rating: 4.7, total_reviews: 203, reviews_muestra: reviewsMuestraDefault, maridaje: [{ plato_id: 'b2', nombre: 'Malbec Reserva 2021', precio: 4200, emoji: '🍷', porcentaje_conversion: 70 }] },
  { id: 'p3', nombre: 'Ojo de bife 400g', descripcion: 'Corte premium de ojo de bife a la parrilla, manteca de hierbas finas, papas rústicas al romero y chimichurri de la casa.', precio: 8400, categoria_id: 'carnes', ingredientes: [{ id: 'i14', nombre: 'Ojo de bife', removible: false }, { id: 'i15', nombre: 'Manteca de hierbas', removible: true }, { id: 'i16', nombre: 'Papas rústicas', removible: true }, { id: 'i17', nombre: 'Chimichurri', removible: true }], insumos_requeridos: [{ insumo_id: 'ins1', cantidad_por_porcion: 0.45 }], modificadores: [{ id: 'mod2', nombre: 'Punto de cocción', obligatorio: true, multiple: false, opciones: [{ id: 'pc1', nombre: 'Jugoso', precio_extra: 0 }, { id: 'pc2', nombre: 'A punto', precio_extra: 0 }, { id: 'pc3', nombre: 'Bien cocido', precio_extra: 0 }] }, { id: 'mod3', nombre: 'Acompañamiento', obligatorio: false, multiple: false, opciones: [{ id: 'ac1', nombre: 'Papas fritas', precio_extra: 0 }, { id: 'ac2', nombre: 'Puré de papas', precio_extra: 0 }, { id: 'ac3', nombre: 'Puré de batata', precio_extra: 0 }, { id: 'ac4', nombre: 'Ensalada mixta', precio_extra: 0 }] }], tags: ['Sin TACC'], calorias: 620, proteinas: 58, carbohidratos: 12, grasas: 38, imagen_url: 'https://images.unsplash.com/photo-1558030006-450675393462?w=600', disponible: true, destacado: true, orden: 3, rating: 4.9, total_reviews: 318, reviews_muestra: reviewsMuestraDefault, maridaje: [{ plato_id: 'b3', nombre: 'Cabernet Sauvignon Gran Reserva', precio: 5600, emoji: '🍷', porcentaje_conversion: 82 }] },
  { id: 'p4', nombre: 'Salmón a la plancha', descripcion: 'Filete de salmón atlántico, costra de sésamo y hierbas, puré de coliflor trufado y espárragos salteados.', precio: 7200, categoria_id: 'pescados', ingredientes: [{ id: 'i19', nombre: 'Salmón', removible: false }, { id: 'i20', nombre: 'Sésamo', removible: true }, { id: 'i21', nombre: 'Puré de coliflor', removible: true }, { id: 'i22', nombre: 'Espárragos', removible: true }], insumos_requeridos: [{ insumo_id: 'ins4', cantidad_por_porcion: 0.3 }], modificadores: [], tags: ['Sin TACC'], calorias: 420, proteinas: 46, carbohidratos: 14, grasas: 22, imagen_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600', disponible: true, destacado: false, orden: 4, rating: 4.6, total_reviews: 156, reviews_muestra: reviewsMuestraDefault, maridaje: [{ plato_id: 'b4', nombre: 'Sauvignon Blanc', precio: 3400, emoji: '🥂', porcentaje_conversion: 74 }] },
  { id: 'p5', nombre: 'Risotto de mariscos', descripcion: 'Arroz arbóreo cremoso, langostinos, mejillones y calamar, azafrán, parmesano y un toque de vino blanco.', precio: 6800, categoria_id: 'pastas', ingredientes: [{ id: 'i24', nombre: 'Arroz arbóreo', removible: false }, { id: 'i25', nombre: 'Langostinos', removible: false }, { id: 'i26', nombre: 'Mejillones', removible: true }, { id: 'i28', nombre: 'Azafrán', removible: false }, { id: 'i29', nombre: 'Parmesano', removible: true }], insumos_requeridos: [{ insumo_id: 'ins10', cantidad_por_porcion: 0.15 }, { insumo_id: 'ins7', cantidad_por_porcion: 0.2 }], modificadores: [], tags: ['Sin TACC'], calorias: 480, proteinas: 32, carbohidratos: 52, grasas: 16, imagen_url: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600', disponible: true, destacado: true, orden: 5, rating: 4.8, total_reviews: 189, reviews_muestra: reviewsMuestraDefault, maridaje: [{ plato_id: 'b4', nombre: 'Sauvignon Blanc', precio: 3400, emoji: '🥂', porcentaje_conversion: 68 }] },
  { id: 'p6', nombre: 'Volcán de chocolate', descripcion: 'Coulant de chocolate belga 70%, corazón líquido caliente, helado de vainilla artesanal y frambuesas frescas.', precio: 3200, categoria_id: 'postres', ingredientes: [{ id: 'i31', nombre: 'Chocolate 70%', removible: false }, { id: 'i32', nombre: 'Helado de vainilla', removible: true }, { id: 'i33', nombre: 'Frambuesas', removible: true }], insumos_requeridos: [{ insumo_id: 'ins6', cantidad_por_porcion: 0.12 }], modificadores: [], tags: ['Vegetariano'], calorias: 520, proteinas: 8, carbohidratos: 62, grasas: 28, imagen_url: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600', disponible: true, destacado: false, orden: 6, rating: 4.9, total_reviews: 412, reviews_muestra: reviewsMuestraDefault },
  { id: 'p7', nombre: 'Tiramisú della casa', descripcion: 'Receta original con mascarpone, café espresso, savoiardi, yemas pasteurizadas y cacao amargo en polvo.', precio: 2800, categoria_id: 'postres', ingredientes: [{ id: 'i35', nombre: 'Mascarpone', removible: false }, { id: 'i36', nombre: 'Café espresso', removible: false }, { id: 'i37', nombre: 'Savoiardi', removible: false }, { id: 'i38', nombre: 'Cacao amargo', removible: true }], insumos_requeridos: [{ insumo_id: 'ins5', cantidad_por_porcion: 0.15 }], modificadores: [], tags: ['Vegetariano'], calorias: 440, proteinas: 10, carbohidratos: 48, grasas: 24, imagen_url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600', disponible: true, destacado: false, orden: 7, rating: 4.7, total_reviews: 287, reviews_muestra: reviewsMuestraDefault },
  { id: 'b1', nombre: 'Chardonnay Reserva', descripcion: 'Zuccardi Valle de Uco. Notas de durazno y vainilla.', precio: 3800, categoria_id: 'bebidas', ingredientes: [], insumos_requeridos: [{ insumo_id: 'ins12', cantidad_por_porcion: 0.25 }], modificadores: [], tags: ['Vegano', 'Sin TACC'], imagen_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600', disponible: true, destacado: false, orden: 8, rating: 4.6, total_reviews: 94 },
  { id: 'b2', nombre: 'Malbec Reserva 2021', descripcion: 'Catena Zapata, Mendoza. Cuerpo pleno, taninos sedosos.', precio: 4200, categoria_id: 'bebidas', ingredientes: [], insumos_requeridos: [{ insumo_id: 'ins12', cantidad_por_porcion: 0.25 }], modificadores: [], tags: ['Vegano', 'Sin TACC'], imagen_url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600', disponible: true, destacado: false, orden: 9, rating: 4.8, total_reviews: 178 },
  { id: 'b3', nombre: 'Cabernet Sauvignon Gran Reserva', descripcion: 'Rutini, Luján de Cuyo. Estructura poderosa, notas de cedro.', precio: 5600, categoria_id: 'bebidas', ingredientes: [], insumos_requeridos: [], modificadores: [], tags: ['Vegano', 'Sin TACC'], imagen_url: 'https://images.unsplash.com/photo-1586370434639-0fe43b2d32e6?w=600', disponible: true, destacado: false, orden: 10, rating: 4.9, total_reviews: 203 },
  { id: 'b4', nombre: 'Sauvignon Blanc', descripcion: 'Clos de los Siete, Mendoza. Fresco, cítrico, mineral.', precio: 3400, categoria_id: 'bebidas', ingredientes: [], insumos_requeridos: [], modificadores: [], tags: ['Vegano', 'Sin TACC'], imagen_url: 'https://images.unsplash.com/photo-1574637629423-d69f67d67ef3?w=600', disponible: true, destacado: false, orden: 11, rating: 4.5, total_reviews: 112 },
  { id: 'b5', nombre: 'Agua mineral (500ml)', descripcion: 'Con y sin gas.', precio: 800, categoria_id: 'bebidas', ingredientes: [], insumos_requeridos: [], modificadores: [], tags: ['Vegano', 'Sin TACC'], imagen_url: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600', disponible: true, destacado: false, orden: 12, rating: 4.0, total_reviews: 45 },
]

// Las cuentas de acceso (creator/admin/editor) ya NO viven acá ni en ningún
// archivo del código fuente. Viven en variables de entorno del servidor como
// hash bcrypt (ver lib/auth-config.ts y .env.example). Esto es intencional:
// nunca debe haber una contraseña, ni siquiera de demo, dentro del repositorio.


export const propinaConfigInicial: PropinaConfig = { habilitada: true, opciones: [10, 15, 20], permitir_personalizado: true }
export const temaInicial: Tema = { color_primario: '#D4AF37', color_fondo: '#0A0A0A', fuente_titulos: "'Playfair Display', serif", nombre_marca: 'MenuFlow', logo_emoji: '🍽️' }

export const deliveryIntegracionesIniciales: ConfigDelivery[] = [
  { id: 'del1', plataforma: 'pedidosya', nombre: 'PedidosYa', conectado: false, api_key: '', webhook_url: '', comision_porcentaje: 27 },
  { id: 'del2', plataforma: 'rappi', nombre: 'Rappi', conectado: false, api_key: '', webhook_url: '', comision_porcentaje: 25 },
  { id: 'del3', plataforma: 'ubereats', nombre: 'Uber Eats', conectado: false, api_key: '', webhook_url: '', comision_porcentaje: 28 },
]

export const fidelidadConfigInicial: FidelidadConfig = { habilitado: true, puntos_por_resena: 50, puntos_por_1000_gastado: 10 }

export const recompensasFidelidadIniciales: RecompensaFidelidad[] = [
  { id: 'rec1', nombre: 'Postre de la casa gratis', descripcion: 'Canjeá por cualquier postre del menú', puntos_requeridos: 300, activa: true },
  { id: 'rec2', nombre: '10% de descuento en la cuenta', descripcion: 'Aplicable a una visita', puntos_requeridos: 500, activa: true },
  { id: 'rec3', nombre: 'Botella de vino de la casa', descripcion: 'Malbec Reserva o Chardonnay a elección', puntos_requeridos: 900, activa: true },
]

export const configInicial: ConfigRestaurante = {
  nombre: 'Kansas Steakhouse',
  subtitulo: 'Parrilla Premium · Buenos Aires',
  mostrar_nutricion: true,
  panera: {
    habilitada: true,
    titulo: '¿Desean panera de bienvenida?',
    opciones: [
      { id: 'pan1', nombre: 'Pan de campo + manteca casera', precio: 800 },
      { id: 'pan2', nombre: 'Pan de campo + 3 untables', precio: 1400 },
      { id: 'pan3', nombre: 'Sin panera, gracias', precio: 0 },
    ],
  },
  chef_recomendaciones_habilitadas: true,
  mp_public_key: '',
  cbu: '',
  cvu: '',
  alias: '',
  cbu_titular: '',
  caja_abierta: false,
  fecha_apertura_caja: '',
  moneda: 'ARS',
  iva_porcentaje: 21,
  pos: { proveedor: 'ninguno', conectado: false, webhook_url: '', api_key: '', impresora_ip: '', impresora_puerto: '9100' },
}

export const getMesasMock = () => [
  { id: 'm1', numero: 1, estado: 'ocupada', dispositivos: ['d1', 'd2', 'd3'], pos_x: 15, pos_y: 18, forma: 'redonda', capacidad: 4, sucursal_id: 'suc1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'm2', numero: 2, estado: 'pedido', dispositivos: ['d4', 'd5'], pos_x: 50, pos_y: 18, forma: 'cuadrada', capacidad: 2, sucursal_id: 'suc1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'm3', numero: 3, estado: 'libre', dispositivos: [], pos_x: 85, pos_y: 18, forma: 'redonda', capacidad: 4, sucursal_id: 'suc1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'm4', numero: 4, estado: 'pagando', dispositivos: ['d6', 'd7', 'd8', 'd9'], pos_x: 15, pos_y: 45, forma: 'rectangular', capacidad: 6, sucursal_id: 'suc1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'm5', numero: 5, estado: 'libre', dispositivos: [], pos_x: 50, pos_y: 45, forma: 'cuadrada', capacidad: 2, sucursal_id: 'suc1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'm6', numero: 6, estado: 'pedido', dispositivos: ['d10', 'd11'], pos_x: 85, pos_y: 45, forma: 'redonda', capacidad: 4, sucursal_id: 'suc1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'm7', numero: 7, estado: 'ocupada', dispositivos: ['d12'], pos_x: 15, pos_y: 72, forma: 'cuadrada', capacidad: 2, sucursal_id: 'suc1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'm8', numero: 8, estado: 'libre', dispositivos: [], pos_x: 50, pos_y: 72, forma: 'redonda', capacidad: 4, sucursal_id: 'suc1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'm9', numero: 9, estado: 'pedido', dispositivos: ['d13', 'd14', 'd15'], pos_x: 85, pos_y: 72, forma: 'rectangular', capacidad: 6, sucursal_id: 'suc1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'm10', numero: 10, estado: 'pagada', dispositivos: ['d16'], pos_x: 15, pos_y: 90, forma: 'redonda', capacidad: 4, sucursal_id: 'suc1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'm11', numero: 11, estado: 'libre', dispositivos: [], pos_x: 50, pos_y: 90, forma: 'cuadrada', capacidad: 2, sucursal_id: 'suc1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'm12', numero: 12, estado: 'ocupada', dispositivos: ['d18', 'd19'], pos_x: 85, pos_y: 90, forma: 'redonda', capacidad: 4, sucursal_id: 'suc1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // Sucursal 2
  { id: 'm101', numero: 1, estado: 'libre', dispositivos: [], pos_x: 25, pos_y: 25, forma: 'redonda', capacidad: 4, sucursal_id: 'suc2', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'm102', numero: 2, estado: 'ocupada', dispositivos: ['e1', 'e2'], pos_x: 60, pos_y: 25, forma: 'cuadrada', capacidad: 2, sucursal_id: 'suc2', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'm103', numero: 3, estado: 'libre', dispositivos: [], pos_x: 25, pos_y: 60, forma: 'redonda', capacidad: 4, sucursal_id: 'suc2', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'm104', numero: 4, estado: 'pedido', dispositivos: ['e3'], pos_x: 60, pos_y: 60, forma: 'rectangular', capacidad: 6, sucursal_id: 'suc2', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]
