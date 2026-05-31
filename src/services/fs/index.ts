import type { FsAdapter } from './adapter'
import { MoxtFsAdapter } from './moxt'
import { OpfsFsAdapter } from './opfs'

export type { FsAdapter }

export function createFsAdapter(): FsAdapter {
  if (typeof window !== 'undefined' && window.moxt?.fs) {
    return new MoxtFsAdapter()
  }
  return new OpfsFsAdapter()
}

export const fs = createFsAdapter()
