/**
 * @module forum-manager-agent/samovar.config
 *
 * Workspace-level samovar config. Currently empty — per-package
 * samovar.config.ts files (alongside each package's package.json) carry
 * the real shape, filled in when build wiring lands in Phase 1.
 *
 * `crateName` removed 2026-05-16 — internal wiring leaking into user-facing
 * config. samovar-cli's `defineConfig` type needs to drop the field; see
 * samovar_cli_drop_crateName_request.md in memory.
 *
 * Going forward: any samovar-shape decisions in this repo are grounded in
 * samovar-cli source code, not docs. Docs lie / go stale.
 */

import { defineConfig } from '@shustermandmitry/samovar/packageProcess'

export default defineConfig({} as any)
