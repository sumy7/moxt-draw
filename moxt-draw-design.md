## Moxt Draw — 实现规格文档

> 本文档是交付给实现 agent 的完整规格，涵盖架构、API、数据格式、交互逻辑和目录结构，可直接照此实现。

---

### 一、项目概述

一个基于 Excalidraw 的画板 miniapp，运行在 Moxt 工作区内，画板文件以 `.excalidraw` 格式存储到工作区文件系统（personal/team 两个空间），同时支持脱离 Moxt 环境在纯浏览器中运行（数据存储到 OPFS）。

**技术栈**：React 19、TypeScript、Excalidraw、Tailwind CSS v4、Rsbuild

---

### 二、文件存储规则

#### 2.1 Moxt 环境路径

每个画板对应两个文件，存放在同一目录下：

```
/personal/drawings/设计稿.excalidraw
/personal/drawings/~设计稿.excalidraw.meta.json

/team/drawings/架构图.excalidraw
/team/drawings/~架构图.excalidraw.meta.json
```

- 画板内容文件：`[名称].excalidraw`，存储 Excalidraw JSON
- 元数据文件：`~[画板文件名].meta.json`，`~` 前缀方便过滤，紧跟对应画板

#### 2.2 OPFS 环境路径（脱离 Moxt 时）

```
drawings/
  设计稿.excalidraw
  ~设计稿.excalidraw.meta.json
  架构图.excalidraw
  ~架构图.excalidraw.meta.json
```

脱离 Moxt 时只有一个"本地"空间，`space` 字段固定为 `'local'`。

---

### 三、元数据格式

#### 3.1 JSON 结构

```json
{
  "file_path": "/personal/drawings/设计稿.excalidraw",
  "name": "设计稿",
  "space": "personal",
  "thumbnail": "data:image/png;base64,iVBORw0KGgo...",
  "created_at": "2026-06-01T10:00:00.000Z",
  "updated_at": "2026-06-01T12:30:00.000Z",
  "last_modified_by": { "email": "alice@example.com", "displayName": "Alice" },
  "last_opened_at": "2026-06-01T14:00:00.000Z",
  "last_opened_by": { "email": "bob@example.com", "displayName": "Bob" }
}
```

#### 3.2 字段说明

| 字段 | 类型 | 说明 |
| :- | :- | :- |
| `file_path` | `string` | 画板文件完整路径（OPFS 下为相对路径如 `drawings/xxx.excalidraw`） |
| `name` | `string` | 显示名，不含扩展名 |
| `space` | `'personal' \| 'team' \| 'local'` | 所属空间，OPFS 下为 `'local'` |
| `thumbnail` | `string \| null` | base64 PNG 缩略图 |
| `created_at` | ISO 8601 string | 创建时间，**首次写入后不再更新** |
| `updated_at` | ISO 8601 string | 最后保存时间 |
| `last_modified_by` | `Member \| null` | 最后修改的人，来自 `window.moxt.currentMember`，无法获取时为 `null` |
| `last_opened_at` | ISO 8601 string \| null | 最后打开时间 |
| `last_opened_by` | `Member \| null` | 最后打开的人 |

---

### 四、文件系统适配层（FsAdapter）

App 内所有文件操作必须通过 `FsAdapter` 接口进行，禁止直接调用 `api.fs` 或 OPFS API，由运行时自动选择后端。

#### 4.1 接口定义

```typescript
// src/services/fs/adapter.ts

export interface FsAdapter {
  /** 列出目录直接子项（文件名，不含路径），目录不存在时返回空数组 */
  listDir(path: string): Promise<string[]>
  /** 读取文件内容，文件不存在时返回 null */
  read(path: string): Promise<string | null>
  /** 写入文件，父目录不存在时自动创建，成功返回 true */
  write(path: string, content: string): Promise<boolean>
  /** 删除文件，成功返回 true */
  remove(path: string): Promise<boolean>
  /** 移动/重命名文件，成功返回 true */
  move(from: string, to: string): Promise<boolean>
  /** 创建目录（含中间目录），已存在时幂等 */
  mkdir(path: string): Promise<void>
  /** 判断路径是否存在 */
  exists(path: string): Promise<boolean>
}
```

