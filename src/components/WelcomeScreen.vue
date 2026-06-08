<script setup lang="ts">
import { FileText, FolderOpen, FilePlus } from 'lucide-vue-next'
import { useFileSystem } from '@/composables/useFileSystem'

const fs = useFileSystem()
</script>

<template>
  <div class="flex flex-col items-center justify-center h-full gap-6 select-none">
    <!-- Logo -->
    <div class="flex flex-col items-center gap-2">
      <div class="w-12 h-12 rounded-2xl bg-foreground flex items-center justify-center shadow-md">
        <FileText :size="24" class="text-white" />
      </div>
      <h1 class="text-lg font-semibold text-foreground tracking-tight">Carefree MD</h1>
    </div>

    <!-- Actions -->
    <div class="flex flex-col gap-2 w-56">
      <button class="welcome-btn" @click="fs.newFile()">
        <FilePlus :size="16" class="text-muted-foreground shrink-0" />
        <span class="text-sm font-medium">新建草稿</span>
      </button>
      <button class="welcome-btn" @click="fs.openFile()">
        <FileText :size="16" class="text-muted-foreground shrink-0" />
        <span class="text-sm font-medium">打开文件</span>
      </button>
      <button class="welcome-btn" @click="fs.openDirectory()">
        <FolderOpen :size="16" class="text-muted-foreground shrink-0" />
        <span class="text-sm font-medium">打开文件夹</span>
      </button>
    </div>

    <!-- Shortcuts -->
    <p class="text-[11px] text-muted-foreground/50 text-center leading-relaxed">
      Ctrl+N 新建 · Ctrl+O 打开 · Ctrl+S 保存<br>
      Ctrl+1/2/3 切换模式 · Ctrl+\ 侧边栏
    </p>
  </div>
</template>

<style scoped>
.welcome-btn {
  @apply flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border
         bg-muted/40 hover:bg-accent transition-colors text-foreground;
}
</style>
