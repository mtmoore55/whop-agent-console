import { derive } from '../derive'
import { evaluate } from '../policy'
import type {
  ActionParams,
  ActionType,
  BusinessState,
  Observation,
  Policy,
  Proposal,
  ProposedAction,
} from '../types'
import { modelActionSchema, modelBriefSchema, modelObservationSchema } from './schema'

/**
 * Defensive parsing. Models wrap JSON in fences, add a sentence of preamble,
 * and occasionally emit one malformed proposal in an otherwise good brief.
 * Strip, isolate, validate per proposal, drop what fails, keep the rest.
 */

export function stripFences(raw: string): string {
  let s = raw.trim()

  // ```json ... ```  or  ``` ... ```
  const fence = s.match(/^```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```$/)
  if (fence) s = fence[1].trim()

  // Any preamble or trailing note around the object.
  const first = s.indexOf('{')
  const last = s.lastIndexOf('}')
  if (first > 0 || (last >= 0 && last < s.length - 1)) {
    if (first >= 0 && last > first) s = s.slice(first, last + 1)
  }

  return s.trim()
}

export interface ParsedBrief {
  lede: string
  proposals: Proposal[]
  /** Proposals the model returned that failed validation and were discarded. */
  dropped: number
  /** Why each one was dropped. A silent drop hides a schema that is too strict. */
  droppedReasons: string[]
}

/** Compact, readable reason: which field, and what was wrong with it. */
function why(err: { issues: { path: PropertyKey[]; message: string }[] }): string {
  return err.issues
    .slice(0, 3)
    .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('; ')
}

const slug = (t: ActionType) => t.replace(/^whop\./, '').replace(/\./g, '_')

export function parseBrief(
  raw: string,
  state: BusinessState,
  policy: Policy,
): ParsedBrief {
  const envelope = modelBriefSchema.parse(JSON.parse(stripFences(raw)))

  const proposals: Proposal[] = []
  const droppedReasons: string[] = []

  for (const [i, candidate] of envelope.proposals.entries()) {
    const kind = (candidate as { kind?: unknown })?.kind

    if (kind === 'observation') {
      const parsed = modelObservationSchema.safeParse(candidate)
      if (!parsed.success) {
        droppedReasons.push(`observation — ${why(parsed.error)}`)
        continue
      }
      proposals.push({ ...parsed.data, id: `p_obs_${i}` } satisfies Observation)
      continue
    }

    const parsed = modelActionSchema.safeParse(candidate)
    if (!parsed.success) {
      const t = (candidate as { type?: string })?.type ?? 'unknown type'
      droppedReasons.push(`${t} — ${why(parsed.error)}`)
      continue
    }

    const m = parsed.data
    const type = m.type as ActionType
    const params = m.params as ActionParams[ActionType]

    // Cost and blast radius come from the params, never from the model.
    const d = derive(type, params, state)
    // Approval comes from the policy engine, never from the model.
    const verdict = evaluate(
      { type, maxCost: d.maxCost, reversibility: m.reversibility, blastRadius: d.blastRadius },
      policy,
      state.agentSpendToday,
    )

    proposals.push({
      kind: 'action',
      id: `p_${slug(type)}_${i}`,
      type,
      params,
      headline: m.headline,
      rationale: m.rationale,
      evidence: m.evidence,
      expectedImpact: m.expectedImpact,
      reversibility: m.reversibility,
      conflict: m.conflict,
      maxCost: d.maxCost,
      blastRadius: d.blastRadius,
      requiresApproval: verdict.requiresApproval,
    } as ProposedAction)
  }

  if (proposals.length === 0) throw new Error('every proposal failed validation')

  // The brief must always carry something the owner is choosing not to do.
  if (!proposals.some((p) => p.kind === 'observation')) {
    throw new Error('brief contained no observation')
  }

  return {
    lede: envelope.lede,
    proposals: proposals.slice(0, 6),
    dropped: droppedReasons.length,
    droppedReasons,
  }
}
