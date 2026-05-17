/**
 * @module scraper-generator/scaffold
 *
 * Writes the templated files for a new forum plugin package on disk.
 * Pure file-IO; no network, no samovar, no LLM.
 *
 * Called by generateForumPlugin after Claude has filled in the scraper
 * config (declarative) or scraper code (code-mode). Scaffold materializes
 * the plugin package: package.json, module.md, the scraper file, captured
 * fixtures from InspectionReport, and a placeholder test.
 */

import { mkdir, writeFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { GeneratedPlugin, SamplePage } from './types.ts'

/**
 * Inputs that scaffold needs from generateForumPlugin: where to write,
 * what the package is named, declarative-vs-code mode, the actual scraper
 * file content (from Claude), and the captured sample pages to drop into
 * test/fixtures/.
 */
export interface ScaffoldInput {
  /** Absolute or repo-relative directory to write the package to. */
  outDir: string
  /** npm package name to use in package.json. */
  packageName: string
  /** Short forum id (e.g., 'endless-sphere'). Used in module.md, fixtures. */
  forumId: string
  /** Human-readable description for package.json + module.md. */
  description: string
  /** 'declarative' → write scraper.config.ts; 'code' → write src/scraper.ts. */
  mode: 'declarative' | 'code'
  /** The scraper file content Claude produced. */
  scraperFileContent: string
  /** Captured pages from inspectForum to drop in test/fixtures/. */
  fixtures: SamplePage[]
  /** Refuse to overwrite existing files unless true. */
  force?: boolean
}

/**
 * Scaffold a forum-plugin package onto disk.
 *
 * @param input - all inputs as above
 * @returns description of what was written + any warnings
 *
 * @behaviour
 * - Refuses to overwrite an existing outDir unless input.force === true
 *   (returns an error-shaped result; never silently clobbers).
 * - Creates outDir if it doesn't exist; same for nested test/fixtures/ and src/.
 * - Writes package.json from a templated string substituted with packageName +
 *   description + forumId.
 * - Writes module.md from a templated string.
 * - For 'declarative' mode: writes scraper.config.ts at outDir root.
 * - For 'code' mode: writes src/scraper.ts.
 * - Writes test/fixtures/*.html (or whatever extension matches the sample's
 *   contentType) from each SamplePage.content.
 * - Writes a placeholder test/scraper.test.ts.
 * - Returns GeneratedPlugin with filesWritten list + any warnings collected
 *   (e.g., "skipped overwrite of file X").
 */
export async function scaffold(input: ScaffoldInput): Promise<GeneratedPlugin> {
  const filesWritten: string[] = []
  const warnings: string[] = []

  // ─── Safety: don't clobber unless forced ────────────────────────────────
  if (!input.force && (await pathExists(input.outDir))) {
    return {
      packageName: input.packageName,
      outPath: input.outDir,
      mode: input.mode,
      filesWritten: [],
      warnings: [
        `Refused to write to existing path "${input.outDir}". Pass force=true to overwrite, or use a different outDir.`,
      ],
    }
  }

  await mkdir(input.outDir, { recursive: true })
  await mkdir(join(input.outDir, 'src'), { recursive: true })
  await mkdir(join(input.outDir, 'test', 'fixtures'), { recursive: true })

  // ─── package.json ──────────────────────────────────────────────────────
  const pkgJsonPath = join(input.outDir, 'package.json')
  await writeFileSafe(
    pkgJsonPath,
    renderPackageJson(input),
    filesWritten,
    warnings,
    input.force,
  )

  // ─── module.md ─────────────────────────────────────────────────────────
  const moduleMdPath = join(input.outDir, 'module.md')
  await writeFileSafe(
    moduleMdPath,
    renderModuleMd(input),
    filesWritten,
    warnings,
    input.force,
  )

  // ─── scraper file (config or code) ─────────────────────────────────────
  const scraperPath =
    input.mode === 'declarative'
      ? join(input.outDir, 'scraper.config.ts')
      : join(input.outDir, 'src', 'scraper.ts')
  await writeFileSafe(scraperPath, input.scraperFileContent, filesWritten, warnings, input.force)

  // ─── fixtures ──────────────────────────────────────────────────────────
  for (const sample of input.fixtures) {
    const path = join(input.outDir, 'test', 'fixtures', sample.fixturePath)
    await mkdir(dirname(path), { recursive: true })
    await writeFileSafe(path, sample.content, filesWritten, warnings, input.force)
  }

  // ─── placeholder test ──────────────────────────────────────────────────
  const testPath = join(input.outDir, 'test', 'scraper.test.ts')
  await writeFileSafe(
    testPath,
    renderPlaceholderTest(input),
    filesWritten,
    warnings,
    input.force,
  )

  return {
    packageName: input.packageName,
    outPath: input.outDir,
    mode: input.mode,
    filesWritten,
    warnings,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

async function writeFileSafe(
  path: string,
  content: string,
  filesWritten: string[],
  warnings: string[],
  force: boolean | undefined,
): Promise<void> {
  if (!force && (await pathExists(path))) {
    warnings.push(`Skipped overwrite of existing file: ${path}`)
    return
  }
  await writeFile(path, content, 'utf8')
  filesWritten.push(path)
}

// ─── Renderers (string templates — no template engine, just literals) ────

function renderPackageJson(input: ScaffoldInput): string {
  const pkg = {
    name: input.packageName,
    version: '0.1.0',
    private: true,
    type: 'module',
    description: input.description,
    main: 'dist/index.js',
    types: 'dist/index.d.ts',
    scripts: {
      build: "echo 'Not implemented'",
      test: "echo 'pending samovar-test wiring'",
      'type-check': 'tsc --noEmit',
    },
    dependencies: {
      '@shustermandmitry/samovar': 'workspace:*',
      zod: '^3.23.0',
    },
  }
  return JSON.stringify(pkg, null, 2) + '\n'
}

function renderModuleMd(input: ScaffoldInput): string {
  return `# forum-plugins/${input.forumId}

${input.description}

Generated by \`@forum-manager-agent/scraper-generator\`. Review the diff,
edit if needed, commit. The plugin auto-registers with agent-server on
next start.

## Plugin contract

This package exports the four-field plugin metadata:

\`\`\`typescript
export const domain = 'ForumPlugin'
export const packageName = '${input.packageName}'
export const propsSchema    // zod schema
export const factory        // (props) => ProcessDef
\`\`\`

## Structure

\`\`\`
${input.forumId}/
├─ module.md
├─ package.json
├─ ${input.mode === 'declarative' ? 'scraper.config.ts' : 'src/scraper.ts'}
└─ test/
   ├─ fixtures/         ← sample pages captured at generation time
   └─ scraper.test.ts   ← extraction shape tests (placeholder)
\`\`\`

## Regenerating

To refresh against forum redesigns:

\`\`\`bash
pnpm forum-plugins-gen ${input.forumId} --regenerate
\`\`\`

Review the diff carefully; you may want to preserve manual customizations.
`
}

function renderPlaceholderTest(input: ScaffoldInput): string {
  return `/**
 * @module forum-plugins/${input.forumId}/test/scraper
 *
 * Placeholder test. Generated by scraper-generator's scaffold. Fill in
 * once samovar-test wiring is available and you've inspected the
 * captured fixtures to know what to assert.
 *
 * Suggested first assertion: load a fixture, run extraction, verify the
 * required fields (id, title, body, author, timestamp) come out.
 */

// import fixtures from './fixtures/...'
// import { ... } from '../scraper.config.ts'

// describe('${input.forumId} scraper', () => {
//   it('extracts the required thread fields from a captured fixture', () => {
//     throw new Error('TODO')
//   })
// })
`
}
