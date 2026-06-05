<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

const emit = defineEmits<{ (e: 'select', level: number): void }>()

const open = ref(false)
const btnEl = ref<HTMLElement | null>(null)
const dropdownEl = ref<HTMLElement | null>(null)
const dropdownStyle = ref({ top: '0px', left: '0px' })

const HEADINGS = [
  { level: 1, label: 'H1', desc: '一级标题' },
  { level: 2, label: 'H2', desc: '二级标题' },
  { level: 3, label: 'H3', desc: '三级标题' },
  { level: 4, label: 'H4', desc: '四级标题' },
  { level: 5, label: 'H5', desc: '五级标题' },
  { level: 6, label: 'H6', desc: '六级标题' },
]

async function toggle() {
  open.value = !open.value
  if (open.value) {
    await nextTick()
    if (btnEl.value) {
      const rect = btnEl.value.getBoundingClientRect()
      dropdownStyle.value = {
        top: `${rect.bottom + 4}px`,
        left: `${rect.left}px`,
      }
    }
  }
}

function pick(level: number) {
  emit('select', level)
  open.value = false
}

function onClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (btnEl.value?.contains(target) || dropdownEl.value?.contains(target)) return
  open.value = false
}

onMounted(() => document.addEventListener('mousedown', onClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside))
</script>

<template>
  <div ref="btnEl">
    <button
      class="toolbar-btn flex items-center gap-0.5"
      title="标题"
      @mousedown.prevent
      @click="toggle"
    >
      <span class="font-semibold text-[15px]">H</span>
      <ChevronDown :size="10" class="opacity-60" />
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="dropdownEl"
        class="fixed z-[9999] w-44 rounded-lg border border-border bg-background shadow-xl py-1 overflow-hidden"
        :style="dropdownStyle"
      >
        <button
          v-for="h in HEADINGS"
          :key="h.level"
          class="flex items-baseline gap-3 w-full px-3 py-1.5
                 hover:bg-accent transition-colors text-left"
          @click="pick(h.level)"
        >
          <span
            class="font-bold text-foreground shrink-0"
            :style="{ fontSize: `${1.15 - h.level * 0.1}rem` }"
          >{{ h.label }}</span>
          <span class="text-xs text-muted-foreground">{{ h.desc }}</span>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.toolbar-btn {
  @apply py-0.5 px-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0;
}
</style>
