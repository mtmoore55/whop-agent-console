'use client'

import Link from 'next/link'
import { clockTime } from '@/lib/format'
import { useConsole } from '@/lib/store'
import { Btn, Tag } from './ui'

/**
 * Which path produced the brief on screen. Honest by construction: the route
 * decides, the UI only reports. Never claims Live when Cached ran.
 */
function SourceChip() {
  const { brief, agent } = useConsole()

  if (brief.source === 'live') {
    return <Tag tone="green">Live{agent.model ? ` · ${agent.model}` : ''}</Tag>
  }
  if (brief.source === 'cached') {
    return <Tag tone="amber">Cached</Tag>
  }
  return <Tag tone="gray">Seeded</Tag>
}

export function AgentBar() {
  const { brief, agent, runAgent, memory } = useConsole()
  const running = agent.state === 'running'

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
      <Tag tone="brand">Agent</Tag>

      <span className="text-[13px] text-faint">
        Daily brief · generated {clockTime(brief.generatedAtISO)}
      </span>

      <SourceChip />

      {brief.source === 'cached' && agent.reason && (
        <span className="text-[13px] text-faint">{agent.reason}</span>
      )}

      {!!agent.dropped && (
        <Tag tone="red">
          {agent.dropped} dropped
        </Tag>
      )}

      {memory.length > 0 && (
        <Link
          href="/console"
          className="text-[13px] text-faint transition-colors hover:text-ink"
          title="What the agent has learned from your rejections"
        >
          {memory.length} learned →
        </Link>
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
