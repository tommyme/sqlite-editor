# SQLite Editor — 架构文档

## 技术栈

| 层次 | 技术 | 版本 | 用途 |
|------|------|------|------|
| UI 框架 | React | 19.2 | 组件化视图层 |
| 构建工具 | Vite | 7.1 | 开发服务器 + 生产打包 |
| 语言 | TypeScript | 5.6 | 类型安全 |
| 样式 | Tailwind CSS | 4.1 | 原子化 CSS |
| 组件库 | shadcn/ui (Radix UI) | — | 无障碍基础组件 |
| SQLite 引擎 | sql.js (WASM) | — | 浏览器端纯内存 SQLite |
| SQL 编辑器 | CodeMirror | 6.x | 代码编辑器 |
| 虚拟滚动 | TanStack Virtual | 3.13 | 大表格性能渲染 |
| 路由 | wouter | 3.7 | 轻量客户端路由 |
| 包管理器 | pnpm | 10.4 | 依赖管理 |
| 部署 | Vercel | — | 静态站点托管 |
| CI/CD | GitHub Actions | — | 自动构建与部署 |

---

## 目录结构

```
sqlite-editor/
├── client/                      # 前端应用（唯一部署产物）
│   ├── index.html               # HTML 入口
│   └── src/
│       ├── main.tsx             # React 挂载点
│       ├── App.tsx              # 根组件（路由 + 主题 + 错误边界）
│       ├── index.css            # 全局样式 + 自定义滚动条
│       ├── pages/
│       │   ├── Home.tsx         # 主编辑器页面（核心业务）
│       │   └── NotFound.tsx     # 404 页面
│       ├── components/
│       │   ├── Toolbar.tsx      # 顶部工具栏
│       │   ├── TableTree.tsx    # 左侧表导航
│       │   ├── DataTable.tsx    # 数据表格（含单元格编辑）
│       │   ├── SqlEditor.tsx    # SQL 编辑器
│       │   ├── ResultPanel.tsx  # 查询结果面板
│       │   ├── CommandPalette.tsx # 命令面板（Cmd+K）
│       │   ├── RecentFiles.tsx  # 最近文件列表
│       │   └── ui/              # shadcn/ui 基础组件（55 个）
│       ├── hooks/
│       │   ├── useDatabase.ts   # 多数据库状态管理
│       │   ├── useVirtualTable.ts # 表格数据 + 分页 + 类型推断
│       │   ├── useSqlQuery.ts   # SQL 执行状态
│       │   └── useComposition.ts # IME 输入法处理
│       ├── lib/
│       │   ├── sqliteEngine.ts  # sql.js 封装（核心引擎）
│       │   └── localStorage.ts  # 最近文件 + 查询历史持久化
│       └── contexts/
│           └── ThemeContext.tsx  # 明/暗主题
├── server/
│   └── index.ts                 # Express 静态文件服务（本地预览用）
├── shared/
│   └── const.ts                 # 前后端共享常量
├── public/
│   └── sql-wasm.wasm            # SQLite WASM 二进制
├── .github/workflows/
│   └── deploy.yml               # CI/CD 流水线
├── vercel.json                  # Vercel 部署配置
└── vite.config.ts               # Vite 配置
```

---

## 模块关系图

```
┌─────────────────────────────────────────────────────────┐
│                      Home.tsx (协调层)                    │
│  持有: fileInputRef, handleOpenClick, handleExport        │
│  串联所有子模块                                           │
└────────┬──────────┬──────────┬──────────┬───────────────┘
         │          │          │          │
         ▼          ▼          ▼          ▼
    Toolbar    TableTree   DataTable  SqlEditor
    工具栏      表导航       数据表格    SQL编辑器
         │          │          │          │
         │          │          │          ▼
         │          │          │      ResultPanel
         │          │          │       结果面板
         │          │          │
         ▼          ▼          ▼
┌─────────────────────────────────────────────────────────┐
│                        Hooks 层                           │
│  useDatabase   useVirtualTable   useSqlQuery             │
│  (多DB状态)     (表格数据+分页)    (SQL执行)               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│               sqliteEngine.ts (引擎层)                    │
│  Map<id, DbEntry>  →  sql.js (WASM SQLite)               │
│  openDatabase / saveDatabase / executeQuery              │
│  getTableData / updateCell / closeDatabase               │
└─────────────────────────────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
   File System            localStorage
  Access API              (最近文件/
  (自动保存)               查询历史)
```

---

## 核心数据流

### 1. 打开数据库

