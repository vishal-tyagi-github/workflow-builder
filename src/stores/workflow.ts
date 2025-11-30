import { defineStore } from "pinia";
import { nanoid } from "nanoid";
import { produce } from "immer";
import { toRaw } from "vue";
import { debounce } from "lodash-es";
import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  HistoryState,
  ViewportState,
} from "../types/workflow";
import { loadWorkflow } from "./sampleFileUtils.js";

const SAMPLE_WORKFLOWS: string[] = [
  "workflow-new-lead",
  "workflow-cart-recovery",
];

// set the index 0 or 1 to load the sample workflow define in SAMPLE_WORKFLOWS array, -1 to load the empty workflow
const LOAD_SAMPLE_WORKFLOW_INDEX = -1; 

const STORAGE_KEY = "workflow-builder/current";

function nowIso() {
  return new Date().toISOString();
}

function createEmptyWorkflow(): Workflow {
  return {
    id: nanoid(),
    name: "Untitled Workflow",
    nodes: [],
    edges: [],
    version: 1,
    updatedAt: nowIso(),
  };
}

function wrapHistory<T>(initial: T): HistoryState<T> {
  return { past: [], present: initial, future: [] };
}

export const useWorkflowStore = defineStore("workflow", {
  state: () => ({
    history: wrapHistory<Workflow>(createEmptyWorkflow()),
    viewport: { x: 0, y: 0, zoom: 1 } as ViewportState,
    selection: { nodes: new Set<string>(), edges: new Set<string>() },
    isDirty: false,
    activeNodeId: null as string | null,
    activeEdgeId: null as string | null,
  }),
  getters: {
    workflow: (s) => s.history.present,
  },
  actions: {
    initializeFromStorage() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as {
          workflow: Workflow;
          viewport?: ViewportState;
        };

        // load the workflow from the sample file
        if (!!SAMPLE_WORKFLOWS[LOAD_SAMPLE_WORKFLOW_INDEX]) {
          try {
            const sampleWorkflow = loadWorkflow(SAMPLE_WORKFLOWS[LOAD_SAMPLE_WORKFLOW_INDEX]!);
            if (sampleWorkflow) {
              this.history = wrapHistory(sampleWorkflow);
              if (parsed.viewport) this.viewport = parsed.viewport;
            }
          } catch (error) {
            console.error("Error loading sample workflow", error);
            // ignore
          }
        
        }else {
          if (parsed?.workflow) {
            const updatedWorkflow = produce(parsed.workflow, (draft) => {
              draft.nodes.forEach((n) => {
                n.data.status = "idle";
              });
            });
  
            this.history = wrapHistory(updatedWorkflow);
            if (parsed.viewport) this.viewport = parsed.viewport;
          }
        }

        
      } catch {
        // ignore
      }
    },
    setActiveNode(id: string | null) {
      this.activeNodeId = id;
    },
    setActiveEdge(id: string | null) {
      this.activeEdgeId = id;
    },
    setViewport(view: ViewportState) {
      this.viewport = toRaw(view);
      this.scheduleAutosave();
    },
    privateCommit(mutator: (draft: Workflow) => void) {
      const next = produce(toRaw(this.history.present), (draft) => {
        mutator(draft);
        draft.updatedAt = nowIso();
      });
      this.history.past.push(this.history.present);
      this.history.present = next;
      this.history.future = [];
      this.isDirty = true;
      this.scheduleAutosave();
    },
    undo() {
      if (this.history.past.length === 0) return;
      const prev = this.history.past.pop()!;
      this.history.future.unshift(this.history.present);
      this.history.present = prev;
      this.isDirty = true;
      this.scheduleAutosave();
    },
    redo() {
      if (this.history.future.length === 0) return;
      const next = this.history.future.shift()!;
      this.history.past.push(this.history.present);
      this.history.present = next;
      this.isDirty = true;
      this.scheduleAutosave();
    },
    addNode(
      node: Omit<WorkflowNode, "id"> & Partial<Pick<WorkflowNode, "id">>
    ) {
      const id = node.id ?? nanoid();
      this.privateCommit((draft) => {
        draft.nodes.push({ ...node, id });
      });
      return id;
    },
    updateNode(id: string, updater: (node: WorkflowNode) => void) {
      this.privateCommit((draft) => {
        const n = draft.nodes.find((n) => n.id === id);
        if (n) updater(n);
      });
    },
    removeNode(id: string) {
      this.privateCommit((draft) => {
        draft.nodes = draft.nodes.filter((n) => n.id !== id);
        draft.edges = draft.edges.filter(
          (e) => e.source !== id && e.target !== id
        );
      });
    },
    addEdge(
      edge: Omit<WorkflowEdge, "id"> & Partial<Pick<WorkflowEdge, "id">>
    ) {
      const id = edge.id ?? nanoid();
      this.privateCommit((draft) => {
        draft.edges.push({ ...edge, id });
      });
      return id;
    },
    removeEdge(id: string) {
      this.privateCommit((draft) => {
        draft.edges = draft.edges.filter((e) => e.id !== id);
      });
    },
    updateEdge(id: string, updater: (edge: WorkflowEdge) => void) {
      this.privateCommit((draft) => {
        const e = draft.edges.find((e) => e.id === id);
        if (e) updater(e as WorkflowEdge);
      });
    },
    setSelection(next: { nodes?: string[]; edges?: string[] }) {
      this.selection.nodes = new Set(next.nodes ?? []);
      this.selection.edges = new Set(next.edges ?? []);
    },
    clearSelection() {
      this.selection.nodes.clear();
      this.selection.edges.clear();
    },
    saveToStorage() {
      const payload = JSON.stringify({
        workflow: this.history.present,
        viewport: this.viewport,
      });
      localStorage.setItem(STORAGE_KEY, payload);
      this.isDirty = false;
    },
    scheduleAutosave: debounce(function (this: any) {
      (this as ReturnType<typeof useWorkflowStore>).saveToStorage();
    }, 500),
    replaceWorkflow(wf: Workflow) {
      this.history = wrapHistory(wf);
      this.isDirty = true;
      this.scheduleAutosave();
    },
  },
});
