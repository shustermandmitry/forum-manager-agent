/**
 * @module scraper-generator/generateForumPlugin
 *
 * @abstract End-to-end: inspect → ask Claude → validate → scaffold → smoke-test.
 *
 * @moduleType utility
 */

import type { GenerateOpts, GeneratedPlugin } from './generator.abstract.ts'

/**
 * @abstract Generate a new forum scraper plugin package.
 *
 * @param opts - forum URL/name, output path, mode flags
 * @returns description of what was written
 *
 * @behaviour
 * - Calls inspectForum to build the report.
 * - Invokes Claude (via llm-bridge or direct subprocess) with the report
 *   + scraper-schema template, asks for either filled schema or code-mode scraper.ts.
 * - Validates Claude's output (zod for schema, syntax-check for code).
 * - Calls scaffold to write package.json, module.md, scraper.config.ts (or scraper.ts), tests, fixtures.
 * - Runs the generated plugin against captured fixtures (unless skipTest).
 * - Returns the GeneratedPlugin descriptor with warnings.
 * - User commits the result; no auto-commit.
 */
export async function generateForumPlugin(_opts: GenerateOpts): Promise<GeneratedPlugin> {
  throw new Error('Not implemented')
}
