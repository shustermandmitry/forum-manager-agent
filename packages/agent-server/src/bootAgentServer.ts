/**
 * @module agent-server/bootAgentServer
 *
 * @abstract Boot a treenity instance, mount the forumAgent ProcessDef, open
 * the websocket endpoint for clients. Returns a handle for graceful shutdown.
 *
 * @moduleType utility
 */

import type { BootOptions, AgentServer } from './types.ts'

/**
 * @abstract Boot the full agent server stack.
 *
 * @param opts - boot options including configPath, port, and mount path
 * @returns running agent-server handle
 *
 * @behaviour
 * - Loads workspace + per-peer config from configPath.
 * - Resolves *_ref secrets from env (v1) or keychain (v2).
 * - Opens sqlite-backed treenity instance.
 * - Mounts forumAgent at opts.mountPath (default '/forum-agent').
 * - Initializes llm-bridge subprocesses.
 * - Initializes telegram-bot binding (in-process).
 * - Registers forum-plugin scrapers per config.
 * - Opens websocket on opts.port (default 7710).
 * - Schedules cron triggers.
 * - Returns handle whose stop() shuts everything down gracefully.
 *
 * @see ../module.md for the boot sequence
 */
export async function bootAgentServer(_opts: BootOptions): Promise<AgentServer> {
  throw new Error('Not implemented')
}
