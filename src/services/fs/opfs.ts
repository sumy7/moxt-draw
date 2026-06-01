import type { FsAdapter } from './adapter'

export class OpfsFsAdapter implements FsAdapter {
  private async resolveHandle(path: string, createDirs = false) {
    const parts = path.replace(/^\//, '').split('/')
    const name = parts.pop()!
    let dir: FileSystemDirectoryHandle = await navigator.storage.getDirectory()
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part, { create: createDirs })
    }
    return { dir, name }
  }

  async listDir(path: string) {
    try {
      const parts = path.replace(/^\//, '').split('/')
      let dir: FileSystemDirectoryHandle = await navigator.storage.getDirectory()
      for (const part of parts) {
        dir = await dir.getDirectoryHandle(part)
      }
      const result: string[] = []
      for await (const [entryName] of dir.entries()) result.push(entryName)
      return result
    } catch { return [] }
  }

  async read(path: string) {
    try {
      const { dir, name } = await this.resolveHandle(path)
      const fh = await dir.getFileHandle(name)
      return await (await fh.getFile()).text()
    } catch { return null }
  }

  async write(path: string, content: string) {
    try {
      const { dir, name } = await this.resolveHandle(path, true)
      const fh = await dir.getFileHandle(name, { create: true })
      const w = await fh.createWritable()
      await w.write(content)
      await w.close()
      return true
    } catch { return false }
  }

  async remove(path: string) {
    try {
      const { dir, name } = await this.resolveHandle(path)
      await dir.removeEntry(name, { recursive: true })
      return true
    } catch { return false }
  }

  async move(from: string, to: string) {
    const content = await this.read(from)
    if (content === null) return false
    await this.write(to, content)
    await this.remove(from)
    return true
  }

  async mkdir(path: string) {
    const parts = path.replace(/^\//, '').split('/')
    let dir: FileSystemDirectoryHandle = await navigator.storage.getDirectory()
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part, { create: true })
    }
  }

  async exists(path: string) {
    return (await this.read(path)) !== null
  }
}
