/**
 * @module agent-server/pluginRegistry
 *
 * Plugin registry. Tracks plugin metadata for discovery + dashboard form
 * generation. Plugins are factories that return ProcessDefs; they register
 * themselves with metadata (domain, propsSchema, packageName).
 *
 * Two ways plugins land in the registry:
 *  1. Static install — listed in app.config.ts; agent-server imports the
 *     package at boot via loadAndRegisterPlugin().
 *  2. Discovery scan (Phase 2+) — agent-server scans node_modules for
 *     packages with a `forumManagerAgentPlugin` field in package.json.
 *
 * The dashboard queries this registry to populate add-X dropdowns and
 * to auto-generate per-instance config forms.
 */

import type { PluginRegistry, PluginMetadata, PluginDomain } from './types.ts'

/** Validate required fields on plugin metadata. */
function assertValidMetadata(m: Partial<PluginMetadata>): asserts m is PluginMetadata {
  const missing: string[] = []
  if (!m.packageName) missing.push('packageName')
  if (!m.domain) missing.push('domain')
  if (!m.propsSchema) missing.push('propsSchema')
  if (typeof m.factory !== 'function') missing.push('factory')
  if (missing.length > 0) {
    throw new Error(
      `Invalid plugin metadata for "${m.packageName ?? '<unknown>'}": missing required field(s): ${missing.join(', ')}`,
    )
  }
}

/**
 * Create a new plugin registry instance. Empty at creation; callers
 * (typically bootAgentServer) populate it via register() or loadAndRegisterPlugin().
 *
 * @returns a PluginRegistry
 *
 * @behaviour
 * - register(metadata) — adds; later registrations with same packageName overwrite.
 * - list(domain?) — returns all registered plugins, optionally filtered.
 * - get(packageName) — returns one plugin, or undefined.
 */
export function createPluginRegistry(): PluginRegistry {
  const byPackage = new Map<string, PluginMetadata>()

  return {
    register: (metadata: PluginMetadata): void => {
      assertValidMetadata(metadata)
      byPackage.set(metadata.packageName, metadata)
    },

    list: (domain?: PluginDomain): PluginMetadata[] => {
      const all = Array.from(byPackage.values())
      return domain === undefined ? all : all.filter((p) => p.domain === domain)
    },

    get: (packageName: string): PluginMetadata | undefined => {
      return byPackage.get(packageName)
    },
  }
}

/**
 * Load a plugin package by name + register its exports.
 * Expects the package to export: `factory`, `propsSchema`, `domain`,
 * `packageName` (the four fields of PluginMetadata).
 *
 * @param registry - registry to register into
 * @param packageName - npm package name (e.g., '@forum-manager-agent/forum-plugins-reddit')
 * @returns the registered PluginMetadata
 *
 * @behaviour
 * - Dynamic-imports the package.
 * - Asserts required exports exist; throws with clear message on missing.
 * - Calls registry.register() with the validated metadata.
 * - On import failure (package not installed, etc.), throws with context.
 */
export async function loadAndRegisterPlugin(
  registry: PluginRegistry,
  packageName: string,
): Promise<PluginMetadata> {
  let mod: Record<string, unknown>
  try {
    mod = (await import(packageName)) as Record<string, unknown>
  } catch (err) {
    throw new Error(
      `Failed to import plugin package "${packageName}": ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  const metadata: Partial<PluginMetadata> = {
    domain: mod.domain as PluginMetadata['domain'] | undefined,
    packageName: mod.packageName as string | undefined,
    propsSchema: mod.propsSchema as PluginMetadata['propsSchema'] | undefined,
    factory: mod.factory as PluginMetadata['factory'] | undefined,
  }

  // Defensive sanity check: the package's own packageName export should match
  // what we imported. Mismatch usually means someone copy-pasted a plugin
  // without updating its exports.
  if (metadata.packageName && metadata.packageName !== packageName) {
    throw new Error(
      `Plugin "${packageName}" declares packageName="${metadata.packageName}" — mismatch indicates a misconfigured plugin.`,
    )
  }

  assertValidMetadata(metadata)
  registry.register(metadata)
  return metadata
}