#### 4.2 工厂函数

```typescript
// src/services/fs/index.ts

export function createFsAdapter(): FsAdapter {
  if (typeof window !== 'undefined' && window.moxt?.fs) {
    return new MoxtFsAdapter()
  }
  return new OpfsFsAdapter()
}

// 单例，整个 app 共用
export const fs = createFsAdapter()
```

#### 4.3 MoxtFsAdapter 实现

对应 `window.moxt.fs` 的原始 API：

| `window.moxt.fs` 方法 | 签名 | 说明 |
| :- | :- | :- |
| `listDir(dirPath)` | `(path: string) => Promise<string[]>` | 返回直接子项名称列表 |
| `read(path)` | `(path: string) => Promise<string \| null>` | 读取文件文本内容 |
| `write(path, content)` | `(path: string, content: string) => Promise<boolean>` | 写入文本文件 |
| `remove(path)` | `(path: string) => Promise<boolean>` | 删除文件 |
| `move(oldPath, newPath)` | `(from: string, to: string) => Promise<boolean>` | 移动/重命名 |
| `mkdir(dirPath)` | `(path: string) => Promise<void>` | 创建目录 |
| `exists(path)` | `(path: string) => Promise<boolean>` | 判断是否存在 |

```typescript
class MoxtFsAdapter implements FsAdapter {
  private get api() { return window.moxt.fs }

  async listDir(path: string) {
    try { return await this.api.listDir(path) } catch { return [] }
  }
  async read(path: string) { return this.api.read(path) }
  async write(path: string, content: string) { return this.api.write(path, content) }
  async remove(path: string) { return this.api.remove(path) }
  async move(from: string, to: string) { return this.api.move(from, to) }
  async mkdir(path: string) { return this.api.mkdir(path) }
  async exists(path: string) { return this.api.exists(path) }
}
```

#### 4.4 OpfsFsAdapter 实现

对应浏览器 OPFS API（`navigator.storage.getDirectory()`）：

| OPFS 原生 API | 说明 |
| :- | :- |
| `navigator.storage.getDirectory()` | 获取 OPFS 根目录句柄（`FileSystemDirectoryHandle`） |
| `dirHandle.getDirectoryHandle(name, { create })` | 获取/创建子目录 |
| `dirHandle.getFileHandle(name, { create })` | 获取/创建文件句柄（`FileSystemFileHandle`） |
| `dirHandle.entries()` | 异步迭代器，产出 `[name, handle]` |
| `dirHandle.removeEntry(name, { recursive })` | 删除子项 |
| `fileHandle.getFile()` | 获取 `File` 对象，再调用 `.text()` 读内容 |
| `fileHandle.createWritable()` | 获取 `FileSystemWritableFileStream` |
| `writable.write(content)` | 写入内容 |
| `writable.close()` | 提交并关闭（必须调用） |

```typescript
class OpfsFsAdapter implements FsAdapter {
  // 将路径字符串解析为目录句柄 + 文件名
  private async resolveHandle(path: string, createDirs = false) {
    const parts = path.replace(/^\//, '').split('/')
    const name = parts.pop()!
    let dir: FileSystemDirectoryHandle = await navigator.storage.getDirectory()
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part, { create: createDirs })
    }
    return { dir, name }
  }

  async listDir(path: string) {
    try {
      const { dir, name } = await this.resolveHandle(path + '/placeholder')
      const targetDir = await dir.getDirectoryHandle(name)
      const result: string[] = []
      for await (const [entryName] of targetDir.entries()) result.push(entryName)
      return result
    } catch { return [] }
  }

  async read(path: string) {
    try {
      const { dir, name } = await this.resolveHandle(path)
      const fh = await dir.getFileHandle(name)
      return await (await fh.getFile()).text()
    } catch { return null }
  }

  async write(path: string, content: string) {
    const { dir, name } = await this.resolveHandle(path, true)
    const fh = await dir.getFileHandle(name, { create: true })
    const w = await fh.createWritable()
    await w.write(content)
    await w.close()
    return true
  }

  async remove(path: string) {
    try {
      const { dir, name } = await this.resolveHandle(path)
      await dir.removeEntry(name, { recursive: true })
      return true
    } catch { return false }
  }

  async move(from: string, to: string) {
    const content = await this.read(from)
    if (content === null) return false
    await this.write(to, content)
    await this.remove(from)
    return true
  }

  async mkdir(path: string) {
    // resolveHandle with createDirs=true 会自动创建中间目录
    const parts = path.replace(/^\//, '').split('/')
    let dir: FileSystemDirectoryHandle = await navigator.storage.getDirectory()
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part, { create: true })
    }
  }

  async exists(path: string) {
    return (await this.read(path)) !== null
  }
}
```

