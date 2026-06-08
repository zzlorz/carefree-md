<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

const emit = defineEmits<{ (e: 'select', lang: string): void }>()

const open = ref(false)
const customLang = ref('')
const btnEl = ref<HTMLElement | null>(null)
const dropdownEl = ref<HTMLElement | null>(null)
const dropdownStyle = ref({ top: '0px', left: '0px' })

const LANGS = [
  'js', 'ts', 'jsx', 'tsx',
  'python', 'go', 'rust', 'java',
  'c', 'cpp', 'cs', 'php',
  'html', 'css', 'scss', 'json',
  'yaml', 'toml', 'sql', 'shell',
  'bash', 'powershell', 'markdown', 'plain',
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

function pick(lang: string) {
  emit('select', lang === 'plain' ? '' : lang)
  open.value = false
  customLang.value = ''
}

function submitCustom() {
  const lang = customLang.value.trim()
  if (lang) emit('select', lang)
  open.value = false
  customLang.value = ''
}

function onClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (
    btnEl.value?.contains(target) ||
    dropdownEl.value?.contains(target)
  ) return
  open.value = false
}

onMounted(() => document.addEventListener('mousedown', onClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside))
</script>

<template>
  <div ref="btnEl">
    <button
      class="toolbar-btn flex items-center gap-0.5"
      title="插入代码块"
      @mousedown.prevent
      @click="toggle"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="3" width="14" height="10" rx="2"/>
        <path d="M5 6l-2 2 2 2M11 6l2 2-2 2"/>
        <path d="M7 10l2-4" stroke-width="1.3"/>
      </svg>
      <ChevronDown :size="10" class="opacity-60" />
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="dropdownEl"
        class="fixed z-[9999] w-56 rounded-lg border border-border bg-background shadow-xl p-2"
        :style="dropdownStyle"
      >
        <!-- Custom input -->
        <form class="flex gap-1.5 mb-2" @submit.prevent="submitCustom">
          <input
            v-model="customLang"
            class="flex-1 text-xs px-2 py-1 rounded border border-border bg-muted/60
                   focus:outline-none focus:ring-1 focus:ring-foreground/30 placeholder:text-muted-foreground/40"
            placeholder="自定义语言…"
            autofocus
          />
          <button
            type="submit"
            class="text-xs px-2 py-1 rounded bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            插入
          </button>
        </form>

        <!-- Language grid -->
        <div class="grid grid-cols-4 gap-1">
          <button
            v-for="lang in LANGS"
            :key="lang"
            class="text-[11px] px-1.5 py-1 rounded text-center font-mono
                   text-muted-foreground hover:text-foreground hover:bg-accent transition-colors truncate"
            @click="pick(lang)"
          >
            {{ lang }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.toolbar-btn {
  @apply p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors;
}
</style>
