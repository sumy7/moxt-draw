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
}

export function CanvasEditor({ canvasPath, initialData, onApiReady }: Props) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const handleChange = useCallback(
    (elements: readonly unknown[], appState: Record<string, unknown>, files: Record<string, unknown>) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(async () => {
        await writeCanvas(canvasPath, { elements, appState, files })
        const thumbnail = await generateThumbnail(elements as readonly object[], appState as object, files as object)
        await updateMetaOnSave(canvasPath, thumbnail)
      }, 2000)
    },
    [canvasPath],
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
