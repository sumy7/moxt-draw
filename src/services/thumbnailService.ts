import { exportToCanvas } from '@excalidraw/excalidraw'

export async function generateThumbnail(
  elements: readonly object[],
  appState: object,
  files: object,
): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canvas = await exportToCanvas({
      elements: elements as any,
      appState: { ...(appState as any), exportBackground: true },
      files: files as any,
      exportPadding: 16,
      maxWidthOrHeight: 400,
    })
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}
