import { useMemo } from 'react'
import { renderMarkdown } from './markdown'

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

export function Overview({ meta }: { meta: Meta }) {
  const bodyHtml = useMemo(() => renderMarkdown(meta.body ?? ''), [meta.body])

  return (
    <div className="overview" id="overview">
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
