<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

const emit = defineEmits<{ (e: 'select', emoji: string): void }>()

const open = ref(false)
const search = ref('')
const btnEl = ref<HTMLElement | null>(null)
const dropdownEl = ref<HTMLElement | null>(null)
const dropdownStyle = ref({ top: '0px', left: '0px' })

const CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: '常用',
    emojis: ['😀','😂','🥹','😍','🤔','😎','🥳','😭','🫡','🤩','😅','🫠','😇','🤣','🥰'],
  },
  {
    label: '手势',
    emojis: ['👍','👎','👏','🙌','🤝','🫶','✌️','🤟','💪','🫵','👀','🙏','🤙','☝️','👌'],
  },
  {
    label: '自然',
    emojis: ['🌟','⭐','✨','🔥','💧','🌊','🌈','☀️','🌙','⚡','❄️','🌸','🍀','🌺','🌻'],
  },
  {
    label: '食物',
    emojis: ['🍕','🍔','🍜','🍣','🍦','🎂','☕','🧋','🍺','🥂','🍓','🍎','🥑','🧁','🍩'],
  },
  {
    label: '符号',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','❗','❓','✅','❌','⚠️','💯'],
  },
  {
    label: '物品',
    emojis: ['💡','🔑','📌','📎','✏️','📝','📖','💻','📱','🎵','🎉','🎯','🏆','🚀','💎'],
  },
]

const filtered = computed(() => {
  const q = search.value.trim()
  if (!q) return CATEGORIES
  const allEmojis = CATEGORIES.flatMap(c => c.emojis).filter(e => e.includes(q))
  return allEmojis.length ? [{ label: '搜索结果', emojis: allEmojis }] : []
})

async function toggle() {
  open.value = !open.value
  if (open.value) {
    await nextTick()
    const rect = btnEl.value?.getBoundingClientRect()
    if (rect) {
      dropdownStyle.value = {
        top: `${rect.bottom + 4}px`,
        left: `${rect.left}px`,
      }
    }
    await nextTick()
    const input = dropdownEl.value?.querySelector('input')
    input?.focus()
  } else {
    search.value = ''
  }
}

function pick(emoji: string) {
  emit('select', emoji)
  open.value = false
  search.value = ''
}

function onClickOutside(e: MouseEvent) {
  const t = e.target as Node
  if (btnEl.value?.contains(t) || dropdownEl.value?.contains(t)) return
  open.value = false
  search.value = ''
}

onMounted(() => document.addEventListener('mousedown', onClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside))
</script>

<template>
  <div ref="btnEl">
    <button
      class="fmt-btn"
      title="插入表情"
      @mousedown.prevent
      @click="toggle"
    >
      😊
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="dropdownEl"
        class="fixed z-[9999] w-72 rounded-xl border border-border bg-background shadow-xl overflow-hidden"
        :style="dropdownStyle"
      >
        <!-- Search -->
        <div class="px-3 pt-3 pb-2">
          <input
            v-model="search"
            class="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border bg-muted/60
                   focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-muted-foreground/50"
            placeholder="搜索表情…"
          />
        </div>

        <!-- Categories -->
        <div class="overflow-y-auto max-h-64 px-2 pb-2">
          <template v-for="cat in filtered" :key="cat.label">
            <p class="text-[10px] text-muted-foreground uppercase tracking-wider px-1 py-1.5">
              {{ cat.label }}
            </p>
            <div class="grid grid-cols-8 gap-0.5">
              <button
                v-for="emoji in cat.emojis"
                :key="emoji"
                class="flex items-center justify-center h-8 w-8 rounded-lg text-lg
                       hover:bg-accent transition-colors"
                @click="pick(emoji)"
              >
                {{ emoji }}
              </button>
            </div>
          </template>

          <div v-if="filtered.length === 0" class="py-6 text-center text-xs text-muted-foreground">
            没有找到相关表情
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.fmt-btn {
  @apply p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0 text-base leading-none;
}
</style>
