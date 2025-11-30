<script setup lang="ts">
import { computed } from 'vue'
import { useWorkflowStore } from '../stores/workflow'
import { NODE_REGISTRY, getSchemaByKind } from '../utils/registry'
import { nanoid } from 'nanoid'

const store = useWorkflowStore()

const groups = computed(() => {
  return [
    { title: 'Triggers', items: NODE_REGISTRY.filter(x => x.kind.startsWith('trigger.')) },
    { title: 'Actions', items: NODE_REGISTRY.filter(x => x.kind.startsWith('action.')) },
    { title: 'Logic', items: NODE_REGISTRY.filter(x => x.kind.startsWith('logic.')) },
    { title: 'Utils', items: NODE_REGISTRY.filter(x => x.kind.startsWith('util.')) },
  ]
})

function add(kind: string) {
  const schema = getSchemaByKind(kind as any)
  const id = nanoid()
  store.addNode({
    id,
    position: { x: Math.random() * 400, y: Math.random() * 200 },
    data: {
      kind: kind as any,
      label: schema?.title ?? kind,
      config: schema?.defaults ?? {},
      status: 'idle',
    },
  })
}

function onDragStart(event: DragEvent, kind: string) {
  const schema = getSchemaByKind(kind as any)
  const payload = {
    kind,
    label: schema?.title ?? kind,
    defaults: schema?.defaults ?? {},
  }
  event.dataTransfer?.setData('palette-item', JSON.stringify(payload))
  event.dataTransfer?.setData('text/plain', kind) // helpful for debugging
  event.dataTransfer!.effectAllowed = 'move'
}
</script>

<template>
  <div class="space-y-4">
    <div v-for="group in groups" :key="group.title">
      <div class="px-2 text-xs font-semibold uppercase tracking-wide text-ink-500">{{ group.title }}</div>
      <div class="mt-2 grid grid-cols-2 gap-2">
        <button
          v-for="item in group.items"
          :key="item.kind"
          class="btn"
          @click="add(item.kind)"
          draggable="true"
          @dragstart="onDragStart($event, item.kind)"
        >
          {{ item.title }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
