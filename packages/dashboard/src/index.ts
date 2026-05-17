// Root component + tree client
export { App } from './app.tsx'
export { createTreeClient } from './treeClient.ts'

// Typed-tree-view machinery
export { createTreeSchemaRegistry, registerBatch } from './schemaRegistry.ts'
export { SchemaForm, fieldKindFor } from './formRenderer.tsx'
export { TreeNavigator } from './treeNavigator.tsx'

export type {
  DashboardOpts,
  DashboardClient,
  ViewName,
  FieldKind,
  NodeSchemaEntry,
  TreeSchemaRegistry,
  SubmitResult,
} from './types.ts'