---

### 五、currentMember 获取规则

```typescript
// src/services/memberService.ts

export interface Member {
  email: string
  displayName: string
}

export function getCurrentMember(): Member | null {
  return window.moxt?.currentMember ?? null
}
```

- Moxt 环境：`window.moxt.currentMember` 返回 `{ email, displayName }` 或 `null`
- 非 Moxt 环境：`window.moxt` 不存在，返回 `null`
- 写入元数据时始终允许 `null`，不能因此阻断保存流程

---

### 六、空间配置

```typescript
// src/config/spaces.ts

export interface SpaceConfig {
  id: 'personal' | 'team' | 'local'
  label: string
  drawingsPath: string   // 画板存储目录，末尾不带斜杠
}

// Moxt 环境
export const MOXT_SPACES: SpaceConfig[] = [
  { id: 'personal', label: '个人空间', drawingsPath: '/personal/drawings' },
  { id: 'team',     label: '团队空间', drawingsPath: '/team/drawings'     },
]

// 非 Moxt 环境
export const LOCAL_SPACES: SpaceConfig[] = [
  { id: 'local', label: '本地', drawingsPath: 'drawings' },
]

export function getSpaces(): SpaceConfig[] {
  return window.moxt ? MOXT_SPACES : LOCAL_SPACES
}
```

---

### 七、服务层

#### 7.1 fileService.ts — 画板文件读写

```typescript
// src/services/fileService.ts
import { fs } from './fs'

/** 由画板路径推导元数据路径 */
export function metaPathFor(canvasPath: string): string {
  const parts = canvasPath.split('/')
  const fileName = parts.pop()!
  return [...parts, `~${fileName}.meta.json`].join('/')
}

/** 列出指定目录下所有 .excalidraw 文件的完整路径 */
export async function listCanvasFiles(drawingsPath: string): Promise<string[]> {
  const entries = await fs.listDir(drawingsPath)
  return entries
    .filter(name => name.endsWith('.excalidraw'))
    .map(name => `${drawingsPath}/${name}`)
}

/** 读取画板 JSON 内容，不存在返回 null */
export async function readCanvas(path: string): Promise<object | null> {
  const raw = await fs.read(path)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

/** 写入画板 JSON 内容 */
export async function writeCanvas(path: string, data: object): Promise<boolean> {
  return fs.write(path, JSON.stringify(data))
}

/** 空白画板内容 */
export function emptyCanvas(): object {
  return { type: 'excalidraw', version: 2, source: 'moxt-draw', elements: [], appState: { viewBackgroundColor: '#ffffff' }, files: {} }
}
```

#### 7.2 metaService.ts — 元数据读写

