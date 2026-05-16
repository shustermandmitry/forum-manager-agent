/**
 * @module forum-manager-agent/samovar.config
 *
 * @abstract Workspace-level samovar build config. Declares the three targets the
 * monorepo emits: two node bindings (for stress-testing both) and the browser
 * dashboard.
 *
 * Each entry resolves to a sub-package's own samovar.config.ts via `entry`.
 * Per-package configs declare their own crateName + entry; this file just
 * orchestrates which targets compile which entries.
 *
 * Filled with stubs intentionally — exact factory shapes get nailed down in
 * Phase 1 when samovar conventions are integrated. See ../docs/design.md §3
 * for the target-binding strategy.
 */

import { defineConfig } from '@shustermandmitry/samovar/packageProcess'

export default defineConfig({
  crateName: 'forum-manager-agent',

  // Three targets — node-napi + node-ts are the binding stress-test; browser is the dashboard.
  // Each target's entry is the sub-package's own samovar.config.ts.
  targets: [
    {
      name: 'node-napi',
      binding: 'napi',
      family: 'node',
      entries: ['packages/agent-server'],
    },
    {
      name: 'node-ts',
      binding: 'ts',
      family: 'node',
      entries: ['packages/agent-server'],
    },
    {
      name: 'browser',
      binding: 'esm',
      family: 'browser',
      entries: ['packages/dashboard'],
    },
  ],
} as any)
