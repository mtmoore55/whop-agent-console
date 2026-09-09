'use client'

import Link from 'next/link'
import { clockTime } from '@/lib/format'
import { useConsole } from '@/lib/store'
import { Btn, Hint, Tag } from './ui'

/**
 * Which path produced the brief on screen. Honest by construction: the route
 * decides, the UI only reports. Never claims Live when Cached ran.
 */
function SourceChip() {
  const { brief, agent } = useConsole()

  if (brief.source === 'live') {
    return (
      <Hint
        label={`Written just now by ${agent.model ?? 'the model'}, reading your current numbers. It proposes; the policy on the Console decides what needs you.`}
      >
        <Tag tone="green">Live{agent.model ? ` · ${agent.model}` : ''}</Tag>
      </Hint>
    )
  }
  if (brief.source === 'cached') {
    return (
      <Hint
        label={`The agent could not run, so this is the checked-in fallback brief. Reason: ${
          agent.reason ?? 'unknown'
        }. It goes through the same validation a live answer does.`}
      >
        <Tag tone="amber">Cached</Tag>
      </Hint>
    )
  }
  return (
    <Hint label="The worked example this demo ships with. The agent has not run yet — press Re-run agent for a brief written from the numbers live.">
      <Tag tone="gray">Example brief</Tag>
    </Hint>
  )
}

export function AgentBar() {
  const { brief, agent, runAgent, memory } = useConsole()
  const running = agent.state === 'running'

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
      <Hint label="Everything below this line was written by the agent, not by a person. You decide what runs.">
        <Tag tone="brand">Agent</Tag>
      </Hint>

      <span className="text-[13px] text-faint">
        Daily brief · generated {clockTime(brief.generatedAtISO)}
      </span>

      <SourceChip />

      {!!agent.dropped && (
        <Hint label={`The agent returned ${agent.dropped} proposal${
          agent.dropped === 1 ? '' : 's'
        } whose parameters failed validation. They were discarded rather than shown to you.`}>
          <Tag tone="red">{agent.dropped} discarded</Tag>
        </Hint>
      )}

      {memory.length > 0 && (
        <Hint label="Proposals you rejected, with the one-word reason you gave. The agent is told about these before it writes the next brief, so it stops asking.">
          <Link
            href="/console"
            className="text-[13px] text-faint underline decoration-line underline-offset-4 transition-colors hover:text-ink"
          >
            Remembers {memory.length} rejection{memory.length === 1 ? '' : 's'} →
          </Link>
        </Hint>
      )}

      <Btn
        variant="ghost"
        className="ml-auto"
        disabled={running}
        onClick={runAgent}
        title="Ask the agent to read the business and write a fresh brief"
      >
        {running ? 'Reading the business…' : 'Re-run agent'}
      </Btn>
    </div>
  )
}
