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

import type { NodeSchemaEntry, TreeSchemaRegistry } from './types.ts'

const NOT_IMPL = 'Not implemented'

/**
 * Create an empty schema registry. Populate via register().
 *
 * @returns a TreeSchemaRegistry
 *
 * @behaviour
 * - register(entry) — adds; later registrations with the same pathPattern overwrite.
 * - schemaFor(path) — returns the most-specific matching entry; throws if none match (caller decides whether that's an error).
 * - validChildrenFor(path) — returns the allowedChildren of the matching entry.
 * - validateMutation(path, value) — zod-parses value against the matching entry's schema; returns structured result.
 * - list() — all entries; used for tree-wide views.
 */
export function createTreeSchemaRegistry(): TreeSchemaRegistry {
  return {
    register: (_entry: NodeSchemaEntry) => {
      throw new Error(NOT_IMPL)
    },
    schemaFor: (_path: string): NodeSchemaEntry | undefined => {
      throw new Error(NOT_IMPL)
    },
    validChildrenFor: (_path: string): unknown[] => {
      throw new Error(NOT_IMPL)
    },
    validateMutation: (_path: string, _value: unknown) => {
      throw new Error(NOT_IMPL)
    },
    list: (): NodeSchemaEntry[] => {
      throw new Error(NOT_IMPL)
    },
  }
}

/**
 * Convenience: register a batch of entries at once. Used at boot to seed
 * the registry from a known list (e.g., from each mounted ProcessDef).
 */
export function registerBatch(_registry: TreeSchemaRegistry, _entries: NodeSchemaEntry[]): void {
  throw new Error(NOT_IMPL)
}
