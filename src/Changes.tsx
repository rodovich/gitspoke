import { useEffect, useRef, useState } from 'react'
import { Diff2HtmlUI } from 'diff2html/lib/ui/js/diff2html-ui'
import { FileList } from './FileList'

export function Changes({ diff, hidden }: { diff: string; hidden: boolean }) {
  const [files, setFiles] = useState<Array<{ id: string; name: string }>>([])
  const diffRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!diffRef.current) return
    diffRef.current.innerHTML = ''
    const ui = new Diff2HtmlUI(diffRef.current, diff, {
      drawFileList: false,
      matching: 'lines',
      outputFormat: 'line-by-line',
    })
    ui.draw()
    ui.highlightCode()
    const next: Array<{ id: string; name: string }> = []
    diffRef.current.querySelectorAll<HTMLElement>('.d2h-file-wrapper').forEach((wrapper, i) => {
      const id = `file-${i}`
      wrapper.id = id
      const nameEl = wrapper.querySelector<HTMLElement>('.d2h-file-name')
      const text = nameEl?.textContent ?? ''
      next.push({ id, name: text })
      if (!nameEl) return
      const idx = text.lastIndexOf('/')
      const base = document.createElement('span')
      base.className = 'file-basename'
      base.textContent = idx < 0 ? text : text.slice(idx + 1)
      if (idx < 0) {
        nameEl.replaceChildren(base)
      } else {
        const dir = document.createElement('span')
        dir.className = 'file-dir'
        dir.textContent = text.slice(0, idx)
        nameEl.replaceChildren(base, dir)
      }
    })
    const sorted = [...next].sort((a, b) => {
      const ai = a.name.lastIndexOf('/')
      const bi = b.name.lastIndexOf('/')
      const aDir = ai < 0 ? '' : a.name.slice(0, ai)
      const bDir = bi < 0 ? '' : b.name.slice(0, bi)
      if (aDir !== bDir) return aDir < bDir ? -1 : 1
      const aBase = ai < 0 ? a.name : a.name.slice(ai + 1)
      const bBase = bi < 0 ? b.name : b.name.slice(bi + 1)
      return aBase < bBase ? -1 : aBase > bBase ? 1 : 0
    })
    setFiles(sorted)
  }, [diff])

  return (
    <div className="changes" hidden={hidden}>
      <aside>
        <FileList files={files} />
      </aside>
      <div className="diff" ref={diffRef} />
    </div>
  )
}
