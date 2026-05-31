// src/global.d.ts

export interface MoxtMember {
  email: string
  displayName: string
}

export interface MoxtFs {
  listDir(path: string): Promise<string[]>
  read(path: string): Promise<string | null>
  write(path: string, content: string): Promise<boolean>
  remove(path: string): Promise<boolean>
  move(from: string, to: string): Promise<boolean>
  mkdir(path: string): Promise<void>
  exists(path: string): Promise<boolean>
}

declare global {
  interface Window {
    moxt?: {
      fs: MoxtFs
      currentMember: MoxtMember | null
    }
  }
}