```
用户点击 "Open Database"
  → handleOpenClick() [Home.tsx]
      → showOpenFilePicker()          # 浏览器原生文件选择器
      → requestPermission({mode:'readwrite'})  # 申请写权限
      → handleFileOpen(file, handle)
          → useDatabase.openDatabase()
              → sqliteEngine.openDatabase()
                  → sql.js new Database(buffer)
                  → databases.set(id, {db, fileName, fileHandle})
              → sqliteEngine.getTables()
              → setState({tabs, activeId})
```

### 2. 浏览表数据

```
用户点击表名 (TableTree)
  → database.selectTable(name)
      → setState({currentTable: name})
          → useVirtualTable 重新触发 loadTableData()
              → sqliteEngine.getTableData(table, 1000, 0)
                  → SELECT rowid, * FROM `table` LIMIT 1000
              → inferColumnTypes()   # 抽样推断 DATE/TIME/DATETIME
              → setData({columns, columnTypes, values, rowids, total})
                  → DataTable 渲染
```

### 3. 单元格编辑 + 自动保存

```
用户双击单元格 (DataTable)
  → startEdit()
  → 根据 columnType 渲染对应编辑器
      → TEXT      → TextCellEditor
      → DATE      → DateCellEditor (日历)
      → DATETIME  → DatetimeCellEditor (日历+时间)
      → TIME      → TimeCellEditor (时间输入)

用户确认 (Enter / blur)
  → commitEdit()
      → onCellUpdate(rowIndex, colName, value)
          → useVirtualTable.updateCell()
              → sqliteEngine.updateCell(table, rowid, col, val)
                  → UPDATE `table` SET `col` = ? WHERE rowid = ?
              → setData() 乐观更新本地状态
              → sqliteEngine.saveDatabase()
                  → fileHandle.createWritable()
                  → writable.write(db.export().buffer)
                  → toast.success('Saved')
```

### 4. SQL 查询执行

```
用户在 SqlEditor 输入 SQL → 点击 Execute
  → handleExecuteQuery(sql) [Home.tsx]
      → useSqlQuery.executeQuery(sql)
          → sqliteEngine.executeQuery(sql)
              → db.exec(sql)
          → 记录执行时间 (performance.now)
          → saveQueryHistory() → localStorage
          → setResult({columns, values, executionTime, rowCount})
              → ResultPanel 展示
```

---

## 关键设计决策

### 纯前端架构
整个应用是纯静态 SPA，无后端 API。SQLite 通过 sql.js（WASM 编译）在浏览器内存中运行。`server/index.ts` 仅用于本地 `pnpm dev` 时提供静态文件服务，生产部署由 Vercel 直接处理。

### 多数据库支持
`sqliteEngine.ts` 使用 `Map<string, DbEntry>` 存储多个同时打开的数据库，每个数据库有唯一 nanoid 作为 key。所有查询函数通过 `getActiveDb()` 隐式操作当前激活的数据库，切换数据库只需调用 `setActiveDatabase(id)`。

### File System Access API + 降级策略
- **Chrome/Edge**：`showOpenFilePicker()` → 返回 `FileSystemFileHandle` → 调用 `requestPermission({mode:'readwrite'})` 在用户手势期间获取写权限 → `createWritable()` 实现自动保存
- **Firefox/Safari**：降级到 `<input type="file">` → 无 fileHandle → `canAutoSave=false` → 提示用户使用 Export 手动下载

### 列类型推断
sql.js 不暴露 SQLite 的运行时值类型。对于声明为 `TEXT` 或无类型的列，`inferColumnTypes()` 抽取前 5 个非 NULL 值，通过正则匹配推断是否为 `DATETIME`/`DATE`/`TIME`，从而为该列选择合适的编辑器。

### rowid 追踪
`getTableData()` 执行 `SELECT rowid, * FROM table`，将 rowid 单独存入 `rowids[]` 数组（不展示给用户）。`updateCell()` 用 `WHERE rowid = ?` 精确定位行，避免多列主键或 NULL 值导致的歧义。

### 乐观更新
`updateCell()` 先调用 `sqliteEngine.updateCell()`（同步），再立即更新本地 React 状态（乐观），最后异步执行 `saveDatabase()`（写文件）。UI 不阻塞等待文件 I/O，体验更流畅。

---

## CI/CD 流水线

```
代码推送到 GitHub
        │
        ▼
GitHub Actions (.github/workflows/deploy.yml)
    ├── pnpm install
    ├── pnpm run build:client    → dist/public/
    └── vercel deploy
            ├── PR → preview 环境
            └── push/dispatch to main → production 环境

vercel.json:
  buildCommand:   pnpm run build:client
  outputDirectory: dist/public
  rewrites: /* → /index.html   (SPA 路由支持)
```
