export interface Member {
  email: string
  displayName: string
}

export type SpaceId = 'personal' | 'team' | 'local'

export interface CanvasMeta {
  file_path: string
  name: string
  space: SpaceId
  thumbnail: string | null
  created_at: string
  updated_at: string
  last_modified_by: Member | null
  last_opened_at: string | null
  last_opened_by: Member | null
}

export interface CanvasFile {
  path: string
  meta: CanvasMeta | null
}
