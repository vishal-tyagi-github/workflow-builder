## Workflow / Automation Builder — Frontend-Only (Vue 3)

Vue 3 + TypeScript app implementing a node-based workflow builder. Focus areas:
canvas UX, schema-driven forms, undo/redo, local persistence, and a visual run preview (simulation).

### Run locally

```bash
npm i
npm run dev
```

Sample Cases:

 - Sample Cases are present in the `src/samples` directory
 - To run and test the sample cases, open the `stores/workflow.ts` file and set the `LOAD_SAMPLE_WORKFLOW_INDEX`  variable to 0 or 1 based on which sample file you want to run using `SAMPLE_WORKFLOWS` array


### Architecture overview

- **Framework**: Vue 3 + Vite + TypeScript
- **Graph**: `@vue-flow/core` with MiniMap
- **State**: Pinia + Immer 
- **Validation**: Simple custom validators (schema-driven forms without external libs)
- **Styling**: TailwindCSS

Key directories:
- `src/stores/workflow.ts`: workflow state, immutable updates, undo/redo, autosave
- `src/components/CanvasView.vue`: VueFlow canvas (pan/zoom, connect, select)
- `src/components/Palette.vue`: node palette (add nodes)
- `src/components/ConfigPanel.vue`: dynamic, schema-driven config form with Zod
- `src/components/RunPreview.vue`: visual simulation controls (play/pause/step)
- `src/utils/registry.ts`: node type schema and validation
- `src/utils/simulator.ts`: simple mock simulator
- `src/samples/*.json`: two sample workflows
- `src/components/*`: custom edge and node components

### State shape

See `src/types/workflow.ts`. High-level:
- `Workflow`: `{ id, name, nodes[], edges[], viewport, version, updatedAt }`
- `WorkflowNode`: `{ id, position, data: { kind, label, config, status, logs } }`
- `WorkflowEdge`: `{ id, source, target, sourceHandle?, targetHandle?, label? }`
- Undo/Redo: `HistoryState<Workflow> = { past[], present, future[] }`

### Undo/Redo logic

Implemented with Immer. Each state-changing action calls a single commit function
that produces a new `present`, pushes the previous into `past`, and clears `future`.
`undo()` pops from `past` to `present` and pushes the old `present` to `future`.
`redo()` shifts from `future` back to `present`.

### How to add a node type

1. Define `fields` and an optional `validate(config) => string | null` in `src/utils/registry.ts`.
2. Add a `RegistryEntry` with `kind`, `title`, `fields`, optional `validate`, and optional ports/defaults.
3. The palette and config panel pick it up automatically.
4. Extend the simulator (optional) to add custom behavior/logs for the new kind.

### Persistence

LocalStorage autosave (debounced) + manual `Save`. Restores workflow and viewport.

### Run Preview

Executes nodes in topological order; logs per-step results with simple mock behaviors.
Controls: Play, Pause, Step, Reset.

### Roadmap / TODOs
- Keyboard shortcuts: multi-select, delete, duplicate, snap-to-grid
- A11y polish (roles/aria), performance for 200+ nodes
