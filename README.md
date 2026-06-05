# Carefree MD

Carefree MD 是一个基于 Vue 3 和 Vite 的轻量级 Markdown 编辑器，支持实时预览、代码高亮、任务列表、主题切换和本地文件系统访问。

## 主要功能

- 实时 Markdown 编辑预览
- 编辑 / 预览 / 分屏模式切换
- 内置代码高亮（`highlight.js`）
- 支持 Markdown 锚点链接和任务列表
- 文件侧边栏：浏览本地目录中的 Markdown / 文本文件
- 文件打开、保存、另存为
- IndexedDB 自动保存草稿
- 深色 / 浅色主题切换

## 技术栈

- Vue 3
- Vite
- TypeScript
- Pinia
- Tailwind CSS
- CodeMirror
- Markdown-it
- highlight.js

## 本地运行

```bash
npm install
npm run dev
```

然后打开浏览器访问 `http://localhost:5173`。

## 构建

```bash
npm run build
```

## 目录结构

- `src/` - 应用源码
  - `components/` - UI 组件
  - `composables/` - 组合函数逻辑
  - `stores/` - Pinia 状态管理
  - `types/` - 类型定义
  - `assets/` - 全局样式和资源
- `public/` - 静态资源

## 代码说明

- `src/App.vue` - 主应用入口，负责布局、侧边栏与编辑/预览视图切换
- `src/stores/editor.ts` - 编辑器状态管理，包括当前文件、模式、主题、脏状态等
- `src/composables/useFileSystem.ts` - 使用浏览器文件系统 API 打开目录/文件、保存文件
- `src/composables/useAutoSave.ts` - 自动保存当前草稿到 IndexedDB
- `src/composables/useMarkdown.ts` - Markdown 渲染逻辑，支持代码高亮、锚点和任务列表

## 适用场景

适合作为个人 Markdown 记录、技术文档编写、笔记应用的基础样例。

---

如果你想，我还可以继续帮你补全 `README` 中的使用截图、快捷键说明或功能演示部分。