<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, shallowRef, markRaw, computed } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import type { NodeTypesObject, NodeComponent, EdgeTypesObject, EdgeComponent } from '@vue-flow/core'
import { MiniMap } from '@vue-flow/minimap'
import { Background } from '@vue-flow/background'
import NodeResizable from './nodes/ResizableNode.vue'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/minimap/dist/style.css'
import '@vue-flow/node-resizer/dist/style.css'
import { useWorkflowStore } from '../stores/workflow'
import LabeledEdge from './edges/LabeledEdge.vue'

const store = useWorkflowStore()
const { fitView, setViewport, onConnect, project, applyNodeChanges, applyEdgeChanges } = useVueFlow()

const emit = defineEmits<{ (e: 'selectNode', id: string | null): void }>()

const nodes = ref<any[]>([])
const edges = ref<any[]>([])
// Prevent Vue from making component definitions reactive and satisfy VueFlow types
const nodeTypes = shallowRef<NodeTypesObject>({ resizable: markRaw(NodeResizable) as unknown as NodeComponent })
const edgeTypes = shallowRef<EdgeTypesObject>({ labeled: markRaw(LabeledEdge) as unknown as EdgeComponent })
const vueFlowWrapper = ref<HTMLElement | null>(null)

// Bind viewport with a setter that persists to LocalStorage via store.setViewport
const viewportBinding = computed({
  get: () => store.viewport,
  set: (v) => store.setViewport(v as any),
})

const isDragging = ref(false)

const buildNode = (n: any) => markRaw({
  id: n.id,
  position: { x: n.position.x, y: n.position.y },
  data: { ...n.data },
  type: 'resizable',
  draggable: true,
  selectable: true,
  class: [
    store.activeNodeId === n.id ? 'node-active' : '',
    n.data?.status === 'running' ? 'node-running' : '',
    n.data?.status === 'success' ? 'node-success' : '',
    n.data?.status === 'error' ? 'node-error' : '',
  ].filter(Boolean).join(' '),
  style: {
    width: n.data?.width ?? 180,
    height: n.data?.height ?? 60,
  },
})
const buildEdge = (e: any) => markRaw({
  id: e.id,
  source: e.source,
  target: e.target,
  sourceHandle: e.sourceHandle,
  targetHandle: e.targetHandle,
  label: e.label,
  type: 'labeled',
})

const syncNodesFromStore = () => {
  nodes.value = store.workflow.nodes.map((n) => buildNode(n))
}
const syncEdgesFromStore = () => {
  edges.value = store.workflow.edges.map((e) => buildEdge(e))
}

const syncFromStore = () => {
  nodes.value = store.workflow.nodes.map(n => buildNode(n))
  edges.value = store.workflow.edges.map(e => buildEdge(e))
}

onMounted(() => {
  syncFromStore()
  setViewport(store.viewport)

  // DnD listeners
  const el = vueFlowWrapper.value
  el?.addEventListener('dragover', handleDragOver)
  el?.addEventListener('drop', handleDrop)
})

watch(viewportBinding, (viewport) => {
  setViewport(viewport)
}, { deep: true })

onBeforeUnmount(() => {
  const el = vueFlowWrapper.value
  el?.removeEventListener('dragover', handleDragOver)
  el?.removeEventListener('drop', handleDrop)
})
watch(() => store.workflow.nodes, () => {
  if (isDragging.value) return
  syncNodesFromStore()
}, { deep: true })
watch(() => store.workflow.edges, () => { syncEdgesFromStore() }, { deep: true })

watch(nodes, (nv) => {
  // sync only size back to store; positions are saved on drag-stop
  if (isDragging.value) return
  nv.forEach(n => {
    const sn = store.workflow.nodes.find(x => x.id === n.id)
    // sync resizer width/height back to store
    const w = typeof n.style?.width === 'number' ? n.style.width : undefined
    const h = typeof n.style?.height === 'number' ? n.style.height : undefined
    if (sn && (w !== undefined || h !== undefined)) {
      const curW = sn.data.width ?? 180
      const curH = sn.data.height ?? 60
      if ((w !== undefined && w !== curW) || (h !== undefined && h !== curH)) {
        store.updateNode(n.id, (node) => {
          if (w !== undefined) node.data.width = w
          if (h !== undefined) node.data.height = h
        })
      }
    }
  })

}, { deep: true })

watch(() => nodes.value.length, (len, prev) => {
  if ((prev ?? 0) === 0 && len > 0) {
    fitView({ padding: 0.2 })
  }
})

onConnect((params) => {
  const defaultLabel = params.sourceHandle && ['true','false'].includes(params.sourceHandle) ? params.sourceHandle : ''
  store.addEdge({
    source: params.source!,
    target: params.target!,
    sourceHandle: params.sourceHandle ?? undefined,
    targetHandle: params.targetHandle ?? undefined,
    label: defaultLabel || undefined,
  })
})

function handleNodeDragStart() {
  isDragging.value = true
}
function handleNodeDragStop({ node }: any) {
  isDragging.value = false
  if (!node?.id) return
  // persist final position only once after drag ends
  store.updateNode(node.id, (n) => {
    n.position = { x: node.position.x, y: node.position.y }
  })
}

function handleNodeClick({ node }: any) {
  emit('selectNode', node?.id ?? null)
}
function handlePaneClick() {
  emit('selectNode', null)
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  const bounds = vueFlowWrapper.value?.getBoundingClientRect()
  const raw = event.dataTransfer?.getData('palette-item')
  if (!bounds || !raw) return
  let payload: any
  try { payload = JSON.parse(raw) } catch { return }
  const position = project({ x: event.clientX - bounds.left, y: event.clientY - bounds.top })
  // add node into store, VueFlow will reflect from store watcher
  store.addNode({
    position,
    data: {
      kind: payload.kind,
      label: payload.label ?? payload.kind,
      config: payload.defaults ?? {},
      status: 'idle',
      width: 180,
      height: 60,
    },
  } as any)
}

function handleNodesChange(changes: any[]) {
  changes.forEach(change => {
    if (change.type === 'remove') {
      store.removeNode(change.id)
    }
  })
  applyNodeChanges(changes)
}
function handleEdgesChange(changes: any[]) {
  changes.forEach(change => {
    if (change.type === 'remove') {
      store.removeEdge(change.id)
    }
  })
  applyEdgeChanges(changes)
}
function handleViewportChangeEnd(viewport: any) {
  store.setViewport(viewport)
}
// if viewport config is not present, fit the view
const isViewPortConfigNotPresent = computed(() => {
  return !viewportBinding.value.x && !viewportBinding.value.y && viewportBinding.value.zoom === 1
})

</script>

<template>
  <div class="h-full w-full" ref="vueFlowWrapper">
    <VueFlow
      :node-types="nodeTypes"
      :edge-types="edgeTypes"
      :nodes="nodes"
      :edges="edges"
      :viewport="viewportBinding"
      @viewport-change-end="handleViewportChangeEnd"
      class="h-full w-full bg-ink-50"
      :default-zoom="1"
      :min-zoom="0.25"
      :max-zoom="2"
      :fit-view-on-init="isViewPortConfigNotPresent"
      @node-drag-start="handleNodeDragStart"
      @node-drag-stop="handleNodeDragStop"
      @node-click="handleNodeClick"
      @pane-click="handlePaneClick"
      @nodes-change="handleNodesChange"
      @edges-change="handleEdgesChange"
    >
      <MiniMap pannable zoomable class="!bg-white/80" />
      <Background />
    </VueFlow>
  </div>
</template>

<style scoped>
</style>
