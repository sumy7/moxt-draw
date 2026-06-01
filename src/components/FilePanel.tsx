import { useEffect, useState, useCallback } from 'react'
import { getSpaces } from '../config/spaces'
import { listCanvasFiles } from '../services/fileService'
import { readMeta } from '../services/metaService'
import { Button } from './ui/button'
import type { CanvasFile, Member } from '../types/canvas'
import { PlusIcon, ImageIcon } from 'lucide-react'

interface LastSave {
  path: string
  thumbnail: string | null
  updatedAt: string
  modifier: Member | null
}

interface Props {
  activeCanvasPath: string | null
  onOpen: (path: string) => void
  onNewCanvas: (spaceId: string, drawingsPath: string) => void
  lastSave: LastSave | null
}

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}天前`
  return new Date(iso).toLocaleDateString('zh-CN')
}

export function FilePanel({ activeCanvasPath, onOpen, onNewCanvas, lastSave }: Props) {
  const spaces = getSpaces()
  const [filesBySpace, setFilesBySpace] = useState<Record<string, CanvasFile[]>>({})

  const loadFiles = useCallback(async () => {
    const result: Record<string, CanvasFile[]> = {}
    for (const space of spaces) {
      const paths = await listCanvasFiles(space.drawingsPath)
      const files: CanvasFile[] = await Promise.all(
        paths.map(async (path) => ({
          path,
          meta: await readMeta(path),
        }))
      )
      result[space.id] = files
    }
    setFilesBySpace(result)
  }, [])

  useEffect(() => { loadFiles() }, [loadFiles])

  useEffect(() => {
    if (!lastSave) return
    setFilesBySpace(prev => {
      const next: Record<string, CanvasFile[]> = {}
      for (const [spaceId, files] of Object.entries(prev)) {
        next[spaceId] = files.map(f => {
          if (f.path !== lastSave.path || !f.meta) return f
          return {
            ...f,
            meta: {
              ...f.meta,
              thumbnail: lastSave.thumbnail,
              updated_at: lastSave.updatedAt,
              last_modified_by: lastSave.modifier,
            },
          }
        })
      }
      return next
    })
  }, [lastSave])

  return (
    <aside className="w-56 flex-shrink-0 border-r bg-sidebar flex flex-col overflow-y-auto">
      {spaces.map((space) => (
        <div key={space.id} className="px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {space.label}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onNewCanvas(space.id, space.drawingsPath)}
              title="新建画板"
            >
              <PlusIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
          <ul className="space-y-0.5">
            {(filesBySpace[space.id] ?? []).map((file) => {
              const name = file.meta?.name ?? file.path.split('/').pop()?.replace('.excalidraw', '') ?? '未命名'
              const modifier = file.meta?.last_modified_by?.displayName ?? ''
              const time = relativeTime(file.meta?.updated_at ?? null)
              const isActive = file.path === activeCanvasPath
              return (
                <li key={file.path}>
                  <button
                    onClick={() => onOpen(file.path)}
                    className={`w-full text-left rounded-md px-2 py-1.5 flex items-start gap-2 group transition-colors ${
                      isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                    }`}
                  >
                    {file.meta?.thumbnail ? (
                      <img
                        src={file.meta.thumbnail}
                        alt=""
                        className="w-8 h-6 object-cover rounded shrink-0 mt-0.5 border"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-6 text-muted-foreground shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{name}</div>
                      {(modifier || time) && (
                        <div className="text-xs text-muted-foreground truncate">
                          {modifier}{modifier && time ? ' · ' : ''}{time}
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </aside>
  )
}
