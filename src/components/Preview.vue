<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useMarkdown } from '@/composables/useMarkdown'

const store = useEditorStore()
const { render } = useMarkdown()
const scrollEl = ref<HTMLElement | null>(null)

const rendered = computed(() => render(store.content))

defineExpose({ scrollEl })
</script>

<template>
  <div
    ref="scrollEl"
    class="h-full overflow-y-auto bg-background"
  >
    <div
      class="markdown-body"
      v-html="rendered"
    />
  </div>
</template>
