/**
 * @module dashboard/dashboard
 *
 * @abstract Public types for the dashboard package.
 *
 * @moduleType type
 *
 * @api
 */

/**
 * Connection options for the dashboard client.
 *
 * @api
 */
export interface DashboardOpts {
  /** Websocket URL of the local agent-server. */
  serverUrl: string
  /** Optional auth token if the server requires it. */
  token?: string
}

/**
 * Handle to the dashboard's tree client subscription.
 */
export interface DashboardClient {
  /** Currently connected? */
  readonly connected: boolean
  /** Cleanly disconnect. */
  disconnect(): Promise<void>
}

/**
 * Names of the top-level views, used for routing.
 */
export type ViewName = 'inbox' | 'queue' | 'tasks' | 'people' | 'permissions' | 'settings' | 'activity'
