/**
 * Pie de las pantallas públicas. Existía como componente pero no se usaba en
 * ninguna página, y traía colores fijos del tema oscuro anterior (invisible
 * sobre la carta clara). Ahora usa los tokens de la marca y cierra tanto la
 * portada como la carta en modo vista.
 */
export default function Footer({ nombre }: { nombre?: string }) {
  return (
    <footer className="messa-credit">
      <span>{nombre ? `${nombre} · ` : ''}MESSA</span>
      <p>
        Creado por <b>Matías Colimodio</b> ·{' '}
        <a href="mailto:matiascolimodio@gmail.com">matiascolimodio@gmail.com</a>
      </p>
    </footer>
  )
}
