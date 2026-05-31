import { fs } from './fs'

export function metaPathFor(canvasPath: string): string {
  const parts = canvasPath.split('/')
  const fileName = parts.pop()!
  return [...parts, `~${fileName}.meta.json`].join('/')
}

export async function listCanvasFiles(drawingsPath: string): Promise<string[]> {
  const entries = await fs.listDir(drawingsPath)
  return entries
    .filter(name => name.endsWith('.excalidraw'))
    .map(name => `${drawingsPath}/${name}`)
}

export async function readCanvas(path: string): Promise<object | null> {
  const raw = await fs.read(path)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export async function writeCanvas(path: string, data: object): Promise<boolean> {
  return fs.write(path, JSON.stringify(data))
}

export function emptyCanvas(): object {
  return {
    type: 'excalidraw',
    version: 2,
    source: 'moxt-draw',
    elements: [],
    appState: { viewBackgroundColor: '#ffffff' },
    files: {},
  }
}
