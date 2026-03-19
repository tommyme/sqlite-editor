# SQLite Editor - Design Direction

## 选定设计方案：Engineering Workspace

### 设计理念
采用**工程工作台**风格，借鉴 GitHub 和 Notion 的设计语言，强调：
- **信息密度优先** — 像 IDE 一样高效利用空间，但保持呼吸感
- **层次分明的灰度系统** — 用微妙的灰度差异区分层级，而非强烈色彩
- **功能即装饰** — 每个视觉元素都服务于功能
- **渐进式复杂度** — 初始界面简洁，随操作深入逐步展现复杂功能

### 色彩系统
- **基底**：冷灰色调（亮色 #ffffff / 暗色 #0d1117）
- **强调色**：单一蓝色 (#2f81f7) 标记可交互元素和状态变化
- **语义色**：成功/警告/错误用标准语义色彩
- **整体**：克制、专业、高效

### 布局结构
**三栏式工作台布局**：
- **左侧窄栏**：表/结构导航树（可折叠）
- **中间主区域**：数据表格/SQL 编辑器（Tab 切换）
- **底部面板**：查询结果/日志（可折叠）

### 字体系统
- **标题/导航**：Inter 600 weight
- **数据内容**：JetBrains Mono / Fira Code（等宽字体）400 weight
- **辅助文字**：系统字体栈 400 weight

### 交互原则
- 快捷键驱动（Cmd+K 命令面板、双击编辑、Tab 切换）
- 右键菜单丰富
- 拖拽调整列宽
- 追求最短操作路径

### 动画原则
- 极度克制 — 仅在面板展开/折叠、Tab 切换时使用 150ms ease-out 过渡
- 数据加载使用骨架屏而非 spinner

## 项目结构
- 纯前端项目，使用 React 19 + Tailwind 4 + TypeScript
- sql.js 用于浏览器端 SQLite 执行
- CodeMirror 6 用于 SQL 编辑器
- @tanstack/react-virtual 用于虚拟滚动
- shadcn/ui 用于基础组件

## 技术栈
- sql.js（WASM SQLite）
- CodeMirror 6（SQL 编辑器）
- @tanstack/react-virtual（虚拟滚动）
- React 19 + Tailwind 4
- shadcn/ui
