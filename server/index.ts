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

const port = Number(process.env.PORT ?? 6176)
serve({ fetch: app.fetch, port })
console.log(`api listening on http://localhost:${port}`)
