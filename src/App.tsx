import { useState, useRef, useCallback } from 'react'
import { FilePanel } from './components/FilePanel'
import { CanvasEditor } from './components/CanvasEditor'
import { Toolbar } from './components/Toolbar'
import { readCanvas } from './services/fileService'
import { updateMetaOnOpen } from './services/metaService'
import { getSpaces } from './config/spaces'
import type { SpaceId } from './types/canvas'

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
  const excalidrawDataRef = useRef<(() => { elements: readonly object[]; appState: object; files: object } | null) | null>(null)

  const openCanvas = useCallback(async (path: string) => {
    try {
      setCanvasData(null)
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
    await openCanvas(path)
  }, [openCanvas])

  const handleRenamed = useCallback(async (newPath: string) => {
    setFilePanelKey(k => k + 1)
    await openCanvas(newPath)
  }, [openCanvas])

  const handleDeleted = useCallback(() => {
    setFilePanelKey(k => k + 1)
    setActiveCanvasPath(null)
    setCanvasData(null)
  }, [])

  const getExcalidrawData = useCallback(() => excalidrawDataRef.current?.() ?? null, [])

  const handleApiReady = useCallback((getter: () => { elements: readonly object[]; appState: object; files: object } | null) => {
    excalidrawDataRef.current = getter
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
      />
      <div className="flex flex-1 overflow-hidden">
        <FilePanel
          key={filePanelKey}
          activeCanvasPath={activeCanvasPath}
          onOpen={openCanvas}
          onNewCanvas={handleNewCanvas}
        />
        <main className="flex-1 overflow-hidden">
          {activeCanvasPath ? (
            <CanvasEditor
              key={activeCanvasPath}
              canvasPath={activeCanvasPath}
              initialData={canvasData}
              onApiReady={handleApiReady}
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
