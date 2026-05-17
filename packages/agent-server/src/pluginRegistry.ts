/**
 * @module agent-server/pluginRegistry
 *
 * Plugin registry. Tracks plugin metadata for discovery + dashboard form
 * generation. Plugins are factories that return ProcessDefs; they register
 * themselves with metadata (domain, propsSchema, packageName).
 *
 * Two ways plugins land in the registry:
 *  1. Static install — listed in app.config.ts; agent-server imports the
 *     package at boot and reads its main module's exports.
 *  2. Discovery scan (Phase 2+) — agent-server scans node_modules for
 *     packages with a `forumManagerAgentPlugin` field in package.json.
 *
 * The dashboard queries this registry to populate add-X dropdowns and
 * to auto-generate per-instance config forms.
 */

import type { PluginRegistry, PluginMetadata, PluginDomain } from './types.ts'

const NOT_IMPL = 'Not implemented'

/**
 * Create a new plugin registry instance. Returned registry is empty;
 * callers (typically bootAgentServer) populate it via register().
 *
 * @behaviour
 * - register(metadata) — adds a plugin; idempotent on packageName.
 * - list(domain?) — returns all registered plugins, optionally filtered.
 * - get(packageName) — returns one plugin by package name.
 * - Phase 2+: discoverFromNodeModules() will scan and bulk-register.
 */
export function createPluginRegistry(): PluginRegistry {
  return {
    register: (_metadata: PluginMetadata) => {
      throw new Error(NOT_IMPL)
    },
    list: (_domain?: PluginDomain): PluginMetadata[] => {
      throw new Error(NOT_IMPL)
    },
    get: (_packageName: string): PluginMetadata | undefined => {
      throw new Error(NOT_IMPL)
    },
  }
}

/**
 * Convenience: load a plugin package by name + register its exports.
 * Expects the package to export: `factory`, `propsSchema`, `domain`,
 * `packageName` (the four fields of PluginMetadata).
 *
 * @param registry - the registry to register into
 * @param packageName - npm package name (e.g., '@forum-manager-agent/forum-plugins-reddit')
 * @returns the registered PluginMetadata
 *
 * @behaviour
 * - Dynamic-imports the package.
 * - Asserts required exports exist; throws on missing.
 * - Calls registry.register() with the metadata.
 */
export async function loadAndRegisterPlugin(
  _registry: PluginRegistry,
  _packageName: string,
): Promise<PluginMetadata> {
  throw new Error(NOT_IMPL)
}
