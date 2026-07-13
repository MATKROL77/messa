export type MesaEstado = 'libre' | 'ocupada' | 'pedido' | 'pagando' | 'pagada'
export type RolUsuario = 'creator' | 'admin' | 'editor'
export type MetodoPago = 'tarjeta' | 'transferencia' | 'mercadopago' | 'efectivo'
export type OrigenPedido = 'mesa' | 'pedidosya' | 'rappi' | 'ubereats' | 'otro'
export type PlataformaDelivery = 'pedidosya' | 'rappi' | 'ubereats' | 'otro'

export interface Sucursal {
  id: string
  nombre: string
  direccion: string
  telefono: string
  activa: boolean
  created_at: string
}

export interface Mesa {
  id: string
  numero: number
  estado: MesaEstado
  dispositivos: string[]
  pos_x: number
  pos_y: number
  forma: 'redonda' | 'cuadrada' | 'rectangular'
  capacidad: number
  sucursal_id: string
  nota_staff?: string
  created_at: string
  updated_at: string
}

export interface Categoria {
  id: string
  nombre: string
  emoji: string
  orden: number
}

export interface Ingrediente {
  id: string
  nombre: string
  removible: boolean
}

export interface InsumoRequerido {
  insumo_id: string
  cantidad_por_porcion: number
}

export interface Modificador {
  id: string
  nombre: string
  opciones: { id: string; nombre: string; precio_extra: number }[]
  obligatorio: boolean
  multiple: boolean
}

export interface ReviewPlato {
  id: string
  autor: string
  rating: number
  comentario: string
  created_at: string
}

export interface Plato {
  id: string
  nombre: string
  descripcion: string
  precio: number
  categoria_id: string
  categoria?: Categoria
  ingredientes: Ingrediente[]
  insumos_requeridos: InsumoRequerido[]
  modificadores: Modificador[]
  tags: string[]
  calorias?: number
  proteinas?: number
  carbohidratos?: number
  grasas?: number
  imagen_url: string
  video_url?: string
  disponible: boolean
  destacado: boolean
  orden: number
  rating: number
  total_reviews: number
  reviews_muestra?: ReviewPlato[]
  maridaje?: {
    plato_id: string
    nombre: string
    precio: number
    emoji: string
    porcentaje_conversion: number
  }[]
}

export interface Insumo {
  id: string
  nombre: string
  cantidad: number
  unidad: 'kg' | 'g' | 'l' | 'ml' | 'unidad' | 'porcion'
  cantidad_critica: number
  cantidad_pedido_sugerido: number
  proveedor?: string
  costo_unitario: number
  activo: boolean
  sucursal_id: string
  ultima_actualizacion: string
}

export interface PropinaConfig {
  habilitada: boolean
  opciones: number[]
  permitir_personalizado: boolean
}

export interface Tema {
  color_primario: string
  color_fondo: string
  fuente_titulos: string
  nombre_marca: string
  logo_emoji: string
}

export interface ConfigPOS {
  proveedor: 'ninguno' | 'maxirest' | 'alohar' | 'personalizado'
  conectado: boolean
  webhook_url: string
  api_key: string
  impresora_ip: string
  impresora_puerto: string
  ultima_conexion?: string
}

export interface PaneraOpcion {
  id: string
  nombre: string
  precio: number
}

export interface ConfigPanera {
  habilitada: boolean
  titulo: string
  opciones: PaneraOpcion[]
}

export interface ConfigDelivery {
  id: string
  plataforma: PlataformaDelivery
  nombre: string
  conectado: boolean
  api_key: string
  webhook_url: string
  comision_porcentaje: number
  ultima_conexion?: string
}

export interface Gasto {
  id: string
  categoria: string
  descripcion: string
  monto: number
  fecha: string
  sucursal_id?: string
  created_at: string
}

export interface RecompensaFidelidad {
  id: string
  nombre: string
  descripcion: string
  puntos_requeridos: number
  activa: boolean
}

export interface FidelidadConfig {
  habilitado: boolean
  puntos_por_resena: number
  puntos_por_1000_gastado: number
}

export interface ConfigRestaurante {
  nombre: string
  subtitulo: string
  mostrar_nutricion: boolean
  panera: ConfigPanera
  chef_recomendaciones_habilitadas: boolean
  mp_public_key: string
  cbu: string
  cvu: string
  alias: string
  cbu_titular: string
  caja_abierta: boolean
  fecha_apertura_caja: string
  moneda: string
  iva_porcentaje: number
  pos: ConfigPOS
}

export interface ItemPedido {
  id: string
  plato: Plato
  cantidad: number
  ingredientes_removidos: string[]
  modificadores_elegidos: string[]
  notas: string
  precio_unitario: number
  dispositivo_id: string
}

export interface Pedido {
  id: string
  mesa_id: string
  mesa_numero: number
  items: ItemPedido[]
  estado: 'pendiente' | 'en_cocina' | 'listo' | 'entregado' | 'pagado' | 'cancelado'
  total: number
  propina: number
  dispositivo_id: string
  sucursal_id: string
  origen: OrigenPedido
  created_at: string
  updated_at: string
  metodo_pago?: MetodoPago
  cliente_email?: string
  confirmado_staff?: boolean
  preference_id?: string
  panera?: string
}

export interface CierreDiario {
  id: string
  fecha: string
  hora_apertura: string
  hora_cierre: string
  total_ventas: number
  total_propinas: number
  total_pedidos: number
  total_mesas_atendidas: number
  ticket_promedio: number
  ventas_por_categoria: Record<string, number>
  ventas_por_metodo: Record<string, number>
  created_at: string
}

export interface Usuario {
  id: string
  nombre: string
  email: string
  password: string
  rol: RolUsuario
  activo: boolean
  created_at: string
}

export interface LlamadoMozo {
  id: string
  mesa_id: string
  mesa_numero: number
  motivo: string
  atendido: boolean
  created_at: string
}

export interface Sesion {
  mesa_id: string
  mesa_numero: number
  dispositivo_id: string
  modo: 'curioso' | 'comensal' | 'post_pago'
}
