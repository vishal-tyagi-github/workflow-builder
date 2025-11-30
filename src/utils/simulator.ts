import type { Workflow, SimulationState, WorkflowEdge, WorkflowNode } from '../types/workflow'

export type SimulatorOptions = {
  delayMs?: number
}


// will fail for the failure@gmail.com
const sendEmailMock = async (to: string, _subject: string, _body: string, { failed = false }: { failed?: boolean } = {}) => {
  await new Promise((resolve, reject) => {
    if (failed || to === 'failure@gmail.com') {
      setTimeout(() => {
        reject({status: 500, message: 'Failed to send email'})
      }, 1000)
    } else {
      setTimeout(() => {
        resolve({status: 200})
      }, 1000)
    }
  })
}


// will fail for the failure@gmail.com
const sendSmsMock = async (to: string, _message: string, { failed = false }: { failed?: boolean } = {}) => {
  await new Promise((resolve, reject) => {
    if (failed || to === 'failure@gmail.com') {
      setTimeout(() => {
        reject({status: 500, message: 'Failed to send SMS'})
      }, 1000)
    } else {
      setTimeout(() => {
        resolve({status: 200})
      }, 1000)
    }
  })
}

// failure for the http://failure.com
const mockHttpCall = async (url: string, _method: string, _headers: Record<string, string>, _body: any, { failed = false }: { failed?: boolean } = {}) => {
  return new Promise((resolve, reject) => {
    if (failed || url === 'http://failure.com') {
      setTimeout(() => {
        reject({status: 500, message: 'Failed to make HTTP call'})
      }, 1000)
    } else {
      setTimeout(() => {
        resolve({status: 200})
      }, 1000)
    }
  })
}

const delayMock = async (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}


