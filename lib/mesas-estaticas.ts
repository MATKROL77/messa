import { getMesasMock } from '@/lib/data'

/**
 * Ids de mesa que se pregeneran cuando MESSA se publica como sitio estático
 * (la vista previa de GitHub Pages). En el despliegue completo estas rutas se
 * resuelven en el servidor y esta lista no se usa.
 *
 * Sólo alcanza a las mesas del layout inicial: una mesa creada después desde
 * Administración existe en el navegador del dueño, pero no tiene HTML propio
 * en la exportación estática.
 */
export function idsDeMesaEstaticos(): { id: string }[] {
  return getMesasMock().map(mesa => ({ id: mesa.id }))
}
