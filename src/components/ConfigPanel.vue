<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useWorkflowStore } from '../stores/workflow'
import { getSchemaByKind } from '../utils/registry'

const props = defineProps<{ selectedNodeId?: string | null }>()

const store = useWorkflowStore()

const selectedNode = computed(() => store.workflow.nodes.find(n => n.id === props.selectedNodeId))
const schemaEntry = computed(() => selectedNode.value ? getSchemaByKind(selectedNode.value.data.kind) : undefined)

const localState = reactive<{ value: Record<string, any>; error: string | null; valid: boolean }>({
  value: {},
  error: null,
  valid: true,
})

watch(selectedNode, (n) => {
  localState.value = { ...(n?.data.config ?? {}) }
  localState.error = null
  localState.valid = true
}, { immediate: true })

function tryValidate() {
  if (!schemaEntry.value) {
    localState.valid = true
    localState.error = null
    return
  }
  const err = schemaEntry.value.validate?.(localState.value) ?? null
  localState.valid = !err
  localState.error = err
}

watch(() => localState.value, () => tryValidate(), { deep: true })

function save() {
  if (!selectedNode.value || !localState.valid) return
  store.updateNode(selectedNode.value.id, (node) => {
    node.data.config = { ...localState.value }
  })
}
</script>

<template>
  <div class="h-full w-full">
    <div v-if="!selectedNode" class="p-4 text-sm text-ink-500">Select a node to configure</div>
    <div v-else class="h-full">
      <div class="p-3 border-b border-ink-100">
        <div class="text-sm font-semibold">{{ selectedNode.data.label }}</div>
        <div class="text-xs text-ink-500">{{ schemaEntry?.title }}</div>
      </div>

      <div class="p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-12rem)]">
        <div v-for="field in schemaEntry?.fields ?? []" :key="field.name">
          <template v-if="field.type === 'text' || field.type === 'email' || field.type === 'url' || field.type === 'number'">
            <label class="label">{{ field.label }}</label>
            <input
              class="input"
              :type="field.type === 'number' ? 'number' : (field.type === 'email' ? 'email' : (field.type === 'url' ? 'url' : 'text'))"
              v-model="localState.value[field.name]"
              :placeholder="field.placeholder"
            />
            <p v-if="field.helper" class="mt-1 text-xs text-ink-500">{{ field.helper }}</p>
          </template>

          <template v-else-if="field.type === 'textarea'">
            <label class="label">{{ field.label }}</label>
            <textarea class="input h-28" v-model="localState.value[field.name]" :placeholder="field.placeholder" />
            <p v-if="field.helper" class="mt-1 text-xs text-ink-500">{{ field.helper }}</p>
          </template>

          <template v-else-if="field.type === 'select'">
            <label class="label">{{ field.label }}</label>
            <select class="input" v-model="localState.value[field.name]">
              <option v-for="opt in field.options" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </template>

          <template v-else-if="field.type === 'json'">
            <label class="label">{{ field.label }}</label>
            <textarea
              class="input h-24 font-mono"
              :value="JSON.stringify(localState.value[field.name] ?? {}, null, 2)"
              @input="(e: any) => {
                try {
                  localState.value[field.name] = JSON.parse(e.target.value || '{}')
                } catch {}
              }"
            />
            <p v-if="field.helper" class="mt-1 text-xs text-ink-500">{{ field.helper }}</p>
          </template>
        </div>
      </div>

      <div class="p-3 border-t border-ink-100 flex items-center justify-between">
        <div v-if="!localState.valid" class="text-sm text-danger-500">
          {{ localState.error }}
        </div>
        <button class="btn btn-primary ml-auto disabled:opacity-50" :disabled="!localState.valid" @click="save">
          Save
        </button>
      </div>
    </div>
  </div>
</template>
