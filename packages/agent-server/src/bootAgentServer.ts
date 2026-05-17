/**
 * @module agent-server/bootAgentServer
 *
 * Boot the full agent server stack. Per-process architecture: loads
 * app.config.ts → seeds /config/ tree branch → mounts forumManager →
 * mounts forum processes (one per enabled forum in config) → mounts
 * llm-bridge process → starts telegram bot in-process → opens websocket.
 */

import type { BootOptions, AgentServer } from './types.ts'

/**
 * @abstract Boot the full agent server stack.
 *
 * @param opts - boot options including configPath, port, and mount path
 * @returns running agent-server handle
 *
 * @behaviour
 * Boot sequence:
 *  1. Load app.config.ts (and app.config.local.ts overlay if present).
 *  2. Validate against AppConfigSchema (from zod); throw on invalid.
 *  3. Resolve secret refs (env in v1; keychain in v2).
 *  4. Open sqlite-backed treenity instance.
 *  5. Seed /config/ tree branch from the resolved config.
 *  6. Mount forumManager at opts.mountPath (default '/forum-agent').
 *  7. Create plugin registry.
 *  8. For each enabled forum in config.forums:
 *     - loadAndRegisterPlugin(registry, forum.pluginName)
 *     - validate forum.props against the plugin's propsSchema
 *     - call plugin.factory(forum.props) to get the ProcessDef
 *     - mount it under /forum-agent/forums/<forumId>/
 *  9. Mount the llmBridge process under /forum-agent/llm-bridge/.
 *  10. Initialize telegram-bot binding (in-process).
 *  11. Open websocket endpoint on opts.port (default 7710).
 *  12. Schedule cron triggers (forum polls happen inside each forum's worker).
 *  13. Return handle whose stop() shuts everything down gracefully.
 *
 * @see ../module.md for the boot sequence
 * @see docs/design.md §3 for the per-process architecture
 */
export async function bootAgentServer(_opts: BootOptions): Promise<AgentServer> {
  throw new Error('Not implemented')
}
