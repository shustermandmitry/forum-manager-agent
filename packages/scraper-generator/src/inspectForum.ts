/**
 * @module scraper-generator/inspectForum
 *
 * Probes a forum URL to produce a report that's fed to Claude for scraper
 * generation. Looks for JSON endpoints, RSS feeds, pagination patterns,
 * auth signals, and captures sample pages as fixtures.
 *
 * Pure-ish: makes HTTP calls (so not pure-pure), but no global state and no
 * samovar runtime. Sample pages are returned in-memory; scaffold writes them.
 */

import * as cheerio from 'cheerio'
import type { InspectionReport, SamplePage } from './types.ts'

const DEFAULT_USER_AGENT =
  'forum-manager-agent/scraper-generator (https://github.com/shustermandmitry/forum-manager-agent)'

const COMMON_JSON_PROBES = ['.json', '/api/', '/api/v1/', '/api.json']
const SAMPLE_THREAD_LINK_LIMIT = 4

interface FetchOpts {
  userAgent?: string
  timeoutMs?: number
}

/**
 * Probe a forum and build an InspectionReport.
 *
 * @param forumUrl - base URL of the forum (e.g., 'https://endless-sphere.com')
 * @param opts - optional fetch settings
 * @returns inspection report (in-memory; caller / scaffold writes any disk artifacts)
 *
 * @behaviour
 * - Fetches the front page (follows redirects).
 * - Parses HTML for: RSS/Atom <link rel="alternate">, generator meta, sample thread links.
 * - Probes COMMON_JSON_PROBES suffixes; records any that return JSON.
 * - Fetches robots.txt; checks if `User-agent: *` allows scraping and extracts Crawl-delay.
 * - Fetches up to SAMPLE_THREAD_LINK_LIMIT sample thread pages, each captured as SamplePage.
 * - Pagination detection from URL patterns in front-page links (?page= or ?after= or ?p=).
 * - Detects auth signals: presence of login form, OAuth endpoints, or strict robots.
 * - Returns InspectionReport; never writes to disk.
 */
export async function inspectForum(
  forumUrl: string,
  opts: FetchOpts = {},
): Promise<InspectionReport> {
  const normalizedUrl = forumUrl.replace(/\/$/, '')
  const userAgent = opts.userAgent ?? DEFAULT_USER_AGENT
  const timeoutMs = opts.timeoutMs ?? 15_000

  const samplePages: SamplePage[] = []
  const jsonEndpoints: string[] = []
  const feeds: string[] = []

  // ─── Fetch front page ─────────────────────────────────────────────────────
  const front = await fetchPage(normalizedUrl, { userAgent, timeoutMs })
  samplePages.push({
    url: normalizedUrl,
    capturedAt: Date.now(),
    contentType: front.contentType,
    fixturePath: 'front.html',
    content: front.body,
  })

  const $ = cheerio.load(front.body)

  // ─── Feed discovery (RSS / Atom) ──────────────────────────────────────────
  $('link[rel="alternate"]').each((_i, el) => {
    const type = $(el).attr('type') ?? ''
    const href = $(el).attr('href')
    if (!href) return
    if (/rss|atom|xml/i.test(type)) {
      feeds.push(resolveUrl(href, normalizedUrl))
    }
  })

  // ─── JSON endpoint probes ─────────────────────────────────────────────────
  for (const suffix of COMMON_JSON_PROBES) {
    const probeUrl = `${normalizedUrl}${suffix}`
    try {
      const res = await fetchHead(probeUrl, { userAgent, timeoutMs })
      const ct = (res.contentType ?? '').toLowerCase()
      if (res.ok && (ct.includes('json') || ct.includes('javascript'))) {
        jsonEndpoints.push(probeUrl)
      }
    } catch {
      // Probe failures are expected; not all suffixes are valid endpoints.
    }
  }

  // ─── Sample thread pages ──────────────────────────────────────────────────
  const threadLinks = pickThreadLinks($, normalizedUrl, SAMPLE_THREAD_LINK_LIMIT)
  for (let i = 0; i < threadLinks.length; i++) {
    try {
      const page = await fetchPage(threadLinks[i]!, { userAgent, timeoutMs })
      samplePages.push({
        url: threadLinks[i]!,
        capturedAt: Date.now(),
        contentType: page.contentType,
        fixturePath: `thread-${i + 1}.html`,
        content: page.body,
      })
    } catch {
      // One bad sample doesn't kill the whole inspection.
    }
  }

  // ─── Pagination detection ─────────────────────────────────────────────────
  const pagination = detectPagination($)

  // ─── robots.txt ───────────────────────────────────────────────────────────
  const robotsTxt = await fetchRobotsTxt(normalizedUrl, { userAgent, timeoutMs })

  // ─── Auth signals ─────────────────────────────────────────────────────────
  const hasLoginForm =
    $('form').toArray().some((el) => /login|signin|sign-in/i.test($(el).attr('action') ?? ''))
  const hasOAuthMeta = $('link[href*="oauth"]').length > 0
  const authNeeded = hasLoginForm || hasOAuthMeta || jsonEndpoints.length === 0

  // ─── Infer kind ───────────────────────────────────────────────────────────
  let inferredKind: InspectionReport['inferredKind'] = 'unknown'
  if (jsonEndpoints.length > 0) inferredKind = 'json-api'
  else if (samplePages.some((p) => /html/i.test(p.contentType))) inferredKind = 'html'
  else if (feeds.length > 0) inferredKind = 'rss'

  return {
    forumUrl: normalizedUrl,
    inferredKind,
    jsonEndpoints,
    feeds,
    samplePages,
    pagination,
    authNeeded,
    authNotes: authNeeded
      ? `login form: ${hasLoginForm}, oauth meta: ${hasOAuthMeta}, json endpoints reachable: ${jsonEndpoints.length}`
      : undefined,
    robotsTxt,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

interface PageResult {
  ok: boolean
  contentType: string
  body: string
  status: number
}

async function fetchPage(url: string, opts: { userAgent: string; timeoutMs: number }): Promise<PageResult> {
  const res = await fetch(url, {
    headers: { 'user-agent': opts.userAgent, accept: 'text/html,application/xhtml+xml' },
    signal: AbortSignal.timeout(opts.timeoutMs),
    redirect: 'follow',
  })
  const contentType = res.headers.get('content-type') ?? ''
  const body = res.ok ? await res.text() : ''
  return { ok: res.ok, contentType, body, status: res.status }
}

async function fetchHead(
  url: string,
  opts: { userAgent: string; timeoutMs: number },
): Promise<{ ok: boolean; contentType?: string; status: number }> {
  // Some servers reject HEAD; fall back to a tiny GET with Range header.
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'user-agent': opts.userAgent },
      signal: AbortSignal.timeout(opts.timeoutMs),
    })
    return { ok: res.ok, contentType: res.headers.get('content-type') ?? undefined, status: res.status }
  } catch {
    const res = await fetch(url, {
      headers: { 'user-agent': opts.userAgent, range: 'bytes=0-1023' },
      signal: AbortSignal.timeout(opts.timeoutMs),
    })
    return { ok: res.ok, contentType: res.headers.get('content-type') ?? undefined, status: res.status }
  }
}

