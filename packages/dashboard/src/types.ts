/**
 * @module dashboard/types
 *
 * Public types for the dashboard package.
 */

export interface DashboardOpts {
  serverUrl: string
  token?: string
}

export interface DashboardClient {
  readonly connected: boolean
  disconnect(): Promise<void>
}

export type ViewName = 'inbox' | 'queue' | 'tasks' | 'people' | 'permissions' | 'settings' | 'activity'

// ─── Typed tree view types ─────────────────────────────────────────────────

/**
 * The field kinds the dashboard's form renderer supports in v1.
 */
export type FieldKind = 'string' | 'number' | 'boolean' | 'enum' | 'list-of-strings' | 'ref-to-secret'

/**
 * Per-node-shape entry in the TreeSchemaRegistry. Describes what's valid at
 * a given tree path pattern.
 */
export interface NodeSchemaEntry {
  /** Glob-like pattern matching tree paths (e.g., '/forum-agent/forums/*'). */
  pathPattern: string
  /**
   * Zod schema for nodes at this path. Concrete type at runtime; widened to
   * unknown here to avoid leaking the zod type into consumers who only
   * touch the registry indirectly.
   */
  schema: unknown
  /**
   * Schemas valid as children of nodes matching this pathPattern. Populated
   * by add-X dropdowns in the dashboard.
   */
  allowedChildren?: unknown[]
  /** Which actions are exposed to the dashboard for nodes at this path. */
  allowedActions: ('read' | 'edit' | 'add-child' | 'move' | 'remove')[]
  /** Optional metadata: e.g., the plugin domain this slot accepts. */
  domain?: string
}

/**
 * The registry — built at boot from each mounted ProcessDef's schema +
 * the plugin registry's known slot shapes.
 */
export interface TreeSchemaRegistry {
  register(entry: NodeSchemaEntry): void
  schemaFor(path: string): NodeSchemaEntry | undefined
  validChildrenFor(path: string): unknown[]
  validateMutation(path: string, value: unknown): { valid: boolean; error?: string }
  /** All registered entries — used by the dashboard for menu/dropdown generation. */
  list(): NodeSchemaEntry[]
}

/**
 * Result of a form submission.
 */
export type SubmitResult =
  | { ok: true; value: unknown }
  | { ok: false; errors: { field: string; message: string }[] }
