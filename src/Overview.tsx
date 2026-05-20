import { useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

type Meta = {
  state: 'OPEN' | 'CLOSED' | 'MERGED'
  body: string
  author: { login: string }
  headRefName: string
  baseRefName: string
  additions: number
  deletions: number
  changedFiles: number
}

export function Overview({ meta, hidden }: { meta: Meta; hidden: boolean }) {
  const bodyHtml = useMemo(() => {
    const body = meta.body?.trim()
    if (!body) return ''
    return DOMPurify.sanitize(marked.parse(body, { async: false }) as string)
  }, [meta.body])

  return (
    <div className="overview" hidden={hidden}>
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
  )
}
