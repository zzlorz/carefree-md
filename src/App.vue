<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useKeyboard } from '@/composables/useKeyboard'
import { useAutoSave } from '@/composables/useAutoSave'
import { useIDB } from '@/composables/useIDB'
import Toolbar from '@/components/Toolbar.vue'
import FormatBar from '@/components/FormatBar.vue'
import Sidebar from '@/components/Sidebar.vue'
import Editor from '@/components/Editor.vue'
import WysiwygEditor from '@/components/WysiwygEditor.vue'
import Preview from '@/components/Preview.vue'
import StatusBar from '@/components/StatusBar.vue'
import WelcomeScreen from '@/components/WelcomeScreen.vue'

const store = useEditorStore()
const idb = useIDB()
useKeyboard()
useAutoSave()

const showWelcome  = computed(() => !store.hasActiveFile)
const isWysiwyg    = computed(() => store.mode === 'wysiwyg')
const showEditor   = computed(() => store.mode === 'edit' || store.mode === 'split')
const showPreview  = computed(() => store.mode === 'preview' || store.mode === 'split')
const showFormatBar = computed(() => !showWelcome.value && showEditor.value)

onMounted(async () => {
  store.initTheme()
  document.title = store.title

  const all = await idb.refresh().then(() => idb.drafts.value)
  if (all.length > 0) {
    const latest = all[0]
    store.loadDraft(latest.id, latest.content, latest.customTitle ?? latest.title)
  }
})
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden bg-background text-foreground">
    <Toolbar />

    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <Transition name="sidebar">
        <div
          v-show="store.sidebarOpen"
          class="shrink-0 overflow-hidden"
          style="width: 240px"
        >
          <Sidebar />
        </div>
      </Transition>

      <!-- Editor/Preview area -->
      <main class="flex flex-col flex-1 overflow-hidden">

        <FormatBar v-if="showFormatBar" />

        <div class="flex flex-1 overflow-hidden">
          <WelcomeScreen v-if="showWelcome" class="flex-1" />

          <template v-else>
            <!-- WYSIWYG mode: Milkdown full-width -->
            <WysiwygEditor v-if="isWysiwyg" class="flex-1" />

            <!-- Edit / Split / Preview modes -->
            <template v-else>
              <div
                v-if="showEditor"
                class="flex flex-col overflow-hidden"
                :class="showPreview ? 'flex-1 border-r border-border' : 'flex-1'"
                style="min-width: 320px"
              >
                <Editor />
              </div>
              <div
                v-if="showPreview"
                class="flex-1 overflow-hidden"
              >
                <Preview />
              </div>
            </template>
          </template>
        </div>
      </main>
    </div>

    <StatusBar />
  </div>
</template>
