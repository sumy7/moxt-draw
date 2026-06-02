import { useState, useRef, useCallback } from 'react'
import { FilePanel } from './components/FilePanel'
import { CanvasEditor } from './components/CanvasEditor'
import { Toolbar } from './components/Toolbar'
import { readCanvas } from './services/fileService'
import { updateMetaOnOpen } from './services/metaService'
import { getSpaces } from './config/spaces'
import { getCurrentMember } from './services/memberService'
import type { SpaceId, Member } from './types/canvas'

interface NewCanvasTarget {
  spaceId: SpaceId
  drawingsPath: string
}

const spaces = getSpaces()

export default function App() {
  const defaultTarget: NewCanvasTarget | null = spaces.length
    ? { spaceId: spaces[0].id, drawingsPath: spaces[0].drawingsPath }
    : null

  const [activeCanvasPath, setActiveCanvasPath] = useState<string | null>(null)
  const [canvasData, setCanvasData] = useState<object | null>(null)
  const [newCanvasTarget, setNewCanvasTarget] = useState<NewCanvasTarget | null>(defaultTarget)
  const [filePanelKey, setFilePanelKey] = useState(0)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [lastSave, setLastSave] = useState<{ path: string; thumbnail: string | null; updatedAt: string; modifier: Member | null } | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const excalidrawDataRef = useRef<(() => { elements: readonly object[]; appState: object; files: object } | null) | null>(null)
  const saveNowRef = useRef<(() => Promise<void>) | null>(null)

  const openCanvas = useCallback(async (path: string, editing = false) => {
    try {
      setCanvasData(null)
      setIsEditing(editing)
      const data = await readCanvas(path)
      setCanvasData(data)
      setActiveCanvasPath(path)
      updateMetaOnOpen(path).catch(console.warn)
    } catch (e) {
      console.error('Failed to open canvas', e)
    }
  }, [])

  const handleNewCanvas = useCallback((spaceId: string, drawingsPath: string) => {
    setNewCanvasTarget({ spaceId: spaceId as SpaceId, drawingsPath })
  }, [])

  const handleCreated = useCallback(async (path: string) => {
    setFilePanelKey(k => k + 1)
    await openCanvas(path, true)
  }, [openCanvas])

  const handleRenamed = useCallback(async (newPath: string) => {
    setFilePanelKey(k => k + 1)
    await openCanvas(newPath)
  }, [openCanvas])

  const handleDeleted = useCallback(() => {
    setFilePanelKey(k => k + 1)
    setActiveCanvasPath(null)
    setCanvasData(null)
    setLastSavedAt(null)
    setLastSave(null)
    setIsEditing(false)
  }, [])

  const handleSaved = useCallback((thumbnail: string | null) => {
    const now = new Date()
    setLastSavedAt(now)
    if (activeCanvasPath) {
      setLastSave({ path: activeCanvasPath, thumbnail, updatedAt: now.toISOString(), modifier: getCurrentMember() })
    }
  }, [activeCanvasPath])

  const getExcalidrawData = useCallback(() => excalidrawDataRef.current?.() ?? null, [])

  const handleApiReady = useCallback((getter: () => { elements: readonly object[]; appState: object; files: object } | null) => {
    excalidrawDataRef.current = getter
  }, [])

  const handleSaveReady = useCallback((saveNow: () => Promise<void>) => {
    saveNowRef.current = saveNow
  }, [])

  const handleSaveAndView = useCallback(async () => {
    try {
      await saveNowRef.current?.()
      setIsEditing(false)
    } catch (e) {
      console.error('Save failed', e)
      alert(`保存失败：${e instanceof Error ? e.message : String(e)}`)
    }
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Toolbar
        activeCanvasPath={activeCanvasPath}
        newCanvasTarget={newCanvasTarget}
        onCreated={handleCreated}
        onRenamed={handleRenamed}
        onDeleted={handleDeleted}
        getExcalidrawData={getExcalidrawData}
        lastSavedAt={lastSavedAt}
        isEditing={isEditing}
        onEdit={() => setIsEditing(true)}
        onSaveAndView={handleSaveAndView}
      />
      <div className="flex flex-1 overflow-hidden">
        <FilePanel
          key={filePanelKey}
          activeCanvasPath={activeCanvasPath}
          onOpen={openCanvas}
          onNewCanvas={handleNewCanvas}
          lastSave={lastSave}
        />
        <main className="flex-1 overflow-hidden">
          {activeCanvasPath ? (
            <CanvasEditor
              key={activeCanvasPath}
              canvasPath={activeCanvasPath}
              initialData={canvasData}
              isEditing={isEditing}
              onApiReady={handleApiReady}
              onSaveReady={handleSaveReady}
              onSaved={handleSaved}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              从左侧选择画板，或点击 + 新建
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
