import { useState } from 'react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { PlusIcon, PencilIcon, Trash2Icon, DownloadIcon, ChevronDownIcon } from 'lucide-react'
import { fs } from '../services/fs'
import { writeCanvas, emptyCanvas, metaPathFor } from '../services/fileService'
import { createMeta, updateMetaOnRename } from '../services/metaService'
import { exportToBlob, exportToSvg } from '@excalidraw/excalidraw'
import type { SpaceId } from '../types/canvas'

interface Props {
  activeCanvasPath: string | null
  newCanvasTarget: { spaceId: SpaceId; drawingsPath: string } | null
  onCreated: (path: string) => void
  onRenamed: (newPath: string) => void
  onDeleted: () => void
  getExcalidrawData: () => { elements: readonly object[]; appState: object; files: object } | null
  lastSavedAt: Date | null
}

export function Toolbar({
  activeCanvasPath,
  newCanvasTarget,
  onCreated,
  onRenamed,
  onDeleted,
  getExcalidrawData,
  lastSavedAt,
}: Props) {
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [inputName, setInputName] = useState('')
  const [busy, setBusy] = useState(false)

  function canvasDisplayName(path: string): string {
    return path.split('/').pop()?.replace('.excalidraw', '') ?? '未命名'
  }

  function triggerDownload(url: string, filename: string) {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  async function handleCreate() {
    if (!newCanvasTarget || !inputName.trim() || busy) return
    const { spaceId, drawingsPath } = newCanvasTarget
    const safeName = inputName.trim().replace(/[/\\]/g, '_')
    const path = `${drawingsPath}/${safeName}.excalidraw`
    setBusy(true)
    try {
      if (await fs.exists(path)) {
        alert(`画板「${safeName}」已存在，请使用其他名称。`)
        return
      }
      await fs.mkdir(drawingsPath)
      await writeCanvas(path, emptyCanvas())
      await createMeta(path, safeName, spaceId)
      setNewDialogOpen(false)
      setInputName('')
      onCreated(path)
    } catch (e) {
      alert(`创建失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleRename() {
    if (!activeCanvasPath || !inputName.trim() || busy) return
    const parts = activeCanvasPath.split('/')
    const dir = parts.slice(0, -1).join('/')
    const safeName = inputName.trim().replace(/[/\\]/g, '_')
    const newPath = `${dir}/${safeName}.excalidraw`
    setBusy(true)
    try {
      if (newPath !== activeCanvasPath && await fs.exists(newPath)) {
        alert(`画板「${safeName}」已存在，请使用其他名称。`)
        return
      }
      await fs.move(activeCanvasPath, newPath)
      await updateMetaOnRename(activeCanvasPath, newPath, safeName)
      setRenameDialogOpen(false)
      setInputName('')
      onRenamed(newPath)
    } catch (e) {
      alert(`重命名失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!activeCanvasPath || busy) return
    setBusy(true)
    try {
      await fs.remove(activeCanvasPath)
      await fs.remove(metaPathFor(activeCanvasPath))
      setDeleteDialogOpen(false)
      onDeleted()
    } catch (e) {
      alert(`删除失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleExportPng() {
    const data = getExcalidrawData()
    if (!data) return
    const url = URL.createObjectURL(await exportToBlob({
      elements: data.elements as any,
      appState: data.appState as any,
      files: data.files as any,
      mimeType: 'image/png',
    }))
    try {
      triggerDownload(url, (activeCanvasPath ? canvasDisplayName(activeCanvasPath) : 'drawing') + '.png')
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  async function handleExportSvg() {
    const data = getExcalidrawData()
    if (!data) return
    const svg = await exportToSvg({
      elements: data.elements as any,
      appState: data.appState as any,
      files: data.files as any,
    })
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' })
    )
    try {
      triggerDownload(url, (activeCanvasPath ? canvasDisplayName(activeCanvasPath) : 'drawing') + '.svg')
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  return (
    <>
      <header className="h-12 border-b flex items-center px-4 gap-2 shrink-0">
        <span className="font-semibold text-sm">Moxt Draw</span>
        {lastSavedAt && (
          <span className="text-xs text-muted-foreground mr-auto">
            已保存 {lastSavedAt.toLocaleTimeString()}
          </span>
        )}
        {!lastSavedAt && <span className="mr-auto" />}

        <Button
          size="sm"
          variant="outline"
          onClick={() => { setInputName(''); setNewDialogOpen(true) }}
          disabled={!newCanvasTarget}
        >
          <PlusIcon className="h-4 w-4 mr-1" /> 新建
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => { setInputName(activeCanvasPath ? canvasDisplayName(activeCanvasPath) : ''); setRenameDialogOpen(true) }}
          disabled={!activeCanvasPath}
        >
          <PencilIcon className="h-4 w-4 mr-1" /> 重命名
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={!activeCanvasPath}
          className="text-destructive hover:text-destructive"
        >
          <Trash2Icon className="h-4 w-4 mr-1" /> 删除
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" disabled={!activeCanvasPath}>
              <DownloadIcon className="h-4 w-4 mr-1" /> 导出
              <ChevronDownIcon className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportPng}>导出 PNG</DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportSvg}>导出 SVG</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* 新建对话框 */}
      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建画板</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="画板名称"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setNewDialogOpen(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={!inputName.trim() || busy}>创建</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 重命名对话框 */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名画板</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="新名称"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>取消</Button>
            <Button onClick={handleRename} disabled={!inputName.trim() || busy}>确认</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            确定要删除「{activeCanvasPath ? canvasDisplayName(activeCanvasPath) : ''}」吗？此操作不可恢复。
          </p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={busy}>删除</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
