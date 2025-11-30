<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWorkflowStore } from '../stores/workflow'
import { createSimulator } from '../utils/simulator'

const store = useWorkflowStore()

const simRef = ref<ReturnType<typeof createSimulator> | null>(null)
const steps = ref<any[]>([])
const runningStatus = ref<'idle' | 'running' | 'paused' | 'finished'>('idle')

function ensureSim() {
  if (!simRef.value) {
    simRef.value = createSimulator(store.workflow, { delayMs: 5000 })
  }
  return simRef.value
}

async function play() {
  const sim = ensureSim()
  runningStatus.value = 'running'
  await sim.play(
    (nodeId: string) => {
      // mark current node as running (blue)
      store.setActiveNode(nodeId)
      store.updateNode(nodeId, (n) => { n.data.status = 'running' })
    },
    async () => {
      await afterStepUpdate()
    }
  )
  runningStatus.value = 'finished'
}

function pause() {
  ensureSim().pause()
  runningStatus.value = 'paused'
}

async function step() {
  const sim = ensureSim()
  runningStatus.value = 'running'
  await sim.step(
    (nodeId: string) => {
      store.setActiveNode(nodeId)
      store.updateNode(nodeId, (n) => { n.data.status = 'running' })
    },
    async () => { await afterStepUpdate() }
  )
  runningStatus.value = 'paused'
}

function reset() {
  ensureSim().reset()
  simRef.value = null
  steps.value = []
  runningStatus.value = 'idle'
  store.setActiveNode(null)
  store.setActiveEdge(null)
  store.workflow.nodes.forEach(n => {
    store.updateNode(n.id, (node) => { node.data.status = 'idle' })
  })
}


async function afterStepUpdate() {
  const sim = ensureSim()
  steps.value = [...sim.state.steps]
  const last = steps.value[steps.value.length - 1]
  if (!last) return
  // highlight last executed node
  store.setActiveNode(last.nodeId)
  store.updateNode(last.nodeId, (n) => { n.data.status = last.status === 'error' ? 'error' : 'success' })
  // highlight the edge used during transition (if any)
  const tr = (sim as any).getLastTransition?.()
  if (tr?.edgeId) {
    store.setActiveEdge(tr.edgeId)
    setTimeout(() => store.setActiveEdge(null), 500)
  }
}

const disabledButtonMap = computed(() => {
  return {
    reset: runningStatus.value === 'running',
    play: runningStatus.value === 'running' || runningStatus.value === 'finished',
    pause: runningStatus.value !== 'running',
    step: runningStatus.value === 'running',
  }
})

</script>

<template>
  <div class="card p-3">
    <div class="flex items-center gap-2">
      <button class="btn disabled:opacity-50" :disabled="disabledButtonMap.reset" @click="reset">Reset</button>
      <button class="btn btn-primary disabled:opacity-50" :disabled="disabledButtonMap.play" @click="play">Play</button>
      <button class="btn disabled:opacity-50" :disabled="disabledButtonMap.pause" @click="pause">Pause</button>
      <button class="btn disabled:opacity-50" :disabled="disabledButtonMap.step" @click="step">Step</button>
      <div class="ml-auto text-sm text-ink-500">{{ steps.length }} steps</div>
    </div>
    <div class="mt-3 max-h-48 overflow-y-auto text-sm">
      <p v-if="runningStatus === 'running'" class="text-ink-500">Running...</p>
      <p v-if="runningStatus === 'paused'" class="text-ink-500">Paused</p>
      <p v-if="runningStatus === 'finished'" class="text-ink-500">Finished</p>
      <div v-if="steps.length === 0" class="text-ink-500">No logs yet.</div>
      <ul class="space-y-1">
        <li v-for="(s, i) in steps" :key="i" class="flex items-center gap-2">
          <span class="inline-block h-2 w-2 rounded-full"
            :class="{
              'bg-success-500': s.status === 'success',
              'bg-danger-500': s.status === 'error',
              'bg-ink-300': s.status === 'skipped',
            }"
          />
          <span class="font-mono text-ink-600">{{ s.nodeId.slice(0,6) }}</span>
          <span class="text-ink-800">{{ s.log }}</span>
        </li>
      </ul>
    </div>
  </div>


</template>
