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
}

export function Toolbar({
  activeCanvasPath,
  newCanvasTarget,
  onCreated,
  onRenamed,
  onDeleted,
  getExcalidrawData,
}: Props) {
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [inputName, setInputName] = useState('')

  async function handleCreate() {
    if (!newCanvasTarget || !inputName.trim()) return
    const { spaceId, drawingsPath } = newCanvasTarget
    const safeName = inputName.trim().replace(/[/\\]/g, '_')
    const path = `${drawingsPath}/${safeName}.excalidraw`
    await fs.mkdir(drawingsPath)
    await writeCanvas(path, emptyCanvas())
    await createMeta(path, safeName, spaceId)
    setNewDialogOpen(false)
    setInputName('')
    onCreated(path)
  }

  async function handleRename() {
    if (!activeCanvasPath || !inputName.trim()) return
    const parts = activeCanvasPath.split('/')
    const dir = parts.slice(0, -1).join('/')
    const safeName = inputName.trim().replace(/[/\\]/g, '_')
    const newPath = `${dir}/${safeName}.excalidraw`
    await fs.move(activeCanvasPath, newPath)
    await updateMetaOnRename(activeCanvasPath, newPath, safeName)
    setRenameDialogOpen(false)
    setInputName('')
    onRenamed(newPath)
  }

  async function handleDelete() {
    if (!activeCanvasPath) return
    await fs.remove(activeCanvasPath)
    await fs.remove(metaPathFor(activeCanvasPath))
    setDeleteDialogOpen(false)
    onDeleted()
  }

  async function handleExportPng() {
    const data = getExcalidrawData()
    if (!data) return
    const blob = await exportToBlob({
      elements: data.elements as any,
      appState: data.appState as any,
      files: data.files as any,
      mimeType: 'image/png',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (activeCanvasPath?.split('/').pop()?.replace('.excalidraw', '') ?? 'drawing') + '.png'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleExportSvg() {
    const data = getExcalidrawData()
    if (!data) return
    const svg = await exportToSvg({
      elements: data.elements as any,
      appState: data.appState as any,
      files: data.files as any,
    })
    const serialized = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([serialized], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (activeCanvasPath?.split('/').pop()?.replace('.excalidraw', '') ?? 'drawing') + '.svg'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <header className="h-12 border-b flex items-center px-4 gap-2 shrink-0">
        <span className="font-semibold text-sm mr-auto">Moxt Draw</span>

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
          onClick={() => { setInputName(''); setRenameDialogOpen(true) }}
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
            <Button onClick={handleCreate} disabled={!inputName.trim()}>创建</Button>
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
            <Button onClick={handleRename} disabled={!inputName.trim()}>确认</Button>
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
            确定要删除「{activeCanvasPath?.split('/').pop()?.replace('.excalidraw', '')}」吗？此操作不可恢复。
          </p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>删除</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
