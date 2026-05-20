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
      </header>
      <hr/>
      <div className="diff" ref={diffRef} />
    </div>
  )
}
