import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { marked } from 'marked'
import { Changes } from './Changes'

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

  if (error) return <div className="error">{error}</div>
  if (!data) return <div className="placeholder">loading…</div>

  const { meta } = data
  return <Changes meta={meta} diff={data.diff} />
}
