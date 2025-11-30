import type { NodeSchema, NodeKind, RegistryEntry } from '../types/workflow'

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}
function isEmail(v: unknown): v is string {
  return isNonEmptyString(v) && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)
}
function isHttpUrl(v: unknown): v is string {
  return isNonEmptyString(v) && /^https?:\/\//i.test(v)
}
function isNumber(v: unknown): v is number {
  return typeof v === 'number' && !Number.isNaN(v)
}

const base = (kind: NodeKind, title: string, fields: NodeSchema['fields'], validate?: NodeSchema['validate'], ports?: NodeSchema['ports'], defaults?: Record<string, unknown>): RegistryEntry => ({
  kind,
  title,
  fields,
  validate,
  ports,
  defaults,
})

export const NODE_REGISTRY: RegistryEntry[] = [
  base('trigger.manual', 'Manual Trigger', [] , undefined, { out: [{ id: 'out', type: 'out', label: 'out', required: true }] }),
  base('trigger.webhook', 'Webhook Trigger', [
    { type: 'text', name: 'path', label: 'Path', placeholder: '/webhook' },
    { type: 'text', name: 'secret', label: 'Secret' },
  ], (cfg: Record<string, unknown>) => {
    if (!isNonEmptyString((cfg as any).path)) return 'Path is required'
    return null
  }, { out: [{ id: 'out', type: 'out', label: 'out', required: true }] }, { path: '/webhook' }),
  base('action.email', 'Send Email', [
    { type: 'email', name: 'to', label: 'To' },
    { type: 'text', name: 'subject', label: 'Subject' },
    { type: 'textarea', name: 'body', label: 'Body' },
  ], (cfg: Record<string, unknown>) => {
    if (!isEmail((cfg as any).to)) return 'Valid email is required'
    if (!isNonEmptyString((cfg as any).subject)) return 'Subject is required'
    if (!isNonEmptyString((cfg as any).body)) return 'Body is required'
    return null
  }),
  base('action.sms', 'Send SMS', [
    { type: 'text', name: 'to', label: 'To' },
    { type: 'textarea', name: 'message', label: 'Message' },
  ], (cfg: Record<string, unknown>) => {
    if (!isNonEmptyString((cfg as any).to) || String((cfg as any).to).length < 3) return 'Phone is required'
    const msg = (cfg as any).message
    if (!isNonEmptyString(msg) || msg.length > 160) return 'Message 1–160 chars'
    return null
  }),
  base('action.http', 'HTTP Request', [
    { type: 'url', name: 'url', label: 'URL' },
    { type: 'select', name: 'method', label: 'Method', options: ['GET','POST','PUT','PATCH','DELETE'].map(v => ({ label: v, value: v })) },
    { type: 'json', name: 'headers', label: 'Headers', helper: 'JSON object' },
    { type: 'json', name: 'body', label: 'Body', helper: 'Any JSON value' },
  ], (cfg: Record<string, unknown>) => {
    if (!isHttpUrl((cfg as any).url)) return 'Valid http(s) URL required'
    const method = (cfg as any).method
    if (method && !['GET','POST','PUT','PATCH','DELETE'].includes(method)) return 'Invalid method'
    return null
  }),
  base('logic.condition', 'Condition', [
    { type: 'text', name: 'expression', label: 'Expression', placeholder: 'response.status == 200' },
  ], (cfg: Record<string, unknown>) => {
    if (!isNonEmptyString((cfg as any).expression)) return 'Expression required'
    return null
  }, { 
    in: [{ id: 'in', type: 'in', label: 'in', required: true }],
    out: [
      { id: 'true', type: 'out', label: 'true', required: true },
      { id: 'false', type: 'out', label: 'false', required: true },
    ],
  }),
  base('logic.transform', 'Transform', [
    { type: 'textarea', name: 'script', label: 'Script', helper: 'Return next payload' },
  ], (cfg: Record<string, unknown>) => {
    if (!isNonEmptyString((cfg as any).script)) return 'Script required'
    return null
  }),
  base('util.delay', 'Delay', [
    { type: 'number', name: 'ms', label: 'Milliseconds' },
  ], (cfg: Record<string, unknown>) => {
    const ms = (cfg as any).ms
    if (!isNumber(ms) || ms < 0 || ms > 1000 * 60 * 60 * 24) return 'ms must be 0–86400000'
    return null
  }, undefined, { ms: 1000 }),
  base('util.log', 'Log', [
    { type: 'text', name: 'message', label: 'Message' },
  ], (cfg: Record<string, unknown>) => {
    if (!isNonEmptyString((cfg as any).message)) return 'Message required'
    return null
  }),
]

export const getSchemaByKind = (kind: NodeKind): RegistryEntry | undefined =>
  NODE_REGISTRY.find(r => r.kind === kind)
