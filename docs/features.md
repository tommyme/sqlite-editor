# SQLite Editor — 功能文档

## 功能概览

| 功能模块 | 描述 |
|----------|------|
| 多数据库管理 | 同时打开多个 .sqlite 文件，标签页切换 |
| 数据浏览 | 虚拟滚动表格，支持千万行数据流畅浏览 |
| 单元格编辑 | 双击内联编辑，类型感知编辑器，自动保存 |
| SQL 编辑器 | 语法高亮、自动补全、执行结果展示 |
| 命令面板 | Cmd+K 快速导航和操作 |
| 文件导出 | 自动保存到源文件 / 手动下载 |
| 最近文件 | 历史记录，快速重新打开 |

---

## 模块功能详情

### 工具栏 (Toolbar)

位置：页面顶部固定区域

**Open Database**
- 点击按钮，弹出系统原生文件选择框
- 支持文件类型：`.sqlite`、`.db`、`.sqlite3`
- Chrome/Edge：使用 File System Access API，打开后自动获取写权限（支持自动保存）
- Firefox/Safari：使用 `<input type="file">` 降级方案（仅支持手动 Export）

**文件名显示**
- 打开数据库后，工具栏中央显示当前活跃数据库的文件名

**Export**
- 优先尝试写回源文件（Chrome/Edge，使用 File System Access API）
- 若无写权限（Firefox/Safari 或用文件 input 打开），则触发浏览器下载
- 成功提示：`Saved to original file` / `Database downloaded`

**Close**
- 关闭当前活跃数据库，自动切换到上一个打开的数据库
- 若关闭最后一个，返回空白欢迎页

---

### 数据库标签页 (DB Tabs)

位置：工具栏下方，仅在有数据库打开时显示

- 每个打开的数据库对应一个标签
- 点击标签切换活跃数据库，表格和 SQL 查询随之更新
- 标签显示文件名（最长 140px，超出截断）
- hover 后显示 × 关闭按钮，点击关闭该数据库

---

### 表导航 (TableTree)

位置：三栏布局左侧面板（默认宽度 20%，可拖拽）

**表列表**
- 列出当前数据库所有用户表（排除 `sqlite_` 系统表）
- 显示每个表的行数
- 点击表名，右侧数据面板即时加载该表数据

**搜索**
- 顶部搜索框实时过滤表名

**列信息**
- 点击展开表，显示所有列名及其 SQLite 声明类型（INTEGER、TEXT、REAL 等）

---

### 数据表格 (DataTable)

位置：中间面板 → Data 标签页

**数据展示**
- 虚拟滚动渲染（TanStack Virtual），无论多少行都保持流畅
- 每次加载 1000 行（PAGE_SIZE）
- 表头固定，支持横向滚动
- 显示总行数

**列类型推断**
对 `TEXT` 或未声明类型的列，自动抽样前 5 个非 NULL 值做正则匹配：

| 匹配模式 | 推断类型 | 编辑器 |
|----------|----------|--------|
| `YYYY-MM-DD HH:MM...` | DATETIME | 日历 + 时间输入 |
| `YYYY-MM-DD` | DATE | 日历选择器 |
| `HH:MM[:SS]` | TIME | 时间输入框 |
| 其他 | TEXT/原声明类型 | 文本输入框 |

**单元格编辑**
- **双击**单元格进入编辑模式
- **Enter** 或失焦确认，写入数据库 + 触发自动保存
- **Escape** 取消编辑，恢复原值
- NULL 值以灰色斜体 `null` 显示，编辑后输入空字符串可置回 NULL

**类型感知编辑器**

| 类型 | 编辑器 | 交互 |
|------|--------|------|
| TEXT / 其他 | 文本输入框 | 直接键入 |
| INTEGER / REAL | 文本输入框 | 数字校验 |
| DATE | 日历弹窗 | 点击日期选择 |
| DATETIME | 日历 + 时间输入弹窗 | 选日期 + 输入时间 |
| TIME | 时间输入弹窗 | `HH:MM:SS` 格式 |

**自动保存**
- 编辑确认后，自动将整个数据库写回源文件（需 Chrome/Edge 且通过 Open Database 打开）
- 成功显示 `Saved` toast
- 若无写权限，显示一次性提示 `Changes are in memory only — use Export to save to file`

---

### SQL 编辑器 (SqlEditor)

位置：中间面板 → SQL 标签页

**编辑器功能**
- CodeMirror 6 驱动，SQL 语法高亮
- 自动补全（关键字、表名提示）
- 括号自动匹配
- 行号、代码折叠
- 撤销/重做历史

**执行**
- 点击 **Execute** 按钮 或 `Ctrl+Enter`（macOS：`Cmd+Enter`）执行
- 结果显示在右侧结果面板
- 支持多条语句（取最后一条 SELECT 结果展示）

**Clear**
- 清空编辑器内容

**查询历史**
- 每次执行后自动保存到 localStorage，最多保留 50 条
- 去重处理（相同 SQL 只保留最新一次）

---

### 结果面板 (ResultPanel)

位置：三栏布局右侧面板（默认宽度 20%，可折叠）

- 显示 SQL 查询的返回结果，复用 DataTable 组件渲染
- 顶部展示：执行时间（ms）、返回行数
- 错误时显示红色错误信息
- 可折叠/展开（点击标题区域）

---

### 命令面板 (CommandPalette)

触发：`Cmd+K`（macOS）/ `Ctrl+K`（Windows/Linux）

**可用命令**
- 搜索并跳转到任意表
- Export — 保存/导出数据库
- Refresh Tables — 刷新表列表（执行 DDL 后使用）

---

## 数据持久化

### 自动保存（File System Access API）
- 适用于：Chrome 86+、Edge 86+
- 条件：通过工具栏 Open Database 按钮打开，且在弹出授权时选择允许写入
- 时机：每次单元格编辑确认后立即保存

### 手动导出（Export 按钮）
- 适用于：所有浏览器
- Chrome/Edge（已获写权限）：写回原文件路径
- Firefox/Safari：触发浏览器下载，文件名与原文件相同

### localStorage 持久化
- **最近文件**：文件名、大小、最近打开时间，最多保留 10 条
- **查询历史**：SQL 文本 + 时间戳，最多保留 50 条

---

## 键盘快捷键

| 快捷键 | 操作 |
|--------|------|
| `Cmd/Ctrl + K` | 打开命令面板 |
| `Cmd/Ctrl + Enter` | 执行 SQL（在 SQL 编辑器内） |
| `Enter` | 确认单元格编辑 |
| `Escape` | 取消单元格编辑 / 关闭命令面板 |
| `Double Click` | 进入单元格编辑模式 |

---

## 浏览器兼容性

| 浏览器 | 文件打开 | 自动保存 | 备注 |
|--------|----------|----------|------|
| Chrome 86+ | ✅ showOpenFilePicker | ✅ | 推荐 |
| Edge 86+ | ✅ showOpenFilePicker | ✅ | 推荐 |
| Firefox | ✅ input fallback | ❌ | 需手动 Export |
| Safari | ✅ input fallback | ❌ | 需手动 Export |
