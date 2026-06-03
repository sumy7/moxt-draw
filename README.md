# Moxt Draw

基于 [Excalidraw](https://excalidraw.com/) 的画板 miniapp，运行在 Moxt 工作区内。支持个人空间与团队空间的画板管理，也可脱离 Moxt 环境在纯浏览器中独立运行。

## 功能

- 新建、重命名、删除画板
- 自动保存（2 秒防抖）+ `Ctrl/Cmd+S` 手动保存
- 顶栏显示最后保存时间
- 导出为 PNG / SVG
- 画板缩略图自动生成
- 双运行环境：Moxt 环境使用工作区文件系统，浏览器环境使用 [OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | React 19 + TypeScript |
| 画板 | Excalidraw 0.18 |
| UI | Tailwind CSS v4 + shadcn/ui (Radix) |
| 构建 | Rsbuild |

## 开发

```bash
npm install
npm run dev      # 启动开发服务器（http://localhost:3000/moxt-draw）
npm run build    # 生产构建
npm run preview  # 预览构建产物
```

## 目录结构

```
src/
├── components/
│   ├── CanvasEditor.tsx   # Excalidraw 封装，处理保存逻辑
│   ├── FilePanel.tsx      # 左侧文件列表
│   └── Toolbar.tsx        # 顶部工具栏
├── config/
│   └── spaces.ts          # 空间配置（Moxt / 本地）
├── services/
│   ├── fs/                # 文件系统适配层（Moxt / OPFS）
│   ├── fileService.ts     # 画板读写
│   ├── metaService.ts     # 元数据管理
│   └── thumbnailService.ts
├── types/
│   └── canvas.ts
└── vendor/
    └── excalidraw.css     # vendored，避免从 node_modules 引入
```

## 文件格式

每个画板对应两个文件：

- `{name}.excalidraw` — 画板数据（JSON）
- `~{name}.excalidraw.meta.json` — 元数据（标题、缩略图、最后打开时间等）

**Moxt 环境路径：** `/personal/drawings/` 和 `/team/drawings/`

**浏览器独立运行路径：** OPFS `drawings/`
