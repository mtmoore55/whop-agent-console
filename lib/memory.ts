import type { ActionType, LogEntry } from './types'

/**
 * Rejection memory. Every rejected proposal and the owner's one-word reason
 * becomes something the agent is told about next time it writes a brief.
 * This is what turns the approval gate from a chore into training.
 */
export interface MemoryEntry {
  id: string
  type: ActionType
  reason: string
  headline: string
  atISO: string
}

export function memoryFromLog(log: LogEntry[], forgottenIds: string[] = []): MemoryEntry[] {
  const forgotten = new Set(forgottenIds)
  return log
    .filter((e) => e.lifecycle.includes('rejected') && e.rejectionReason && !forgotten.has(e.id))
    .map((e) => ({
      id: e.id,
      type: e.type,
      reason: e.rejectionReason as string,
      headline: e.headline,
      atISO: e.atISO,
    }))
}

/** Action types the owner has turned down at least twice — a standing "no". */
export function hardNos(memory: MemoryEntry[]): ActionType[] {
  const counts = new Map<ActionType, number>()
  for (const m of memory) counts.set(m.type, (counts.get(m.type) ?? 0) + 1)
  return [...counts.entries()].filter(([, n]) => n >= 2).map(([t]) => t)
}
