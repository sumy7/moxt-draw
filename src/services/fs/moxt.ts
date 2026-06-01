import type { FsAdapter } from './adapter'

export class MoxtFsAdapter implements FsAdapter {
  private get api() { return window.moxt!.fs }

  async listDir(path: string) {
    try {
      const entries = await this.api.listDir(path)
      // moxt returns full paths; normalize to bare filenames to match OpfsFsAdapter
      const prefix = path.endsWith('/') ? path : path + '/'
      return entries
        .filter(e => e !== prefix && !e.endsWith('/'))
        .map(e => e.startsWith(prefix) ? e.slice(prefix.length) : e)
    } catch { return [] }
  }
  async read(path: string) { return this.api.read(path) }
  async write(path: string, content: string) { return this.api.write(path, content) }
  async remove(path: string) { return this.api.remove(path) }
  async move(from: string, to: string) { return this.api.move(from, to) }
  async mkdir(path: string) { return this.api.mkdir(path) }
  async exists(path: string) { return this.api.exists(path) }
}
