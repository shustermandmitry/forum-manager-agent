/**
 * @module forum-manager-agent/app.config
 *
 * App-runtime config. SEPARATE from samovar.config.ts which is build-time.
 *
 * Loaded by agent-server at boot; seeds the /config/ tree branch. From that
 * point on, the tree is the source of truth — dashboard edits write to the
 * tree, not back to this file. Future samovar config-mount-handler will
 * auto-gen and live-sync; for v1 we seed manually.
 *
 * All `*_ref` fields are references to secrets resolved at boot from
 * env (v1) or OS keychain (v2). Actual secret values never live in this file.
 */

import { z } from 'zod'

export const ForumPluginConfigSchema = z.object({
  pluginName: z.string(),         // npm package name of the forum plugin
  forumId: z.string(),            // logical id, used as the mount key under /app/forums/
  enabled: z.boolean().default(true),
  props: z.record(z.unknown()),   // plugin-specific config; validated by the plugin's own schema at mount time
})

export const AppConfigSchema = z.object({
  focus: z.object({
    prompt: z.string(),
    redLines: z.array(z.string()).default([]),
    voiceSamples: z.array(z.string()).default([]),
  }),

  forums: z.array(ForumPluginConfigSchema).default([]),

  models: z.object({
    claude: z.object({
      auth_ref: z.string(),
    }),
    local: z.object({
      modelName: z.string(),
      loraPath: z.string().optional(),
      socketPath: z.string(),
    }),
  }),

  policy: z.object({
    disclosure: z.enum(['strict', 'no-human-edit', 'never']).default('no-human-edit'),
    disclosure_footer: z.string(),
    escalation_trigger: z.string(),
    autopost_classes: z.array(z.string()).default([]),
  }),

  telegram: z.object({
    token_ref: z.string(),
    supergroupId: z.string().optional(),
  }),

  retraining: z.object({
    cadence: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
    minNewRows: z.number().default(50),
  }),
})

export type AppConfig = z.infer<typeof AppConfigSchema>
export type ForumPluginConfig = z.infer<typeof ForumPluginConfigSchema>

/**
 * Default app config — placeholder values. Real config lives in
 * per-peer overlay (app.config.local.ts or env-driven). Each peer
 * customizes for their own focus + voice + forums.
 */
const defaultConfig: AppConfig = {
  focus: {
    prompt: 'Be helpful, technically accurate, and genuinely engaged. Avoid marketing language.',
    redLines: [
      'Do not write in a way that sounds AI-generated.',
      'Do not fake expertise you do not have — escalate to Claude for substance.',
      'Do not post advertisements or affiliate links.',
    ],
    voiceSamples: [],
  },
  forums: [],
  models: {
    claude: { auth_ref: 'claude.max' },
    local: {
      modelName: 'mlx-community/Qwen2.5-32B-Instruct-4bit',
      socketPath: '/tmp/forum-manager-mlx.sock',
    },
  },
  policy: {
    disclosure: 'no-human-edit',
    disclosure_footer:
      '\n\n---\n_This reply was drafted by an AI assistant and posted without my review. Reply to me directly or DM @<handle> for personal attention._',
    escalation_trigger: '@<handle> human please',
    autopost_classes: [],
  },
  telegram: { token_ref: 'telegram.bot_token' },
  retraining: { cadence: 'weekly', minNewRows: 50 },
}

export default defaultConfig
