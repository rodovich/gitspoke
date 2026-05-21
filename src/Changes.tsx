import { useEffect, useRef, useState } from 'react'
import { Diff2HtmlUI } from 'diff2html/lib/ui/js/diff2html-ui'
import { FileList } from './FileList'
import { DiffSearch } from './DiffSearch'
import { Overview } from './Overview'

type AsideContent = 'files' | 'search'

type Meta = {
  number: number
  title: string
  url: string
  state: 'OPEN' | 'CLOSED' | 'MERGED'
  body: string
  author: { login: string }
  headRefName: string
  baseRefName: string
  additions: number
  deletions: number
  changedFiles: number
}

const OVERVIEW_ENTRY = { id: 'overview', name: 'Overview' }

export function Changes({ meta, diff }: { meta: Meta; diff: string }) {
  const [files, setFiles] = useState<Array<{ id: string; name: string; status?: 'added' | 'deleted' }>>([OVERVIEW_ENTRY])
  const [asideContent, setAsideContent] = useState<AsideContent>('files')
  const [asideOpen, setAsideOpen] = useState(true)
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
    const next: Array<{ id: string; name: string; status?: 'added' | 'deleted' }> = []
    diffRef.current.querySelectorAll<HTMLElement>('.d2h-file-wrapper').forEach((wrapper, i) => {
      const id = `file-${i}`
      wrapper.id = id
      const nameEl = wrapper.querySelector<HTMLElement>('.d2h-file-name')
      const text = nameEl?.textContent ?? ''
      const status = wrapper.querySelector('.d2h-added-tag')
        ? 'added'
        : wrapper.querySelector('.d2h-deleted-tag')
          ? 'deleted'
          : undefined
      next.push({ id, name: text, status })
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
    setFiles([OVERVIEW_ENTRY, ...sorted])
  }, [diff])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.metaKey || !e.shiftKey) return
      if (e.code === 'KeyF') {
        e.preventDefault()
        const input = document.querySelector<HTMLInputElement>('.diff-search input')
        const inputFocused = document.activeElement === input
        if (asideOpen && asideContent === 'search' && inputFocused) {
          setAsideOpen(false)
        } else {
          setAsideContent('search')
          setAsideOpen(true)
          input?.focus({ preventScroll: true })
          input?.select()
        }
      } else if (e.code === 'KeyE') {
        e.preventDefault()
        if (asideOpen && asideContent === 'files') setAsideOpen(false)
        else {
          setAsideContent('files')
          setAsideOpen(true)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [asideOpen, asideContent])

  return (
    <>
      <div className="diff-column">
        <div className="diff-top">
          <header>
            <h1>
              {meta.title}
              <a href={meta.url} target="_blank" rel="noreferrer">
                #{meta.number}
              </a>
            </h1>
          </header>
          <Overview meta={meta} />
        </div>
        <div className="diff" ref={diffRef} />
      </div>
      <aside
        className={`${asideContent}${asideOpen ? '' : ' closed'}`}
        aria-hidden={!asideOpen}
      >
        {asideContent === 'files' && <FileList files={files} />}
        {asideContent === 'search' && <DiffSearch diffRef={diffRef} open={asideOpen} />}
      </aside>
    </>
  )
}
