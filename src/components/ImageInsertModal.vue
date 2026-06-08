<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { X, ImageIcon, Link, Upload, Loader2 } from 'lucide-vue-next'
import { useImageManager } from '@/composables/useImageManager'

const emit = defineEmits<{
  (e: 'insert', syntax: string): void
  (e: 'close'): void
}>()

type Tab = 'url' | 'file'

const activeTab = ref<Tab>('url')
const urlInput = ref('')
const altInput = ref('')
const isDragging = ref(false)
const isLoading = ref(false)
const errorMsg = ref('')
const fileInputEl = ref<HTMLInputElement | null>(null)

const { handleImageFile } = useImageManager()

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

function insertURL() {
  const url = urlInput.value.trim()
  if (!url) { errorMsg.value = '请输入图片地址'; return }
  const alt = altInput.value.trim() || 'image'
  emit('insert', `![${alt}](${url})`)
  emit('close')
}

async function processFile(file: File) {
  if (!file.type.startsWith('image/')) { errorMsg.value = '请选择图片文件'; return }
  errorMsg.value = ''
  isLoading.value = true
  try {
    const syntax = await handleImageFile(file)
    const userAlt = altInput.value.trim()
    emit('insert', userAlt ? syntax.replace(/^!\[[^\]]*\]/, `![${userAlt}]`) : syntax)
    emit('close')
  } catch (err) {
    errorMsg.value = String(err)
  } finally {
    isLoading.value = false
  }
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) processFile(file)
}

function onDropZone(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) processFile(file)
}

function onPasteInZone(e: ClipboardEvent) {
  const items = Array.from(e.clipboardData?.items ?? [])
  const imageItem = items.find(i => i.type.startsWith('image/'))
  if (!imageItem) return
  e.preventDefault()
  const file = imageItem.getAsFile()
  if (file) processFile(file)
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[9990] flex items-center justify-center p-4"
      @click.self="emit('close')"
    >
      <div class="w-full max-w-md bg-background rounded-xl border border-border shadow-[0_8px_40px_rgba(0,0,0,0.12)] overflow-hidden">

        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ImageIcon :size="15" class="text-muted-foreground" />
            插入图片
          </div>
          <button
            class="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            @click="emit('close')"
          >
            <X :size="15" />
          </button>
        </div>

        <!-- Tabs -->
        <div class="flex border-b border-border">
          <button
            class="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors"
            :class="activeTab === 'url'
              ? 'text-foreground border-b-2 border-foreground'
              : 'text-muted-foreground hover:text-foreground'"
            @click="activeTab = 'url'; errorMsg = ''"
          >
            <Link :size="12" />
            图片链接
          </button>
          <button
            class="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors"
            :class="activeTab === 'file'
              ? 'text-foreground border-b-2 border-foreground'
              : 'text-muted-foreground hover:text-foreground'"
            @click="activeTab = 'file'; errorMsg = ''"
          >
            <Upload :size="12" />
            本地上传
          </button>
        </div>

        <div class="p-5 space-y-4">

          <!-- URL tab -->
          <template v-if="activeTab === 'url'">
            <div class="space-y-2">
              <label class="text-xs text-muted-foreground">图片 URL</label>
              <input
                v-model="urlInput"
                class="w-full px-3 py-2 text-sm rounded-lg border border-border bg-muted/40
                       focus:outline-none focus:ring-1 focus:ring-foreground/30 focus:border-foreground/50
                       placeholder:text-muted-foreground/40"
                placeholder="https://example.com/image.jpg"
                autofocus
                @keydown.enter="insertURL"
              />
            </div>

            <div class="space-y-2">
              <label class="text-xs text-muted-foreground">替代文字（可选）</label>
              <input
                v-model="altInput"
                class="w-full px-3 py-2 text-sm rounded-lg border border-border bg-muted/40
                       focus:outline-none focus:ring-1 focus:ring-foreground/30 focus:border-foreground/50
                       placeholder:text-muted-foreground/40"
                placeholder="图片描述"
                @keydown.enter="insertURL"
              />
            </div>

            <p v-if="errorMsg" class="text-xs text-destructive">{{ errorMsg }}</p>

            <div class="flex justify-end gap-2 pt-1">
              <button
                class="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-accent transition-colors text-foreground/70 hover:text-foreground"
                @click="emit('close')"
              >
                取消
              </button>
              <button
                class="px-4 py-1.5 text-sm rounded-lg bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
                @click="insertURL"
              >
                插入
              </button>
            </div>
          </template>

          <!-- File upload tab -->
          <template v-else>
            <div class="space-y-2">
              <label class="text-xs text-muted-foreground">替代文字（可选）</label>
              <input
                v-model="altInput"
                class="w-full px-3 py-2 text-sm rounded-lg border border-border bg-muted/40
                       focus:outline-none focus:ring-1 focus:ring-foreground/30 focus:border-foreground/50
                       placeholder:text-muted-foreground/40"
                placeholder="图片描述"
              />
            </div>

            <!-- Drop zone -->
            <div
              class="relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed
                     transition-colors cursor-pointer py-10"
              :class="isDragging
                ? 'border-foreground/40 bg-muted/60'
                : 'border-border hover:border-foreground/20 hover:bg-muted/30'"
              @dragover.prevent="isDragging = true"
              @dragleave="isDragging = false"
              @drop.prevent="onDropZone"
              @paste="onPasteInZone"
              @click="fileInputEl?.click()"
            >
              <template v-if="isLoading">
                <Loader2 :size="26" class="text-muted-foreground animate-spin" />
                <p class="text-sm text-muted-foreground">正在处理图片…</p>
              </template>
              <template v-else>
                <ImageIcon :size="26" class="text-muted-foreground/30" />
                <div class="text-center">
                  <p class="text-sm text-foreground/70">拖拽图片到此处</p>
                  <p class="text-xs text-muted-foreground mt-1">或点击选择 · 支持粘贴 Ctrl+V</p>
                </div>
                <button
                  class="px-3 py-1 text-xs rounded-md border border-border bg-background hover:bg-accent transition-colors"
                  @click.stop="fileInputEl?.click()"
                >
                  浏览文件
                </button>
              </template>
              <input ref="fileInputEl" type="file" accept="image/*" class="hidden" @change="onFileChange" />
            </div>

            <p v-if="errorMsg" class="text-xs text-destructive">{{ errorMsg }}</p>
          </template>

        </div>
      </div>
    </div>
  </Teleport>
</template>
