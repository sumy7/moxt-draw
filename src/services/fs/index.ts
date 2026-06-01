import type { FsAdapter } from './adapter'
import { MoxtFsAdapter } from './moxt'
import { OpfsFsAdapter } from './opfs'

export type { FsAdapter }

let _fs: FsAdapter | null = null

export function getFs(): FsAdapter {
  if (!_fs) {
    _fs = (typeof window !== 'undefined' && window.moxt?.fs)
      ? new MoxtFsAdapter()
      : new OpfsFsAdapter()
  }
  return _fs
}