export function createSimulator(workflow: Workflow, _opts: SimulatorOptions = {}) {
  const state: SimulationState = { currentNode: null, running: false, steps: [], pointer: -1 }
  const outEdgesByNode = new Map<string, WorkflowEdge[]>()
  const incomingCount = new Map<string, number>()
  const nodeById = new Map<string, WorkflowNode>()
  let currentNodeId: string | null = null
  let lastResponse: any = undefined
  let lastTransition: { from?: string; to?: string; edgeId?: string } | null = null

  // prepare indices
  workflow.nodes.forEach(n => {
    nodeById.set(n.id, n)
    outEdgesByNode.set(n.id, [])
    incomingCount.set(n.id, 0)
  })
  workflow.edges.forEach(e => {
    if (!outEdgesByNode.has(e.source)) outEdgesByNode.set(e.source, [])
    outEdgesByNode.get(e.source)!.push(e)
    incomingCount.set(e.target, (incomingCount.get(e.target) ?? 0) + 1)
  })
  const startNodes: string[] = []
  incomingCount.forEach((cnt, id) => { if ((cnt ?? 0) === 0) startNodes.push(id) })

  function log(nodeId: string, status: 'success' | 'error' | 'skipped', message: string) {
    state.steps.push({
      nodeId,
      startedAt: Date.now(),
      finishedAt: Date.now(),
      status,
      log: message,
    })
  }

  async function runOne(nodeId: string) {
    // Mock implementations
    const node = nodeById.get(nodeId)
    if (!node) return
    state.currentNode = node;
    const kind = node.data.kind

    // mocking the delay for the node
    if (kind === 'logic.condition') {
      let decision = false
      try {
        const expr = String(node.data.config?.['expression'] ?? '').trim()
        if (expr) {
          // eslint-disable-next-line no-new-func
          const fn = new Function('response', `try { return !!(${expr}); } catch { return false }`)
          decision = !!fn(lastResponse)
        }
      } catch {
        decision = false
      }
      log(nodeId, 'success', `Condition: ${decision ? 'true' : 'false'}`)
      // choose edge by label true/false
      const outs = outEdgesByNode.get(nodeId) ?? []
      const wanted = outs.find(e => (e.label ?? '').toLowerCase() === (decision ? 'true' : 'false'))
      if (wanted && nodeById.has(wanted.target)) {
        lastTransition = { from: nodeId, to: wanted.target, edgeId: wanted.id }
        currentNodeId = wanted.target
      } else {
        log(nodeId, 'error', `Missing ${decision ? 'true' : 'false'} edge`)
        currentNodeId = null
        lastTransition = null
      }
    } else if (kind === 'action.http') {
      try {
       const result = await mockHttpCall(node.data.config?.['url'] as string, node.data.config?.['method'] as string, node.data.config?.['headers'] as Record<string, string>, node.data.config?.['body'] as any, { failed: node.data.config?.['failed'] as boolean }) as { status: number }
       lastResponse = result
       log(nodeId, 'success', `HTTP call to ${node.data.config?.['url'] as string} returned ${result.status}`);
      } catch (error) {
        log(nodeId, 'error', `Failed to make HTTP call to ${node.data.config?.['url'] as string}`);
      }
      const outs = outEdgesByNode.get(nodeId) ?? []
      currentNodeId = outs.length && nodeById.has(outs[0]!.target) ? outs[0]!.target : null
      lastTransition = outs.length ? { from: nodeId, to: outs[0]!.target, edgeId: outs[0]!.id } : null
    } else if (kind === 'action.email') {
      try {
       const result = await sendEmailMock(node.data.config?.['to'] as string, node.data.config?.['subject'] as string, node.data.config?.['body'] as string, { failed: node.data.config?.['failed'] as boolean })
       log(nodeId, 'success', `Email sent to ${node.data.config?.['to'] as string}`);
       lastResponse = result
      } catch (error) {
        log(nodeId, 'error', `Failed to send to ${node.data.config?.['to'] as string}`);
      }
    
      const outs = outEdgesByNode.get(nodeId) ?? []
      currentNodeId = outs.length && nodeById.has(outs[0]!.target) ? outs[0]!.target : null
      lastTransition = outs.length ? { from: nodeId, to: outs[0]!.target, edgeId: outs[0]!.id } : null
    } else if (kind === 'action.sms') {
      try {
       const result = await sendSmsMock(node.data.config?.['to'] as string, node.data.config?.['message'] as string, { failed: node.data.config?.['failed'] as boolean })
       lastResponse = result
       log(nodeId, 'success', `SMS sent to ${node.data.config?.['to'] as string}`);
      } catch (error) {
        log(nodeId, 'error', `Failed to send SMS to ${node.data.config?.['to'] as string}`);
      }
      const outs = outEdgesByNode.get(nodeId) ?? []
      currentNodeId = outs.length && nodeById.has(outs[0]!.target) ? outs[0]!.target : null
      lastTransition = outs.length ? { from: nodeId, to: outs[0]!.target, edgeId: outs[0]!.id } : null
    } else if (kind === 'util.delay') {
      await delayMock(node.data.config?.['ms'] as number)
      lastResponse = {status: 200}
      log(nodeId, 'success', `Delayed for ${node.data.config?.['ms'] as number}ms`);
      const outs = outEdgesByNode.get(nodeId) ?? []
      currentNodeId = outs.length && nodeById.has(outs[0]!.target) ? outs[0]!.target : null
      lastTransition = outs.length ? { from: nodeId, to: outs[0]!.target, edgeId: outs[0]!.id } : null
    } else if (kind === 'util.log') {
      log(nodeId, 'success', String(node.data.config?.['message'] ?? 'Log'))
      const outs = outEdgesByNode.get(nodeId) ?? []
      currentNodeId = outs.length && nodeById.has(outs[0]!.target) ? outs[0]!.target : null
      lastTransition = outs.length ? { from: nodeId, to: outs[0]!.target, edgeId: outs[0]!.id } : null
    } else {
      log(nodeId, 'success', 'OK')
      const outs = outEdgesByNode.get(nodeId) ?? []
      currentNodeId = outs.length && nodeById.has(outs[0]!.target) ? outs[0]!.target : null
      lastTransition = outs.length ? { from: nodeId, to: outs[0]!.target, edgeId: outs[0]!.id } : null
    }
  }

  return {
    state,
    getLastTransition() {
      return lastTransition
    },
    async step(onBefore?: (nodeId: string) => void, onAfter?: () => void) {
      // initialize starting point
      if (state.pointer === -1) {
        currentNodeId = startNodes[0] ?? null
      }
      if (!currentNodeId) return
      state.pointer++
      try {
        onBefore?.(currentNodeId)
      } catch {}
      await runOne(currentNodeId)
      try {
        onAfter?.()
      } catch {}
    },
    async play(onBefore?: (nodeId: string) => void, onAfter?: () => void) {
      state.running = true
      // run until no next node
      while (state.running) {
        await this.step(onBefore, onAfter)
        if (!currentNodeId) break
      }
      state.running = false
    },
    pause() {
      state.running = false
    },
    reset() {
      state.running = false
      state.pointer = -1
      state.steps = []
      currentNodeId = null
      lastResponse = undefined
      lastTransition = null
    },
  }
}
