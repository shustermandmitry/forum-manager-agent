#!/usr/bin/env node
/**
 * @module scraper-generator/cli
 *
 * CLI entry: `forum-plugins-gen <forum> [--out=...] [--code-mode] [--skip-test]`
 *
 * Thin wrapper over generateForumPlugin. Argv parsing + pretty-printing.
 */

import { generateForumPlugin } from './generateForumPlugin.ts'
import type { GenerateOpts } from './types.ts'

interface ParsedArgs {
  forum: string
  out?: string
  codeMode: boolean
  skipTest: boolean
  help: boolean
}

/**
 * Parse argv into ParsedArgs. Hand-rolled (no commander/yargs dep) —
 * the surface is tiny.
 */
function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    forum: '',
    codeMode: false,
    skipTest: false,
    help: false,
  }
  const positional: string[] = []

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!
    if (a === '--help' || a === '-h') {
      args.help = true
    } else if (a === '--code-mode') {
      args.codeMode = true
    } else if (a === '--skip-test') {
      args.skipTest = true
    } else if (a.startsWith('--out=')) {
      args.out = a.slice('--out='.length)
    } else if (a === '--out') {
      args.out = argv[++i]
    } else if (a.startsWith('--')) {
      throw new Error(`Unknown flag: ${a}`)
    } else {
      positional.push(a)
    }
  }

  if (positional.length === 0 && !args.help) {
    throw new Error('Missing required argument: <forum>')
  }
  if (positional.length > 1) {
    throw new Error(`Expected exactly one positional argument; got: ${positional.join(' ')}`)
  }

  args.forum = positional[0] ?? ''
  return args
}

function printHelp(): void {
  process.stdout.write(`forum-plugins-gen — generate a forum scraper plugin

Usage:
  forum-plugins-gen <forum> [options]

Arguments:
  <forum>           Forum URL (https://...) or known short name (reddit, endless-sphere, hackernews)

Options:
  --out <path>      Output directory (default: packages/forum-plugins/<forumId>)
  --code-mode       Force code-mode scraper (skip declarative attempt)
  --skip-test       Skip the smoke test
  --help, -h        Show this help

Examples:
  forum-plugins-gen reddit
  forum-plugins-gen https://endless-sphere.com --out=packages/forum-plugins/es
  forum-plugins-gen discord --code-mode
`)
}

function printResult(result: import('./types.ts').GeneratedPlugin): void {
  process.stdout.write(`\nGenerated: ${result.packageName}\n`)
  process.stdout.write(`  Mode:        ${result.mode}\n`)
  process.stdout.write(`  Out:         ${result.outPath}\n`)
  process.stdout.write(
    `  Smoke test:  ${result.smokeTestPassed === undefined ? 'skipped' : result.smokeTestPassed ? 'passed' : 'FAILED'}\n`,
  )
  process.stdout.write(`  Files written (${result.filesWritten.length}):\n`)
  for (const f of result.filesWritten) {
    process.stdout.write(`    - ${f}\n`)
  }
  if (result.warnings.length > 0) {
    process.stdout.write(`\n  Warnings:\n`)
    for (const w of result.warnings) {
      process.stdout.write(`    ! ${w}\n`)
    }
  }
  process.stdout.write(`\nReview the diff, edit if needed, commit.\n`)
}

/**
 * Parse argv and invoke generateForumPlugin.
 *
 * @behaviour
 * - Positional arg: forum URL or short-name (required unless --help).
 * - --out: destination path (defaults to packages/forum-plugins/<name>).
 * - --code-mode: skip declarative attempt; ask Claude for code directly.
 * - --skip-test: don't run the smoke test.
 * - Pretty-prints the GeneratedPlugin result + warnings.
 * - Exits 1 on parse failure, generation failure, or smoke-test failure.
 */
export async function runCli(argv: string[] = process.argv.slice(2)): Promise<void> {
  let parsed!: ParsedArgs
  try {
    parsed = parseArgs(argv)
  } catch (err) {
    process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n\n`)
    printHelp()
    process.exit(1)
  }

  if (parsed.help) {
    printHelp()
    return
  }

  const opts: GenerateOpts = {
    forum: parsed.forum,
    out: parsed.out,
    codeMode: parsed.codeMode,
    skipTest: parsed.skipTest,
  }

  process.stdout.write(`Generating plugin for ${parsed.forum}...\n`)

  const result = await generateForumPlugin(opts)
  printResult(result)

  if (result.smokeTestPassed === false) {
    process.exit(1)
  }
}

// CLI bootstrap when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((err) => {
    process.stderr.write(`\nFatal error: ${err instanceof Error ? err.message : String(err)}\n`)
    if (err instanceof Error && err.stack) {
      process.stderr.write(`${err.stack}\n`)
    }
    process.exit(1)
  })
}
