export interface SpaceConfig {
  id: 'personal' | 'team' | 'local'
  label: string
  drawingsPath: string
}

export const MOXT_SPACES: SpaceConfig[] = [
  { id: 'personal', label: '个人空间', drawingsPath: '/personal/drawings' },
  { id: 'team',     label: '团队空间', drawingsPath: '/team/drawings'     },
]

export const LOCAL_SPACES: SpaceConfig[] = [
  { id: 'local', label: '本地', drawingsPath: 'drawings' },
]

export function getSpaces(): SpaceConfig[] {
  return window.moxt ? MOXT_SPACES : LOCAL_SPACES
}