async function fetchRobotsTxt(
  baseUrl: string,
  opts: { userAgent: string; timeoutMs: number },
): Promise<InspectionReport['robotsTxt']> {
  try {
    const robotsUrl = `${baseUrl}/robots.txt`
    const res = await fetch(robotsUrl, {
      headers: { 'user-agent': opts.userAgent },
      signal: AbortSignal.timeout(opts.timeoutMs),
    })
    if (!res.ok) return { allowed: true }
    const text = await res.text()
    return parseRobotsTxt(text)
  } catch {
    return { allowed: true }
  }
}

/**
 * Minimal robots.txt parser. Looks for `User-agent: *` block, extracts
 * Disallow + Crawl-delay. Sufficient for our needs — we just want to know
 * "are we welcome" and "how often."
 */
function parseRobotsTxt(text: string): { allowed: boolean; rateLimitHint?: string } {
  const lines = text.split(/\r?\n/).map((l) => l.trim())
  let inWildcardBlock = false
  let allowed = true
  let crawlDelay: string | undefined

  for (const line of lines) {
    if (!line || line.startsWith('#')) continue
    const [keyRaw, ...rest] = line.split(':')
    const key = (keyRaw ?? '').trim().toLowerCase()
    const value = rest.join(':').trim()
    if (key === 'user-agent') {
      inWildcardBlock = value === '*'
    } else if (inWildcardBlock) {
      if (key === 'disallow' && value === '/') {
        allowed = false
      } else if (key === 'crawl-delay') {
        crawlDelay = `${value}s`
      }
    }
  }
  return { allowed, rateLimitHint: crawlDelay }
}

/**
 * Heuristic thread-link picker: take anchor hrefs that look like thread
 * permalinks (have an id-like segment) and dedupe by base path.
 */
function pickThreadLinks($: cheerio.CheerioAPI, baseUrl: string, limit: number): string[] {
  const candidates = new Set<string>()
  $('a[href]').each((_i, el) => {
    const href = $(el).attr('href')
    if (!href) return
    // Skip nav-like links (anchors, mailto, etc.)
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) return
    // Prefer URLs with what looks like a thread id (numeric or slug+id pattern)
    if (/\/(?:thread|topic|t|post|p|comments|discussion)\/[^/?#]+/i.test(href) || /\?(?:t|id|p)=\d+/i.test(href)) {
      candidates.add(resolveUrl(href, baseUrl))
      if (candidates.size >= limit) return false
    }
  })
  return Array.from(candidates).slice(0, limit)
}

function detectPagination($: cheerio.CheerioAPI): InspectionReport['pagination'] {
  for (const el of $('a[href]').toArray()) {
    const href = $(el).attr('href') ?? ''
    const match =
      href.match(/[?&](page|p)=(\d+)/) ??
      href.match(/[?&](after|cursor)=([^&]+)/) ??
      null
    if (match) {
      const param = match[1]!
      const kind = /^(after|cursor)$/i.test(param) ? 'cursor' : 'page'
      return { kind, param }
    }
  }
  // Scroll-loaded forums show no pagination params in static HTML.
  return undefined
}

/** Resolve a possibly-relative URL against a base. */
function resolveUrl(href: string, base: string): string {
  try {
    return new URL(href, base).toString()
  } catch {
    return href
  }
}
