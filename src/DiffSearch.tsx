import { Fragment, useEffect, useMemo, useRef, useState } from 'react'

function highlightMatch(text: string, qLower: string) {
  if (!qLower) return text
  const lower = text.toLowerCase()
  const parts: React.ReactNode[] = []
  let i = 0
  while (i < text.length) {
    const at = lower.indexOf(qLower, i)
    if (at < 0) {
      parts.push(text.slice(i))
      break
    }
    if (at > i) parts.push(text.slice(i, at))
    parts.push(
      <span key={at} className="match">
        {text.slice(at, at + qLower.length)}
      </span>,
    )
    i = at + qLower.length
  }
  return <Fragment>{parts}</Fragment>
}

type Result = {
  key: string
  file: string
  line: string
  el: HTMLElement
  status?: 'added' | 'deleted'
}

export function DiffSearch({
  diffRef,
  open,
}: {
  diffRef: React.RefObject<HTMLDivElement | null>
  open: boolean
}) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus({ preventScroll: true })
  }, [open])

  const q = query.trim()
  const qLower = q.toLowerCase()

  const results = useMemo<Result[]>(() => {
    if (!qLower || !diffRef.current) return []
    const ctns = diffRef.current.querySelectorAll<HTMLElement>('.d2h-code-line-ctn')
    const out: Result[] = []
    ctns.forEach((ctn, i) => {
      const text = ctn.textContent ?? ''
      if (!text.toLowerCase().includes(qLower)) return
      const row = ctn.closest<HTMLElement>('tr')
      if (!row) return
      const wrapper = row.closest<HTMLElement>('.d2h-file-wrapper')
      const baseEl = wrapper?.querySelector<HTMLElement>('.d2h-file-name .file-basename')
      const file = baseEl?.textContent ?? wrapper?.querySelector<HTMLElement>('.d2h-file-name')?.textContent ?? ''
      const td = ctn.closest<HTMLElement>('td')
      const status = td?.classList.contains('d2h-ins')
        ? 'added'
        : td?.classList.contains('d2h-del')
          ? 'deleted'
          : undefined
      out.push({ key: `${i}`, file, line: text, el: row, status })
    })
    return out
  }, [qLower, diffRef])

  return (
    <div className="diff-search">
      <input
        ref={inputRef}
        type="search"
        placeholder="Search diff…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="search-results">
        {results.map((r) => (
          <a
            key={r.key}
            href="#"
            className={r.status}
            onClick={(e) => {
              e.preventDefault()
              r.el.scrollIntoView({ behavior: 'instant', block: 'center' })
              r.el.classList.remove('flash')
              void r.el.offsetWidth
              r.el.classList.add('flash')
              r.el.addEventListener('animationend', () => r.el.classList.remove('flash'), {
                once: true,
              })
            }}
          >
            <span className="search-line">{highlightMatch(r.line, qLower)}</span>
            <span className="search-file">{r.file}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
