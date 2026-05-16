#!/usr/bin/env node
/**
 * @module scraper-generator/cli
 *
 * @abstract CLI entry: `forum-plugins-gen <forum> [--out=...] [--code-mode]`
 *
 * @moduleType utility
 */

/**
 * @abstract Parse argv and invoke generateForumPlugin.
 *
 * @behaviour
 * - Positional arg: forum URL or short-name (required).
 * - --out: destination path (defaults to packages/forum-plugins/<name>).
 * - --code-mode: skip declarative attempt; ask Claude for code directly.
 * - --skip-test: don't run the smoke test.
 * - Pretty-prints the GeneratedPlugin result + warnings.
 * - Exits non-zero on validation failure or smoke-test failure.
 */
export async function runCli(): Promise<void> {
  throw new Error('Not implemented')
}

// CLI bootstrap when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
