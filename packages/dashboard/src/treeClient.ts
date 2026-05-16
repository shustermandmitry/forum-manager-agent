/**
 * @module dashboard/treeClient
 *
 * @abstract Websocket client to agent-server. Wraps tRPC over WS. Reconnects on drop.
 *
 * @moduleType utility
 */

import type { DashboardOpts, DashboardClient } from './dashboard.abstract.ts'

/**
 * @abstract Create a connected tree client.
 *
 * @behaviour
 * - Connects to opts.serverUrl over websocket.
 * - Auto-reconnects on drop with exponential backoff.
 * - Exposes subscribe / query / mutate methods (tRPC under the hood).
 * - Throws on initial connect failure; reconnects silently after.
 */
export async function createTreeClient(_opts: DashboardOpts): Promise<DashboardClient> {
  throw new Error('Not implemented')
}