```typescript
// src/services/metaService.ts
import { fs } from './fs'
import { getCurrentMember } from './memberService'
import { metaPathFor } from './fileService'
import type { CanvasMeta } from '../types/canvas'

export async function readMeta(canvasPath: string): Promise<CanvasMeta | null> {
  const raw = await fs.read(metaPathFor(canvasPath))
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export async function writeMeta(canvasPath: string, meta: CanvasMeta): Promise<void> {
  await fs.write(metaPathFor(canvasPath), JSON.stringify(meta, null, 2))
}

/** 新建时初始化元数据 */
export async function createMeta(canvasPath: string, name: string, space: CanvasMeta['space']): Promise<CanvasMeta> {
  const now = new Date().toISOString()
  const meta: CanvasMeta = {
    file_path: canvasPath,
    name,
    space,
    thumbnail: null,
    created_at: now,
    updated_at: now,
    last_modified_by: getCurrentMember(),
    last_opened_at: now,
    last_opened_by: getCurrentMember(),
  }
  await writeMeta(canvasPath, meta)
  return meta
}

/** 保存时更新（updated_at、last_modified_by、thumbnail），created_at 不变 */
export async function updateMetaOnSave(canvasPath: string, thumbnail: string | null): Promise<void> {
  const existing = await readMeta(canvasPath)
  if (!existing) return
  await writeMeta(canvasPath, {
    ...existing,
    thumbnail,
    updated_at: new Date().toISOString(),
    last_modified_by: getCurrentMember(),
  })
}

/** 打开时更新（last_opened_at、last_opened_by），其余字段不变 */
export async function updateMetaOnOpen(canvasPath: string): Promise<void> {
  const existing = await readMeta(canvasPath)
  if (!existing) return
  await writeMeta(canvasPath, {
    ...existing,
    last_opened_at: new Date().toISOString(),
    last_opened_by: getCurrentMember(),
  })
}

/** 重命名时同步文件路径和 name 字段 */
export async function updateMetaOnRename(oldPath: string, newPath: string, newName: string): Promise<void> {
  const existing = await readMeta(oldPath)
  if (!existing) return
  // 先写新路径的元数据
  await writeMeta(newPath, { ...existing, file_path: newPath, name: newName })
  // 再删除旧元数据
  await fs.remove(metaPathFor(oldPath))
}
```

#### 7.3 thumbnailService.ts — 生成缩略图

```typescript
// src/services/thumbnailService.ts
import { exportToCanvas } from '@excalidraw/excalidraw'

/** 从 Excalidraw elements 生成 base64 缩略图，失败返回 null */
export async function generateThumbnail(
  elements: readonly any[],
  appState: any,
  files: any,
): Promise<string | null> {
  try {
    const canvas = await exportToCanvas({
      elements,
      appState: { ...appState, exportBackground: true },
      files,
      exportPadding: 16,
      maxWidthOrHeight: 400,
    })
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}
```

---

### 八、数据流

#### 8.1 自动保存（debounce 2s）

```
用户操作画板 → Excalidraw onChange(elements, appState, files)
     │
     └─ debounce 2000ms
           │
           ├─ fileService.writeCanvas(path, { elements, appState, files })
           │
           ├─ thumbnailService.generateThumbnail(elements, appState, files)
           │
           └─ metaService.updateMetaOnSave(path, thumbnail)
```

#### 8.2 打开画板

```
用户点击文件列表中的画板
     │
     ├─ fileService.readCanvas(path)  → 加载到 Excalidraw
     │
     └─ metaService.updateMetaOnOpen(path)  ← 异步，不阻塞打开
```

#### 8.3 新建画板

```
用户点击「新建」→ 输入名称 → 确认
     │
     ├─ 目录不存在时 fs.mkdir(drawingsPath)
     ├─ fileService.writeCanvas(path, emptyCanvas())
     ├─ metaService.createMeta(path, name, space)
     └─ 打开该画板（触发 updateMetaOnOpen）
```

#### 8.4 重命名

```
用户点击「重命名」→ 输入新名称 → 确认
     │
     ├─ fs.move(oldPath, newPath)                          ← 移动画板文件
     └─ metaService.updateMetaOnRename(oldPath, newPath, newName)  ← 移动元数据并更新字段
```

#### 8.5 删除

```
用户点击「删除」→ 确认弹窗
     │
     ├─ fs.remove(canvasPath)
     └─ fs.remove(metaPathFor(canvasPath))
```

---

### 九、界面布局

```
┌──────────────────────────────────────────────────────────────────┐
│  🖌 Moxt Draw                    [+ 新建]  [重命名]  [删除]  [导出 ▼] │
├──────────────────┬───────────────────────────────────────────────┤
│                  │                                               │
│  🗂 个人空间     │                                               │
│  ─────────────   │                                               │
│  🖼 设计稿       │           Excalidraw 画板编辑区               │
│     alice · 1h   │                                               │
│  🖼 流程图       │   （手绘 / 矩形 / 箭头 / 文字 / 图片）         │
│     bob · 3h     │                                               │
│                  │                                               │
│  🗂 团队空间     │                                               │
│  ─────────────   │                                               │
│  🖼 系统架构     │                                               │
│     alice · 昨天 │                                               │
│                  │                                               │
│  [+ 新建画板]    │                                               │
└──────────────────┴───────────────────────────────────────────────┘
```

