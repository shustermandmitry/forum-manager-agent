/**
 * @module dashboard/treeNavigator
 *
 * The typed tree-view component. Renders the live tree with schema-aware
 * contextual menus: add-child shows only valid plugin/node types; edit opens
 * the right form via formRenderer; move enforces destination schema; remove
 * confirms + checks downstream dependencies.
 *
 * This is the dashboard's headline UI primitive — also reusable for the
 * Settings view (which is the typed tree view focused on /config/).
 */

import type { TreeSchemaRegistry } from './types.ts'

/**
 * The tree navigator component.
 *
 * @behaviour
 * - Subscribes to tree state via standard usePath hooks rooted at rootPath.
 * - For each visible node, exposes a right-click context menu:
 *     - Add child   (only if registry.validChildrenFor(path).length > 0)
 *     - Edit        (opens SchemaForm with schemaFor(path).schema)
 *     - Move        (drag-drop; destination schema must accept the moved subtree)
 *     - Remove      (confirmation modal)
 * - All mutations are validated against the registry before being sent.
 * - Tree expansion state lives in URL query string (so views are bookmarkable).
 */
export function TreeNavigator(_props: {
  registry: TreeSchemaRegistry
  rootPath: string
  /** Optional callback fired after any successful mutation. */
  onMutation?: (path: string, action: string) => void
}) {
  throw new Error('Not implemented')
}
