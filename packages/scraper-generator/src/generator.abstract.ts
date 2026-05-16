/**
 * @module scraper-generator/generator
 *
 * @abstract Types for the scraper generator. The generator is a one-shot
 * tool: takes a forum URL, emits a new forum-plugins/<name>/ package.
 *
 * @moduleType type
 *
 * @api
 */

/**
 * Result of inspecting a forum URL.
 */
export interface InspectionReport {
  forumUrl: string
  /** Best-guess kind of forum based on probes. */
  inferredKind: 'json-api' | 'html' | 'rss' | 'unknown'
  /** Found JSON endpoints (Reddit-style .json suffix, /api/, etc.) */
  jsonEndpoints: string[]
  /** RSS / Atom feeds. */
  feeds: string[]
  /** HTML sample pages captured for offline scraping development. */
  samplePages: SamplePage[]
  /** Pagination pattern detected (cursor / page-number / scroll). */
  pagination?: { kind: 'cursor' | 'page' | 'scroll'; param: string }
  /** Authentication signals (login form detected, OAuth metadata, etc.). */
  authNeeded: boolean
  authNotes?: string
  /** robots.txt rules relevant to scraping. */
  robotsTxt: { allowed: boolean; rateLimitHint?: string }
}

export interface SamplePage {
  url: string
  capturedAt: number
  contentType: string
  /** Path relative to the generated plugin's test/fixtures/ folder. */
  fixturePath: string
}

/**
 * Options for the generator.
 *
 * @api
 */
export interface GenerateOpts {
  /** Forum URL OR a known short-name (e.g. 'reddit', 'endless-sphere'). */
  forum: string
  /** Where to write the package. Default: `packages/forum-plugins/<name>` */
  out?: string
  /** Force code-mode even if declarative could work. */
  codeMode?: boolean
  /** Skip the smoke-test step. */
  skipTest?: boolean
}

/**
 * Result returned by generateForumPlugin — describes what was emitted.
 *
 * @api
 */
export interface GeneratedPlugin {
  packageName: string
  outPath: string
  mode: 'declarative' | 'code'
  smokeTestPassed?: boolean
  filesWritten: string[]
  warnings: string[]
}
