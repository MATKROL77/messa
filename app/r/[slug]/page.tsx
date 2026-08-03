import RestauranteEntrada from './entrada'

/**
 * Puerta de entrada de cada restaurante: `messa.app/r/bonafide`.
 *
 * Es la dirección que va impresa en los QR y en la vidriera. Resuelve el
 * nombre corto al restaurante, lo deja fijado en este dispositivo y manda a
 * la carta. Desde ahí todo lo que pida el comensal sale del restaurante
 * correcto, sin que él tenga que elegir nada.
 */
export default async function RestaurantePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <RestauranteEntrada slug={slug} />
}
