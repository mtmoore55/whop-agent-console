'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import { derive } from './derive'
import { execute } from './execute'
import { DEFAULT_POLICY, evaluate } from './policy'
import { freshBrief, type Brief } from './proposals'
import { freshState } from './seed'
import type {
  BusinessState,
  LogEntry,
  Policy,
  Proposal,
  ProposalStatus,
  ProposedAction,
  PolicyVerdict,
} from './types'

const STORAGE_KEY = 'whop-agent-console'
/** Bump when the persisted shape changes; older payloads are dropped. */
const STORAGE_VERSION = 2
/** How long an execution animation runs before state actually commits. */
export const EXECUTE_MS = 720

interface ConsoleState {
  state: BusinessState
  policy: Policy
  brief: Brief
  statuses: Record<string, ProposalStatus>
  rejectionReasons: Record<string, string>
  modifiedIds: string[]
  overriddenIds: string[]
  log: LogEntry[]
  /** Rail collapse. A workspace preference, so Reset demo leaves it alone. */
  navCollapsed: boolean
  hydrated: boolean
}

function initial(): ConsoleState {
  return {
    state: freshState(),
    policy: DEFAULT_POLICY,
    brief: freshBrief(),
    statuses: {},
    rejectionReasons: {},
    modifiedIds: [],
    overriddenIds: [],
    log: [],
    navCollapsed: false,
    hydrated: false,
  }
}

/**
 * Only decisions are persisted. The brief itself is rebuilt from code on every
 * load so that edits to the seeded copy reach people who already have state,
 * with modified parameters replayed on top.
 */
interface Persisted {
  v: number
  state: BusinessState
  statuses: Record<string, ProposalStatus>
  rejectionReasons: Record<string, string>
  overriddenIds: string[]
  log: LogEntry[]
  params: Record<string, Record<string, unknown>>
  navCollapsed: boolean
}

function toPersisted(s: ConsoleState): Persisted {
  const params: Record<string, Record<string, unknown>> = {}
  for (const id of s.modifiedIds) {
    const p = s.brief.proposals.find((x) => x.id === id)
    if (p?.kind === 'action') params[id] = p.params as Record<string, unknown>
  }
  return {
    v: STORAGE_VERSION,
    state: s.state,
    statuses: s.statuses,
    rejectionReasons: s.rejectionReasons,
    overriddenIds: s.overriddenIds,
    log: s.log,
    params,
    navCollapsed: s.navCollapsed,
  }
}

/** Recompute cost, blast radius and approval for one proposal's parameters. */
function withParams(
  proposals: Proposal[],
  id: string,
  patch: Record<string, unknown>,
  state: BusinessState,
  policy: Policy,
): Proposal[] {
  return proposals.map((p) => {
    if (p.id !== id || p.kind !== 'action') return p
    const params = { ...(p.params as Record<string, unknown>), ...patch }
    const d = derive(p.type, params as never, state)
    const verdict = evaluate(
      { type: p.type, maxCost: d.maxCost, reversibility: p.reversibility, blastRadius: d.blastRadius },
      policy,
      state.agentSpendToday,
    )
    return {
      ...p,
      params,
      maxCost: d.maxCost,
      blastRadius: d.blastRadius,
      requiresApproval: verdict.requiresApproval,
    } as Proposal
  })
}

function fromPersisted(p: Persisted): ConsoleState {
  const base = initial()
  let proposals = base.brief.proposals
  const modifiedIds: string[] = []

  for (const [id, params] of Object.entries(p.params ?? {})) {
    // A proposal that no longer exists in the brief just drops its overrides.
    if (!proposals.some((x) => x.id === id)) continue
    proposals = withParams(proposals, id, params, p.state, base.policy)
    modifiedIds.push(id)
  }

  const statuses: Record<string, ProposalStatus> = {}
  for (const [id, status] of Object.entries(p.statuses ?? {})) {
    // Anything mid-flight when the tab closed goes back to pending.
    statuses[id] = status === 'executing' ? 'pending' : status
  }

  return {
    ...base,
    state: p.state ?? base.state,
    brief: { ...base.brief, proposals },
    statuses,
    rejectionReasons: p.rejectionReasons ?? {},
    modifiedIds,
    overriddenIds: p.overriddenIds ?? [],
    log: p.log ?? [],
    navCollapsed: p.navCollapsed ?? false,
    hydrated: true,
  }
}

type Msg =
  | { t: 'hydrate'; payload: ConsoleState }
  | { t: 'ready' }
  | { t: 'begin'; ids: string[] }
  | { t: 'commit'; ids: string[] }
  | { t: 'reject'; id: string; reason: string }
  | { t: 'modify'; id: string; params: Record<string, unknown> }
  | { t: 'override'; id: string }
  | { t: 'toggleNav' }
  | { t: 'reset' }

function statusOf(s: ConsoleState, id: string): ProposalStatus {
  return s.statuses[id] ?? 'pending'
}

