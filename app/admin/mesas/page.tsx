import { redirect } from 'next/navigation'

/**
 * "Mesas y QR" era una pantalla aparte de "Salón": el mismo salón dividido en
 * dos lugares, y había que saltar de uno al otro para acomodar una mesa y
 * después imprimir su QR. Ahora todo vive en un único panel (/dashboard):
 * el plano editable, el alta de mesas, la ficha de cada mesa y los códigos QR.
 *
 * La ruta se conserva y redirige para no romper enlaces guardados.
 */
export default function MesasQrPage() {
  redirect('/dashboard')
}
