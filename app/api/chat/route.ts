import Anthropic from '@anthropic-ai/sdk'
import { goalPace } from '@/lib/goal'
import { DEFAULT_POLICY, policySentence } from '@/lib/policy'
import { freshGoal, freshState } from '@/lib/seed'
import type { BusinessState, Goal, Policy } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 120

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  messages?: ChatMessage[]
  state?: BusinessState
  goal?: Goal
  policy?: Policy
}

function systemPrompt(state: BusinessState, goal: Goal, policy: Policy): string {
  const pace = goalPace(state, goal)
  return `You are the assistant inside ${state.business.name}'s Whop dashboard. The owner has opened you from their agent console and is asking about their own business.

Today is ${state.business.todayISO}. Here is the complete state:

${JSON.stringify(state, null, 2)}

Their goal is ${goal.label} of $${goal.target.toLocaleString('en-US')}/mo by ${goal.byISO}. They are at $${Math.round(pace.current).toLocaleString('en-US')}/mo, ${pace.pctOfGoal.toFixed(0)}% of the way, growing ${pace.monthlyGrowthPct.toFixed(1)}%/mo${
    pace.requiredMonthlyGrowthPct === null
      ? ''
      : ` against the ${pace.requiredMonthlyGrowthPct.toFixed(1)}%/mo needed to arrive on time`
  }. Status: ${pace.status}.

Their standing policy: ${policySentence(policy)}

How to answer:
- Short. Two or three sentences unless they ask for more. This is a side panel, not a report.
- Use only numbers present in the state, or arithmetic on them. Never invent a metric.
- Plain prose. No markdown headings, no bullet lists unless they ask for a list.
- If the honest answer is that the data does not say, say that.
- You advise; you do not execute. Proposals with real consequences go through the brief and the approval gate, so point there rather than pretending you can act.`
}

export async function POST(req: Request) {
  let body: ChatRequest = {}
  try {
    body = (await req.json()) as ChatRequest
  } catch {
    /* fall through to defaults */
  }

  const state = body.state ?? freshState()
  const goal = body.goal ?? freshGoal()
  const policy = body.policy ?? DEFAULT_POLICY
  const messages = (body.messages ?? []).slice(-12).filter((m) => m.content?.trim())

  if (messages.length === 0) {
    return new Response('Ask me something about the business.', {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      'The live assistant needs ANTHROPIC_API_KEY set on this deployment. Everything else on this page works without it — the brief falls back to a checked-in agent response.',
      { headers: { 'content-type': 'text/plain; charset=utf-8' } },
    )
  }

  try {
    const client = new Anthropic({ maxRetries: 0 })
    const stream = client.messages.stream(
      {
        model: MODEL,
        max_tokens: 1200,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'low' },
        system: systemPrompt(state, goal, policy),
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      },
      { timeout: 60_000 },
    )

    // Streamed so the panel fills in as it thinks rather than sitting blank.
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        const enc = new TextEncoder()
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta' &&
              event.delta.text
            ) {
              controller.enqueue(enc.encode(event.delta.text))
            }
          }
        } catch {
          controller.enqueue(enc.encode('\n\n(The assistant stopped early. Try again.)'))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(body, {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    return new Response(
      `The assistant could not answer just now${message ? ` — ${message.slice(0, 120)}` : ''}.`,
      { headers: { 'content-type': 'text/plain; charset=utf-8' } },
    )
  }
}
