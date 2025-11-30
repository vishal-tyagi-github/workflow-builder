export type NodeKind =
  | 'trigger.manual'
  | 'trigger.webhook'
  | 'action.http'
  | 'action.email'
  | 'action.sms'
  | 'logic.condition'
  | 'logic.transform'
  | 'util.delay'
  | 'util.log';

export interface PortSpec {
  id: string;
  label?: string;
  type: 'in' | 'out';
  dataType?: string;
  required?: boolean;
}

export interface WorkflowNodeData {
  kind: NodeKind;
  label: string;
  config: Record<string, unknown>;
  status?: 'idle' | 'running' | 'success' | 'error' | 'skipped';
  logs?: string[];
  width?: number;
  height?: number;
}

export interface WorkflowNode {
  id: string;
  position: { x: number; y: number };
  data: WorkflowNodeData;
  ports?: PortSpec[];
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  requiredLabel?: boolean;
}

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: ViewportState;
  version: number;
  updatedAt: string;
}

export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export interface SimulationStep {
  nodeId: string;
  startedAt: number;
  finishedAt?: number;
  status?: 'success' | 'error' | 'skipped';
  log?: string;
}

export interface SimulationState {
  currentNode: WorkflowNode | null;
  running: boolean;
  steps: SimulationStep[];
  pointer: number;
}

export type NodeSchemaField =
  | {
      type: 'text' | 'textarea' | 'number' | 'email' | 'url';
      name: string;
      label: string;
      placeholder?: string;
      helper?: string;
      required?: boolean;
    }
  | {
      type: 'select';
      name: string;
      label: string;
      options: { label: string; value: string }[];
      required?: boolean;
    }
  | {
      type: 'json';
      name: string;
      label: string;
      helper?: string;
    };

export interface NodeSchema {
  kind: NodeKind;
  title: string;
  description?: string;
  fields: NodeSchemaField[];
  validate?: (config: Record<string, unknown>) => string | null; // return error string or null
  ports?: {
    in?: PortSpec[];
    out?: PortSpec[];
  };
  defaults?: Record<string, unknown>;
}

export interface RegistryEntry extends NodeSchema {}
