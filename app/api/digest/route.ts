import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { parseBrief } from '@/lib/agent/parse'
import { buildSystemPrompt, buildUserPrompt } from '@/lib/agent/prompt'
import cachedBrief from '@/lib/agent/cached-brief.json'
import { DEFAULT_POLICY } from '@/lib/policy'
import { freshState } from '@/lib/seed'
import type { MemoryEntry } from '@/lib/memory'
import type { ActionType, BusinessState, Policy } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

/** The brief's own choice, overridable without a redeploy. */
const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'

/**
 * Interactive request, so the agent gets a bounded budget rather than an
 * unbounded one. Anything slower than this is worse than the cached brief.
 */
const TIMEOUT_MS = 30_000

type Mode = 'live' | 'cached'

interface DigestRequest {
  state?: BusinessState
  policy?: Policy
  memory?: MemoryEntry[]
}

interface HeldBack {
  type: ActionType
  reason: string
  headline: string
}

/**
 * Cached mode has no model to read the rejection memory, so it applies the
 * same intent mechanically: an action type the owner has already turned down
 * is withheld, and reported as withheld. Live mode does not do this — there
 * the memory is in the system prompt, and whether the agent listens is the
 * thing worth watching.
 */
function withholdRejected(
  proposals: unknown[],
  memory: MemoryEntry[],
): { kept: unknown[]; heldBack: HeldBack[] } {
  if (memory.length === 0) return { kept: proposals, heldBack: [] }

  const reasonByType = new Map<string, MemoryEntry>()
  for (const m of memory) if (!reasonByType.has(m.type)) reasonByType.set(m.type, m)

  const kept: unknown[] = []
  const heldBack: HeldBack[] = []

  for (const p of proposals) {
    const candidate = p as { kind?: string; type?: string; headline?: string }
    const hit = candidate.kind === 'action' && candidate.type ? reasonByType.get(candidate.type) : undefined
    if (hit) {
      heldBack.push({
        type: hit.type,
        reason: hit.reason,
        headline: candidate.headline ?? hit.headline,
      })
      continue
    }
    kept.push(p)
  }

  return { kept, heldBack }
}

function servedFromCache(
  state: BusinessState,
  policy: Policy,
  memory: MemoryEntry[],
  reason: string,
) {
  const source = cachedBrief as { lede: string; proposals: unknown[] }
  const { kept, heldBack } = withholdRejected(source.proposals, memory)

  // Same validator as the live path, so cached output can never drift.
  const parsed = parseBrief(
    JSON.stringify({ lede: source.lede, proposals: kept }),
    state,
    policy,
  )

  return {
    ok: true as const,
    mode: 'cached' satisfies Mode as Mode,
    reason,
    memoryApplied: memory.length ? ('filter' as const) : ('none' as const),
    heldBack,
    ...parsed,
  }
}

export async function POST(req: Request) {
  let body: DigestRequest = {}
  try {
    body = (await req.json()) as DigestRequest
  } catch {
    /* an unparseable body just means we fall back to the seed state */
  }

  const state = body.state ?? freshState()
  const policy = body.policy ?? DEFAULT_POLICY
  const memory = Array.isArray(body.memory) ? body.memory.slice(0, 40) : []

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      servedFromCache(state, policy, memory, 'No ANTHROPIC_API_KEY configured'),
    )
  }

  try {
    const client = new Anthropic({ maxRetries: 1 })

    const response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 16000,
        thinking: { type: 'adaptive' },
        // Medium keeps a morning digest inside a human-scale wait; the cached
        // brief is a better outcome than a slow one.
        output_config: { effort: 'medium' },
        system: buildSystemPrompt(memory),
        messages: [{ role: 'user', content: buildUserPrompt(state) }],
      },
      { timeout: TIMEOUT_MS },
    )

    if (response.stop_reason === 'refusal') throw new Error('model declined the request')

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    if (!text.trim()) throw new Error('model returned no text')

    // Every field is re-validated here. State strings are attacker-shaped in
    // principle (promo codes, broadcast subjects), so nothing the model echoes
    // back can widen the action set beyond the schema.
    const parsed = parseBrief(text, state, policy)

    return NextResponse.json({
      ok: true,
      mode: 'live' satisfies Mode as Mode,
      model: MODEL,
      memoryApplied: memory.length ? ('prompt' as const) : ('none' as const),
      heldBack: [] as HeldBack[],
      ...parsed,
    })
  } catch (err) {
    // Never surface a stack trace. This gets opened on phones at odd hours.
    const reason =
      err instanceof Anthropic.APIError
        ? `Anthropic API error ${err.status ?? ''}`.trim()
        : err instanceof Error && /aborted|timeout/i.test(err.message)
          ? 'Agent timed out'
          : 'Agent call failed'

    return NextResponse.json(servedFromCache(state, policy, memory, reason))
  }
}
