export default function AdminLoading() {
  return (
    <section className="messa-workspace messa-loading" aria-label="Cargando módulo">
      <header className="messa-workspace__header">
        <div>
          <span className="messa-skeleton messa-skeleton--eyebrow" />
          <span className="messa-skeleton messa-skeleton--title" />
          <span className="messa-skeleton messa-skeleton--copy" />
        </div>
      </header>
      <div className="messa-metrics">
        {[0, 1, 2, 3].map(item => <span className="messa-skeleton messa-skeleton--metric" key={item} />)}
      </div>
      <span className="messa-skeleton messa-skeleton--panel" />
    </section>
  )
}
