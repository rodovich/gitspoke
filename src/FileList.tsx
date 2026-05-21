export function FileList({
  files,
}: {
  files: Array<{ id: string; name: string; status?: 'added' | 'deleted' }>
}) {
  return (
    <div className="file-list">
      {files.map((f) => {
        const idx = f.name.lastIndexOf('/')
        const base = idx < 0 ? f.name : f.name.slice(idx + 1)
        const dir = idx < 0 ? '' : f.name.slice(0, idx)
        return (
          <a
            key={f.id}
            href={`#${f.id}`}
            className={f.status}
            onClick={(e) => {
              e.preventDefault()
              if (f.id === 'overview') window.scrollTo({ top: 0, behavior: 'instant' })
              else document.getElementById(f.id)?.scrollIntoView({ behavior: 'instant', block: 'start' })
            }}
          >
            <span className="file-basename">{base}</span>
            {dir && <span className="file-dir">{dir}</span>}
          </a>
        )
      })}
    </div>
  )
}
