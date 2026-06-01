import { useCallback, useEffect, useRef } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/dist/types/excalidraw/types'
import { writeCanvas } from '../services/fileService'
import { generateThumbnail } from '../services/thumbnailService'
import { updateMetaOnSave } from '../services/metaService'
import '@excalidraw/excalidraw/index.css'

interface ExcalidrawData {
  elements: readonly object[]
  appState: object
  files: object
}

interface Props {
  canvasPath: string
  initialData: object | null
  onApiReady: (getter: () => ExcalidrawData | null) => void
  onSaved: () => void
}

export function CanvasEditor({ canvasPath, initialData, onApiReady, onSaved }: Props) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingDataRef = useRef<{ elements: readonly unknown[]; appState: Record<string, unknown>; files: Record<string, unknown> } | null>(null)
  const dirtyRef = useRef(false)

  const doSave = useCallback(async (
    elements: readonly unknown[],
    appState: Record<string, unknown>,
    files: Record<string, unknown>,
  ) => {
    await writeCanvas(canvasPath, { elements, appState, files })
    const thumbnail = await generateThumbnail(elements as readonly object[], appState as object, files as object)
    await updateMetaOnSave(canvasPath, thumbnail)
    dirtyRef.current = false
    onSaved()
  }, [canvasPath, onSaved])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        e.stopPropagation()
        if (!dirtyRef.current || !pendingDataRef.current) return
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current)
          saveTimerRef.current = null
        }
        const { elements, appState, files } = pendingDataRef.current
        doSave(elements, appState, files)
      }
    }
    document.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [doSave])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const handleChange = useCallback(
    (elements: readonly unknown[], appState: Record<string, unknown>, files: Record<string, unknown>) => {
      pendingDataRef.current = { elements, appState, files }
      dirtyRef.current = true
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        doSave(elements, appState, files)
      }, 2000)
    },
    [doSave],
  )

  return (
    <div className="h-full w-full">
      <Excalidraw
        excalidrawAPI={(api: ExcalidrawImperativeAPI) => {
          onApiReady(() => {
            const elements = api.getSceneElements()
            const appState = api.getAppState()
            const files = api.getFiles()
            return { elements, appState, files }
          })
        }}
        initialData={initialData as any}
        onChange={handleChange as any}
      />
    </div>
  )
}
