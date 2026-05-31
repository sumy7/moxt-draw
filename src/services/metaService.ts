import { fs } from './fs'
import { getCurrentMember } from './memberService'
import { metaPathFor } from './fileService'
import type { CanvasMeta } from '../types/canvas'

export async function readMeta(canvasPath: string): Promise<CanvasMeta | null> {
  const raw = await fs.read(metaPathFor(canvasPath))
  if (!raw) return null
  try { return JSON.parse(raw) as CanvasMeta } catch { return null }
}

export async function writeMeta(canvasPath: string, meta: CanvasMeta): Promise<void> {
  await fs.write(metaPathFor(canvasPath), JSON.stringify(meta, null, 2))
}

export async function createMeta(
  canvasPath: string,
  name: string,
  space: CanvasMeta['space'],
): Promise<CanvasMeta> {
  const now = new Date().toISOString()
  const meta: CanvasMeta = {
    file_path: canvasPath,
    name,
    space,
    thumbnail: null,
    created_at: now,
    updated_at: now,
    last_modified_by: getCurrentMember(),
    last_opened_at: now,
    last_opened_by: getCurrentMember(),
  }
  await writeMeta(canvasPath, meta)
  return meta
}

export async function updateMetaOnSave(canvasPath: string, thumbnail: string | null): Promise<void> {
  const existing = await readMeta(canvasPath)
  if (!existing) return
  await writeMeta(canvasPath, {
    ...existing,
    thumbnail,
    updated_at: new Date().toISOString(),
    last_modified_by: getCurrentMember(),
  })
}

export async function updateMetaOnOpen(canvasPath: string): Promise<void> {
  const existing = await readMeta(canvasPath)
  if (!existing) return
  await writeMeta(canvasPath, {
    ...existing,
    last_opened_at: new Date().toISOString(),
    last_opened_by: getCurrentMember(),
  })
}

export async function updateMetaOnRename(
  oldPath: string,
  newPath: string,
  newName: string,
): Promise<void> {
  const existing = await readMeta(oldPath)
  if (!existing) return
  await writeMeta(newPath, { ...existing, file_path: newPath, name: newName })
  await fs.remove(metaPathFor(oldPath))
}
