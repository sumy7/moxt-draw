import type { Member } from '../types/canvas'

export function getCurrentMember(): Member | null {
  const m = window.moxt?.currentMember
  if (!m) return null
  return { email: m.email, displayName: m.displayName }
}