function reducer(s: ConsoleState, m: Msg): ConsoleState {
  switch (m.t) {
    case 'hydrate':
      return { ...m.payload, hydrated: true }

    case 'ready':
      return { ...s, hydrated: true }

    case 'begin': {
      const statuses = { ...s.statuses }
      for (const id of m.ids) {
        if (statusOf(s, id) === 'pending') statuses[id] = 'executing'
      }
      return { ...s, statuses }
    }

    case 'commit': {
      let state = s.state
      const statuses = { ...s.statuses }
      const log = [...s.log]

      for (const id of m.ids) {
        const proposal = s.brief.proposals.find((p) => p.id === id)
        if (!proposal || proposal.kind !== 'action') continue
        if (statuses[id] === 'executed') continue

        const before = state
        const { state: next, receipt } = execute(proposal, before)
        state = next
        statuses[id] = 'executed'
        log.unshift({
          id: `log_${id}_${Date.now()}`,
          proposalId: id,
          type: proposal.type,
          headline: proposal.headline,
          lifecycle: [
            'proposed',
            ...(s.modifiedIds.includes(id) ? (['modified'] as const) : []),
            ...(s.overriddenIds.includes(id) ? (['overridden'] as const) : []),
            'approved',
            'executed',
          ],
          params: proposal.params as Record<string, unknown>,
          receipt,
          reversibility: proposal.reversibility,
          maxCost: proposal.maxCost,
          atISO: new Date().toISOString(),
          stateBefore: before,
        })
      }

      return { ...s, state, statuses, log }
    }

    case 'reject': {
      const proposal = s.brief.proposals.find((p) => p.id === m.id)
      const log = [...s.log]
      if (proposal) {
        log.unshift({
          id: `log_${m.id}_${Date.now()}`,
          proposalId: m.id,
          type: proposal.kind === 'action' ? proposal.type : 'whop.broadcast.send',
          headline: proposal.headline,
          lifecycle: [
            'proposed',
            ...(s.modifiedIds.includes(m.id) ? (['modified'] as const) : []),
            'rejected',
          ],
          params: proposal.kind === 'action' ? (proposal.params as Record<string, unknown>) : {},
          receipt: [],
          reversibility: proposal.kind === 'action' ? proposal.reversibility : 'instant',
          maxCost: proposal.kind === 'action' ? proposal.maxCost : 0,
          atISO: new Date().toISOString(),
          rejectionReason: m.reason,
        })
      }
      return {
        ...s,
        statuses: { ...s.statuses, [m.id]: 'rejected' },
        rejectionReasons: { ...s.rejectionReasons, [m.id]: m.reason },
        log,
      }
    }

    case 'modify':
      return {
        ...s,
        brief: {
          ...s.brief,
          proposals: withParams(s.brief.proposals, m.id, m.params, s.state, s.policy),
        },
        modifiedIds: s.modifiedIds.includes(m.id) ? s.modifiedIds : [...s.modifiedIds, m.id],
      }

    case 'override':
      return {
        ...s,
        overriddenIds: s.overriddenIds.includes(m.id) ? s.overriddenIds : [...s.overriddenIds, m.id],
      }

    case 'toggleNav':
      return { ...s, navCollapsed: !s.navCollapsed }

    case 'reset':
      return { ...initial(), hydrated: true, navCollapsed: s.navCollapsed }
  }
}

interface ConsoleApi extends ConsoleState {
  approve: (id: string) => void
  approveMany: (ids: string[]) => void
  reject: (id: string, reason: string) => void
  modify: (id: string, params: Record<string, unknown>) => void
  override: (id: string) => void
  toggleNav: () => void
  reset: () => void
  statusOf: (id: string) => ProposalStatus
  verdictOf: (action: ProposedAction) => PolicyVerdict
  autoEligible: ProposedAction[]
}

const Ctx = createContext<ConsoleApi | null>(null)

export function ConsoleProvider({ children }: { children: ReactNode }) {
  const [s, dispatch] = useReducer(reducer, undefined, initial)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      const parsed = raw ? (JSON.parse(raw) as Persisted) : null
      if (parsed && parsed.v === STORAGE_VERSION) {
        dispatch({ t: 'hydrate', payload: fromPersisted(parsed) })
        return
      }
    } catch {
      /* corrupt, stale or unavailable storage — fall through to the seed */
    }
    dispatch({ t: 'ready' })
  }, [])

  useEffect(() => {
    if (!s.hydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersisted(s)))
    } catch {
      /* quota or private mode — the demo still works, it just won't persist */
    }
  }, [s])

  const timersRef = timers
  useEffect(() => () => timersRef.current.forEach(clearTimeout), [timersRef])

  const approveMany = useCallback((ids: string[]) => {
    if (!ids.length) return
    dispatch({ t: 'begin', ids })
    const handle = setTimeout(() => dispatch({ t: 'commit', ids }), EXECUTE_MS)
    timers.current.push(handle)
  }, [])

  const api = useMemo<ConsoleApi>(() => {
    const verdictOf = (action: ProposedAction) =>
      evaluate(action, s.policy, s.state.agentSpendToday)

    const autoEligible = s.brief.proposals.filter(
      (p): p is ProposedAction =>
        p.kind === 'action' &&
        (s.statuses[p.id] ?? 'pending') === 'pending' &&
        verdictOf(p).decision === 'auto',
    )

    return {
      ...s,
      approve: (id) => approveMany([id]),
      approveMany,
      reject: (id, reason) => dispatch({ t: 'reject', id, reason }),
      modify: (id, params) => dispatch({ t: 'modify', id, params }),
      override: (id) => dispatch({ t: 'override', id }),
      toggleNav: () => dispatch({ t: 'toggleNav' }),
      reset: () => {
        try {
          window.localStorage.removeItem(STORAGE_KEY)
        } catch {
          /* ignore */
        }
        dispatch({ t: 'reset' })
      },
      statusOf: (id) => statusOf(s, id),
      verdictOf,
      autoEligible,
    }
  }, [s, approveMany])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useConsole(): ConsoleApi {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useConsole must be used inside <ConsoleProvider>')
  return ctx
}
