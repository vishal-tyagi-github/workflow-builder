<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, onBeforeMount } from 'vue'
import CanvasView from './components/CanvasView.vue'
import Palette from './components/Palette.vue'
import ConfigPanel from './components/ConfigPanel.vue'
import RunPreview from './components/RunPreview.vue'
import { useWorkflowStore } from './stores/workflow'

const store = useWorkflowStore()
const selectedNodeId = ref<string | null>(null)

onBeforeMount(() => {
  store.initializeFromStorage()
})

onMounted(() => {
  // store.initializeFromStorage()
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
})

function onKeyDown(e: KeyboardEvent) {
  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  const mod = isMac ? e.metaKey : e.ctrlKey
  if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    e.preventDefault()
    store.undo()
  } else if (mod && e.key.toLowerCase() === 'z' && e.shiftKey) {
    e.preventDefault()
    store.redo()
  }
}
</script>

<template>
  <div class="h-full w-full grid grid-rows-[auto_1fr_auto]">
    <!-- Top bar -->
    <div class="border-b border-ink-200 bg-white">
      <div class="mx-auto max-w-[1600px] px-4 h-12 flex items-center gap-2">
        <div class="font-semibold">Workflow Builder</div>
        <div class="ml-auto flex items-center gap-2">
          <button class="btn" @click="store.undo">Undo ⌘Z</button>
          <button class="btn" @click="store.redo">Redo ⇧⌘Z</button>
          <button class="btn" @click="store.saveToStorage">Save</button>
        </div>
      </div>
    </div>

    <!-- Main content -->
    <div class="grid grid-cols-[280px_1fr_320px] gap-3 mx-auto max-w-[1600px] w-full p-3 h-full">
      <div class="card p-3 overflow-y-auto h-full">
        <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Palette</div>
        <Palette />
      </div>
      <div class="card overflow-hidden h-full">
        <CanvasView @selectNode="(id) => selectedNodeId = id" />
      </div>
      <div class="card overflow-hidden h-full">
        <div class="mb-2 p-3 text-xs font-semibold uppercase tracking-wide text-ink-500 border-b border-ink-100">Config</div>
        <ConfigPanel :selectedNodeId="selectedNodeId" />
      </div>
    </div>

    <!-- Preview -->
    <div class="border-t border-ink-200 bg-ink-50">
      <div class="mx-auto max-w-[1600px] px-4 py-3">
        <RunPreview />
      </div>
    </div>
  </div>
</template>

<style scoped>
</style> 
