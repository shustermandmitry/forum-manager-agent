/**
 * @module dashboard/schemaRegistry
 *
 * The typed-tree-view's schema registry. Built at boot from every mounted
 * ProcessDef's local schema + the agent-server's plugin registry's known
 * slot shapes. The composite of all entries is the tree's effective shape.
 *
 * Used by:
 *  - Form renderer (looks up the schema for a node being edited)
 *  - Tree navigator (looks up valid children for add-X menus)
 *  - Mutation validator (validates before sending to agent-server)
 */

import type { z } from 'zod'
import type { NodeSchemaEntry, TreeSchemaRegistry } from './types.ts'

/**
 * Compile a pathPattern into a regex that matches concrete tree paths.
 *
 * Supports:
 *  - Literal segments: `/forum-agent/forums`
 *  - Single-segment wildcard: `*` matches one path segment
 *  - Multi-segment wildcard: `**` matches any depth
 *
 * `/forum-agent/forums/*` matches `/forum-agent/forums/reddit` but NOT
 * `/forum-agent/forums/reddit/queue/xyz`. Use `**` for deeper match.
 */
function compilePathPattern(pattern: string): RegExp {
  const escaped = pattern
    .split('/')
    .map((seg) => {
      if (seg === '**') return '.*'
      if (seg === '*') return '[^/]+'
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('/')
  return new RegExp(`^${escaped}$`)
}

/**
 * Score a pathPattern's specificity. Higher = more specific. Used to pick
 * the most-specific match when multiple entries could apply.
 *
 * Literal segments score 2, single-wildcards 1, multi-wildcards 0.
 */
function specificity(pattern: string): number {
  return pattern
    .split('/')
    .reduce((acc, seg) => {
      if (seg === '**') return acc
      if (seg === '*') return acc + 1
      return acc + 2
    }, 0)
}

/**
 * Create an empty schema registry. Populate via register().
 *
 * @returns a TreeSchemaRegistry
 *
 * @behaviour
 * - register(entry) — adds an entry; later registrations with the same
 *   exact pathPattern overwrite.
 * - schemaFor(path) — returns the most-specific entry whose pathPattern
 *   matches path, or undefined if no match.
 * - validChildrenFor(path) — returns the matching entry's allowedChildren
 *   (or []).
 * - validateMutation(path, value) — looks up the schema and zod-parses
 *   value against it. Returns {valid:true} or {valid:false, error:msg}.
 *   If no schema at path, returns {valid:false, error:'no schema'}.
 * - list() — all entries in registration order.
 */
export function createTreeSchemaRegistry(): TreeSchemaRegistry {
  const entries = new Map<string, { entry: NodeSchemaEntry; regex: RegExp; score: number }>()

  return {
    register: (entry: NodeSchemaEntry): void => {
      entries.set(entry.pathPattern, {
        entry,
        regex: compilePathPattern(entry.pathPattern),
        score: specificity(entry.pathPattern),
      })
    },

    schemaFor: (path: string): NodeSchemaEntry | undefined => {
      let best: { entry: NodeSchemaEntry; score: number } | undefined
      for (const { entry, regex, score } of entries.values()) {
        if (regex.test(path) && (best === undefined || score > best.score)) {
          best = { entry, score }
        }
      }
      return best?.entry
    },

    validChildrenFor: (path: string): unknown[] => {
      let best: { children: unknown[]; score: number } | undefined
      for (const { entry, regex, score } of entries.values()) {
        if (regex.test(path) && (best === undefined || score > best.score)) {
          best = { children: entry.allowedChildren ?? [], score }
        }
      }
      return best?.children ?? []
    },

    validateMutation: (path: string, value: unknown): { valid: boolean; error?: string } => {
      let best: { schema: unknown; score: number } | undefined
      for (const { entry, regex, score } of entries.values()) {
        if (regex.test(path) && (best === undefined || score > best.score)) {
          best = { schema: entry.schema, score }
        }
      }
      if (best === undefined) {
        return { valid: false, error: `No schema registered for path "${path}"` }
      }
      // entry.schema is typed `unknown` to keep zod out of consumers, but at
      // runtime it must be a Zod schema. Duck-typed parse call.
      const schema = best.schema as z.ZodTypeAny
      if (typeof schema?.safeParse !== 'function') {
        return { valid: false, error: 'Registered schema is not a Zod schema' }
      }
      const result = schema.safeParse(value)
      if (result.success) return { valid: true }
      return { valid: false, error: result.error.message }
    },

    list: (): NodeSchemaEntry[] => Array.from(entries.values()).map((v) => v.entry),
  }
}

/**
 * Convenience: register a batch of entries at once. Used at boot to seed
 * the registry from a known list (e.g., from each mounted ProcessDef).
 */
export function registerBatch(registry: TreeSchemaRegistry, entries: NodeSchemaEntry[]): void {
  for (const e of entries) registry.register(e)
}
