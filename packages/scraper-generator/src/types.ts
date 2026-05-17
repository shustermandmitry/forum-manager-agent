/**
 * @module scraper-generator/types
 *
 * Public types for the scraper-generator package.
 */

export interface InspectionReport {
  forumUrl: string
  inferredKind: 'json-api' | 'html' | 'rss' | 'unknown'
  jsonEndpoints: string[]
  feeds: string[]
  samplePages: SamplePage[]
  pagination?: { kind: 'cursor' | 'page' | 'scroll'; param: string }
  authNeeded: boolean
  authNotes?: string
  robotsTxt: { allowed: boolean; rateLimitHint?: string }
}

export interface SamplePage {
  /** Original URL fetched. */
  url: string
  /** When we fetched it (ms since epoch). */
  capturedAt: number
  /** MIME type from Content-Type header. */
  contentType: string
  /** Suggested filename for the generated plugin's test/fixtures/ folder. */
  fixturePath: string
  /** Raw response body. Scaffold writes this to disk. */
  content: string
}

export interface GenerateOpts {
  forum: string
  out?: string
  codeMode?: boolean
  skipTest?: boolean
}

export interface GeneratedPlugin {
  packageName: string
  outPath: string
  mode: 'declarative' | 'code'
  smokeTestPassed?: boolean
  filesWritten: string[]
  warnings: string[]
}
