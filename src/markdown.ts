import { marked } from 'marked'
import DOMPurify from 'dompurify'

const PROXY_HOSTS = new Set([
  'user-images.githubusercontent.com',
  'private-user-images.githubusercontent.com',
  'github.com',
  'objects.githubusercontent.com',
  'media.githubusercontent.com',
  'raw.githubusercontent.com',
])

function proxyImageSrcs(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  for (const img of doc.querySelectorAll('img')) {
    const src = img.getAttribute('src')
    if (!src) continue
    let url: URL
    try {
      url = new URL(src, window.location.href)
    } catch {
      continue
    }
    if (url.protocol === 'https:' && PROXY_HOSTS.has(url.hostname)) {
      img.setAttribute('src', `/api/img?url=${encodeURIComponent(url.toString())}`)
    }
  }
  return doc.body.innerHTML
}

export function renderMarkdown(body: string) {
  if (!body.trim()) return ''
  const html = marked.parse(body, { async: false }) as string
  return DOMPurify.sanitize(proxyImageSrcs(html))
}
