/**
 * @module dashboard/app
 *
 * @abstract Root Solid component. Wires the tree client + routing + view shell.
 *
 * @moduleType utility
 */

/**
 * @abstract The root dashboard component.
 *
 * @behaviour
 * - Reads server URL from query string or localStorage.
 * - Creates tree client; passes via context.
 * - Renders side nav with view links + active view.
 */
export function App() {
  throw new Error('Not implemented')
}
