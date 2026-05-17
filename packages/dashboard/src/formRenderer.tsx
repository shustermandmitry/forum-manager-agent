/**
 * @module dashboard/formRenderer
 *
 * Schema-aware form rendering. Given a zod schema + initial value, render
 * a Solid form with appropriate field kinds. Validate on submit using the
 * schema. Surface errors per field.
 *
 * Supported field kinds in v1: string, number, boolean, enum, list-of-strings,
 * ref-to-secret (one-way valve).
 */

import type { FieldKind, SubmitResult } from './types.ts'

/**
 * Detect the field kind for a given zod schema. Inspects the schema's
 * `_def` (or equivalent) to determine the appropriate renderer.
 *
 * @behaviour
 * - z.string()                → 'string'
 * - z.number()                → 'number'
 * - z.boolean()               → 'boolean'
 * - z.enum([...])             → 'enum'
 * - z.array(z.string())       → 'list-of-strings'
 * - z.object({...}).describe('secret') → 'ref-to-secret'
 * - Other (nested objects, etc.) → recurse for sub-forms
 */
export function fieldKindFor(_schema: unknown): FieldKind {
  throw new Error('Not implemented')
}

/**
 * The main form component. Renders fields for each entry in the schema's
 * shape. On submit, validates and returns SubmitResult to onSubmit callback.
 *
 * @behaviour
 * - For each top-level field in schema's object shape, render the appropriate input.
 * - On field change, update local form state (not yet committed).
 * - On submit, run schema.parse(formState); on success call onSubmit({ok:true,value}); on zod error call onSubmit({ok:false,errors}).
 * - For 'ref-to-secret' fields: render a one-way input — shows configured/not-configured status only; clicking [Set]/[Update] opens a modal that writes to keychain/env and does NOT round-trip back to display.
 */
export function SchemaForm(_props: {
  schema: unknown
  initial: unknown
  onSubmit: (result: SubmitResult) => void
  onCancel: () => void
}) {
  throw new Error('Not implemented')
}
