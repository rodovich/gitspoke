import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

async function gh(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('gh', args, {
    maxBuffer: 50 * 1024 * 1024,
  })
  return stdout
}

const SLUG = /^[A-Za-z0-9._-]+$/
function assertSafeSlug(...parts: string[]) {
  for (const p of parts) {
    if (!SLUG.test(p)) throw new Error(`invalid path segment: ${p}`)
  }
}

const app = new Hono()

app.get('/api/pr/:org/:repo/:num', async (c) => {
  const { org, repo, num } = c.req.param()
  try {
    assertSafeSlug(org, repo)
    if (!/^\d+$/.test(num)) throw new Error(`invalid PR number: ${num}`)
    const slug = `${org}/${repo}`
    const fields = [
      'number',
      'title',
      'body',
      'state',
      'url',
      'author',
      'headRefName',
      'baseRefName',
      'additions',
      'deletions',
      'changedFiles',
      'createdAt',
      'updatedAt',
    ].join(',')
    const [metaJson, diff] = await Promise.all([
      gh(['pr', 'view', num, '--repo', slug, '--json', fields]),
      gh(['pr', 'diff', num, '--repo', slug]),
    ])
    return c.json({ meta: JSON.parse(metaJson), diff })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return c.json({ error: message }, 500)
  }
})

const IMAGE_HOSTS = new Set([
  'user-images.githubusercontent.com',
  'private-user-images.githubusercontent.com',
  'github.com',
  'objects.githubusercontent.com',
  'media.githubusercontent.com',
  'raw.githubusercontent.com',
])

let cachedToken: string | null = null
async function ghToken(): Promise<string> {
  if (cachedToken) return cachedToken
  const { stdout } = await execFileAsync('gh', ['auth', 'token'])
  cachedToken = stdout.trim()
  return cachedToken
}

app.get('/api/img', async (c) => {
  const raw = c.req.query('url')
  if (!raw) return c.json({ error: 'missing url' }, 400)
  let target: URL
  try {
    target = new URL(raw)
  } catch {
    return c.json({ error: 'invalid url' }, 400)
  }
  if (target.protocol !== 'https:' || !IMAGE_HOSTS.has(target.hostname)) {
    return c.json({ error: 'host not allowed' }, 400)
  }
  try {
    const token = await ghToken()
    let current = target
    let upstream: Response | null = null
    for (let i = 0; i < 5; i++) {
      const sameOriginAsTarget = current.hostname === target.hostname
      const headers: Record<string, string> = { 'User-Agent': 'gitspoke' }
      if (sameOriginAsTarget) headers.Authorization = `Bearer ${token}`
      const res = await fetch(current, { headers, redirect: 'manual' })
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location')
        if (!loc) break
        current = new URL(loc, current)
        continue
      }
      upstream = res
      break
    }
    if (!upstream || !upstream.ok || !upstream.body) {
      return c.json({ error: `upstream ${upstream?.status ?? 'no response'}` }, 502)
    }
    const headers = new Headers()
    const ct = upstream.headers.get('content-type')
    if (ct) headers.set('content-type', ct)
    headers.set('cache-control', 'private, max-age=3600')
    return new Response(upstream.body, { status: 200, headers })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return c.json({ error: message }, 500)
  }
})

const port = Number(process.env.PORT ?? 6176)
serve({ fetch: app.fetch, port })
console.log(`api listening on http://localhost:${port}`)
