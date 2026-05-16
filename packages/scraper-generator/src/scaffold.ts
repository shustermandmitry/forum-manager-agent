/**
 * @module scraper-generator/scaffold
 *
 * @abstract Writes the templated files for a new forum plugin package.
 *
 * @moduleType utility
 */

import type { GeneratedPlugin } from './generator.abstract.ts'

/**
 * @abstract Scaffold a forum-plugin package onto disk.
 *
 * @behaviour
 * - Writes package.json, module.md, scraper config (declarative or code), tests, fixtures.
 * - Uses templates/ for boilerplate; substitutes per-plugin metadata.
 * - Returns the list of files written + any warnings.
 * - Idempotent if package already exists — refuses to overwrite without explicit force flag.
 */
export async function scaffold(_args: unknown): Promise<GeneratedPlugin> {
  throw new Error('Not implemented')
}
