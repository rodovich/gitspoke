export function FileList({ files }: { files: Array<{ id: string; name: string }> }) {
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
            onClick={(e) => {
              e.preventDefault()
              document.getElementById(f.id)?.scrollIntoView({ behavior: 'instant', block: 'start' })
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
