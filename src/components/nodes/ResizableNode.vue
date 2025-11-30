<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { NodeResizer } from '@vue-flow/node-resizer'
import { Handle, Position } from '@vue-flow/core'
import { useWorkflowStore } from '../../stores/workflow'

const props = defineProps<{ id: string; data: any; selected?: boolean }>()
const store = useWorkflowStore()

const editing = ref(false)
const localLabel = ref<string>('')
const inputRef = ref<HTMLInputElement | null>(null)

function startEdit(e?: MouseEvent) {
  if (e) e.stopPropagation()
  editing.value = true
  localLabel.value = String(props.data?.label ?? '')
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}
function commitEdit() {
  const val = localLabel.value.trim()
  store.updateNode(props.id, (node) => {
    node.data.label = val || 'Node'
  })
  editing.value = false
}
function cancelEdit() {
  editing.value = false
}

function removeNode(e: MouseEvent) {
  e.stopPropagation()
  store.removeNode(props.id)
}
</script>

<template>
  <div class="relative h-full w-full rounded-md border border-ink-200 bg-white shadow-card overflow-hidden">
    <NodeResizer :min-width="120" :min-height="48" :is-visible="!!selected" />

    <button
      v-if="selected"
      class="absolute right-1 top-1 h-6 w-6 rounded-md bg-white/90 text-ink-700 hover:text-danger-500 border border-ink-200 shadow-sm"
      title="Delete node"
      @click="removeNode"
    >✕</button>

    <button
      v-if="selected"
      class="absolute right-8 top-1 h-6 px-2 rounded-md bg-white/90 text-ink-700 hover:text-ink-900 border border-ink-200 shadow-sm"
      title="Edit label"
      @click.stop="startEdit"
    >✎</button>

    <div class="px-3 py-2 text-sm font-medium text-ink-800 truncate pr-8" @dblclick.stop="startEdit">
      <template v-if="editing">
        <input
          ref="inputRef"
          v-model="localLabel"
          class="input h-7 !px-2 !py-1 text-sm"
          @keydown.enter.stop.prevent="commitEdit"
          @keydown.esc.stop.prevent="cancelEdit"
          @blur="commitEdit"
        />
      </template>
      <template v-else>
        {{ data?.label || 'Node' }}
      </template>
    </div>

    <!-- Input handle (left) -->
    <Handle type="target" :position="Position.Top" id="in" :style="{ left: '50%' }" />

    <!-- Outputs: for condition nodes, two outputs (true/false), otherwise single output -->
    <template v-if="data?.kind === 'logic.condition'">
      <Handle
        type="source"
        :position="Position.Bottom"
        id="true"
        :style="{ left: '35%' }"
      />
      <Handle
        type="source"
        :position="Position.Bottom"
        id="false"
        :style="{ left: '65%' }"
      />
    </template>
    <template v-else>
      <Handle type="source" :position="Position.Bottom" id="out" :style="{ left: '50%' }" />
    </template>
  </div>
  </template>
