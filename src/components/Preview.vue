<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useMarkdown } from '@/composables/useMarkdown'

const store = useEditorStore()
const { render } = useMarkdown()
const scrollEl = ref<HTMLElement | null>(null)

const rendered = computed(() => render(store.content))

// Track preview scroll
let ignorePreviewScroll = false
function onScroll() {
  if (!scrollEl.value || ignorePreviewScroll) return
  const el = scrollEl.value
  const ratio = el.scrollHeight > el.clientHeight
    ? el.scrollTop / (el.scrollHeight - el.clientHeight)
    : 0
  store.previewScrollRatio = ratio
}

onMounted(() => scrollEl.value?.addEventListener('scroll', onScroll))
onUnmounted(() => scrollEl.value?.removeEventListener('scroll', onScroll))

// Sync scroll from editor to preview
watch(
  () => store.editorScrollRatio,
  (ratio) => {
    if (!scrollEl.value || ignorePreviewScroll) return
    const el = scrollEl.value
    if (el.scrollHeight > el.clientHeight) {
      ignorePreviewScroll = true
      el.scrollTop = ratio * (el.scrollHeight - el.clientHeight)
      setTimeout(() => { ignorePreviewScroll = false }, 50)
    }
  }
)

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