- 文件列表每项展示：缩略图（有则显示）、画板名称、最后修改人 displayName、最后修改时间（相对时间）
- 当前打开的画板高亮
- 脱离 Moxt 时只显示「本地」空间，隐藏空间切换

---

### 十、关键交互细节

| 场景 | 处理方式 |
| :- | :- |
| 首次打开 app | 调用 `listCanvasFiles` 扫描各空间 `drawings/` 目录；目录不存在时 `listDir` 返回空数组，静默跳过 |
| 元数据文件不存在 | 降级展示：无缩略图，名称从文件名推断（去掉 `.excalidraw` 后缀） |
| 画板内容为空/损坏 | 加载 `emptyCanvas()` 兜底，不崩溃 |
| 导出 PNG | 调用 Excalidraw `exportToBlob`，创建临时 `<a>` 下载 |
| 导出 SVG | 调用 Excalidraw `exportToSvg`，序列化后下载 |
| `currentMember` 为 null | `last_modified_by` / `last_opened_by` 写 `null`，不阻塞保存 |
| OPFS 不可用（极旧浏览器）| 捕获异常，显示"当前浏览器不支持本地存储"提示，禁用新建功能 |

---

### 十一、TypeScript 类型

```typescript
// src/types/canvas.ts

export interface Member {
  email: string
  displayName: string
}

export type SpaceId = 'personal' | 'team' | 'local'

export interface CanvasMeta {
  file_path: string
  name: string
  space: SpaceId
  thumbnail: string | null
  created_at: string
  updated_at: string
  last_modified_by: Member | null
  last_opened_at: string | null
  last_opened_by: Member | null
}

export interface CanvasFile {
  path: string          // 完整路径
  meta: CanvasMeta | null
}
```

---

### 十二、目录结构

```
personal/moxt-draw.app/
├── manifest.json              # { type, name, version }
├── main.html                  # <script type="module" src="/src/main.tsx">
├── package.json               # 依赖：react, @excalidraw/excalidraw, tailwindcss
├── tsconfig.json
├── rsbuild.config.ts
└── src/
    ├── main.tsx               # ReactDOM.createRoot 入口
    ├── App.tsx                # 顶层布局，持有 activeCanvasPath 状态
    ├── config/
    │   └── spaces.ts          # SpaceConfig 定义，getSpaces()
    ├── components/
    │   ├── FilePanel.tsx      # 左侧双空间文件列表（含缩略图、最后修改信息）
    │   ├── CanvasEditor.tsx   # Excalidraw 封装，onChange debounce 自动保存
    │   └── Toolbar.tsx        # 新建/重命名/删除/导出按钮
    ├── services/
    │   ├── fs/
    │   │   ├── adapter.ts     # FsAdapter 接口
    │   │   ├── moxt.ts        # MoxtFsAdapter
    │   │   ├── opfs.ts        # OpfsFsAdapter
    │   │   └── index.ts       # createFsAdapter() + 单例 fs
    │   ├── fileService.ts     # listCanvasFiles, readCanvas, writeCanvas, emptyCanvas, metaPathFor
    │   ├── metaService.ts     # readMeta, writeMeta, createMeta, updateMetaOnSave, updateMetaOnOpen, updateMetaOnRename
    │   ├── thumbnailService.ts # generateThumbnail
    │   └── memberService.ts   # getCurrentMember
    └── types/
        └── canvas.ts          # Member, SpaceId, CanvasMeta, CanvasFile
```

---

### 十三、依赖清单

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@excalidraw/excalidraw": "^0.17.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@rsbuild/core": "latest",
    "@rsbuild/plugin-react": "latest",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0"
  }
}
```

---

### 十四、manifest.json

```json
{
  "type": "miniapp",
  "name": "Moxt Draw",
  "version": "1.0.0",
  "description": "基于 Excalidraw 的画板工具，画板文件存储到工作区文件系统"
}
```
