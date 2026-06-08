<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useMarkdown } from '@/composables/useMarkdown'
import { useImageManager } from '@/composables/useImageManager'

const store = useEditorStore()
const { resolveSrc, blobCache } = useImageManager()
const { render } = useMarkdown(resolveSrc)
const scrollEl = ref<HTMLElement | null>(null)

const rendered = computed(() => {
  // Reading blobCache.size as a reactive dependency:
  // any time an image is added/removed from the cache, this recomputes.
  void blobCache.size
  return render(store.content)
})

// ── Sync scroll from editor ──────────────────────────────────────────────────
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
