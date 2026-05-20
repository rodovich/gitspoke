import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Diff2HtmlUI } from 'diff2html/lib/ui/js/diff2html-ui'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ gfm: true, breaks: true })

type PrMeta = {
  number: number
  title: string
  body: string
  state: 'OPEN' | 'CLOSED' | 'MERGED'
  url: string
  author: { login: string }
  headRefName: string
  baseRefName: string
  additions: number
  deletions: number
  changedFiles: number
  createdAt: string
  updatedAt: string
}

type PrResponse = { meta: PrMeta; diff: string }

export function App() {
  const { org, repo, num } = useParams()
  const [data, setData] = useState<PrResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'overview' | 'changes'>('overview')
  const [files, setFiles] = useState<Array<{ id: string; name: string }>>([])
  const diffRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.title = `${org}/${repo}#${num}`
  }, [org, repo, num])

  useEffect(() => {
    if (data) document.title = `${data.meta.title} [${org}/${repo}#${num}]`
  }, [data, org, repo, num])

  useEffect(() => {
    setData(null)
    setError(null)
    let cancelled = false
    fetch(`/api/pr/${org}/${repo}/${num}`)
      .then(async (r) => {
        const body = await r.json()
        if (!r.ok) throw new Error(body.error ?? r.statusText)
        return body as PrResponse
      })
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message ?? String(e))
      })
    return () => {
      cancelled = true
    }
  }, [org, repo, num])

  useEffect(() => {
    if (!data || !diffRef.current) return
    diffRef.current.innerHTML = ''
    const ui = new Diff2HtmlUI(diffRef.current, data.diff, {
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
  }, [data])

  const bodyHtml = useMemo(() => {
    const body = data?.meta.body?.trim()
    if (!body) return ''
    return DOMPurify.sanitize(marked.parse(body, { async: false }) as string)
  }, [data])

  if (error) return <div className="error">{error}</div>
  if (!data) return <div className="placeholder">loading…</div>

  const { meta } = data
  return (
    <div className="pr">
      <header>
        <h1>
          {meta.title}
          <a href={meta.url} target="_blank" rel="noreferrer">
            #{meta.number}
          </a>
        </h1>
        <div className="tabs" role="tablist">
          <a
            role="tab"
            aria-selected={tab === 'overview'}
            className={tab === 'overview' ? 'active' : ''}
            onClick={(e) => {
              e.preventDefault()
              setTab('overview')
            }}
            href="#overview"
          >
            Overview
          </a>
          <a
            role="tab"
            aria-selected={tab === 'changes'}
            className={tab === 'changes' ? 'active' : ''}
            onClick={(e) => {
              e.preventDefault()
              setTab('changes')
            }}
            href="#changes"
          >
            Changes
          </a>
        </div>
      </header>
      <div className="overview" hidden={tab !== 'overview'}>
        {bodyHtml && <div className="body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />}
        <div className="sub">
          <span className={`state state-${meta.state.toLowerCase()}`}>{meta.state}</span>
          <span>by {meta.author.login}</span>
          <span>
            {meta.headRefName} → {meta.baseRefName}
          </span>
          <span>
            {meta.changedFiles} files · <span className="add">+{meta.additions}</span>{' '}
            <span className="del">−{meta.deletions}</span>
          </span>
        </div>
      </div>
      <div className="changes" hidden={tab !== 'changes'}>
        <aside>
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
        </aside>
        <div className="diff" ref={diffRef} />
      </div>
    </div>
  )
}
