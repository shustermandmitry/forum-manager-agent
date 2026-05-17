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
