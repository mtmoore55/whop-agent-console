'use client'

import { useState } from 'react'
import { ACTION_LABELS } from '@/lib/policy'
import { shareOfGap } from '@/lib/goal'
import { money } from '@/lib/format'
import { useConsole } from '@/lib/store'
import type { ProposedAction } from '@/lib/types'
import { ConflictNote } from './ConflictNote'
import { ModifyPanel } from './ModifyPanel'
import { Receipt } from './Receipt'
import { RiskRow } from './RiskRow'
import { Btn, Eyebrow, Tag } from './ui'
import { SparkButton } from './AiChat'

const REJECT_REASONS = ['risky', 'timing', 'too-broad', 'too-costly', 'not-now']

export function ActionCard({ action, index }: { action: ProposedAction; index: number }) {
  const {
    policy,
    goal,
    pace,
    statusOf,
    verdictOf,
    approve,
    reject,
    override,
    overriddenIds,
    modifiedIds,
    log,
  } = useConsole()
  const [mode, setMode] = useState<'idle' | 'modify' | 'reject'>('idle')
  const [reason, setReason] = useState('')

  const status = statusOf(action.id)
  const verdict = verdictOf(action)
  const overridden = overriddenIds.includes(action.id)
  const modified = modifiedIds.includes(action.id)
  const blocked = verdict.decision === 'blocked' && !overridden
  const entry = log.find((l) => l.proposalId === action.id)

  const tag =
    status === 'executed' ? (
      <Tag tone="green">Executed</Tag>
    ) : status === 'rejected' ? (
      <Tag tone="gray">Rejected</Tag>
    ) : status === 'executing' ? (
      <Tag tone="brand">Executing…</Tag>
    ) : blocked ? (
      <Tag tone="red">Blocked by policy</Tag>
    ) : verdict.decision === 'auto' ? (
      <Tag tone="green">Auto-eligible</Tag>
    ) : (
      <Tag tone="blue">Needs you</Tag>
    )

  const settled = status === 'executed' || status === 'rejected'

  return (
    <article
      className={`relative overflow-hidden rounded-xl border bg-card transition-colors duration-200 ${
        status === 'executed'
          ? 'border-green-9/40'
          : status === 'rejected'
            ? 'border-line-soft opacity-60'
            : blocked
              ? 'border-red-8/50'
              : 'border-line'
      } ${status === 'executing' ? 'executing' : ''}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-2.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="num text-[11px] text-faint">{String(index + 1).padStart(2, '0')}</span>
          <Eyebrow className="truncate">{ACTION_LABELS[action.type]}</Eyebrow>
          {modified && <Tag tone="blue">Modified</Tag>}
          {overridden && <Tag tone="amber">Overridden</Tag>}
        </div>
        {tag}
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="group/cell flex items-start justify-between gap-3">
          <h2
            className={`title text-[19px] leading-[1.25] sm:text-[21px] ${
              status === 'rejected' ? 'text-mute' : 'text-ink'
            }`}
          >
            {action.headline}
          </h2>
          <div className="mt-0.5">
            <SparkButton
              label="this proposal"
              ask={`The agent proposed: "${action.headline}". Worst case ${money(
                action.maxCost,
              )}, ${action.reversibility} to reverse, ${action.blastRadius} people affected. ${
                action.conflict ? `It flags a conflict: ${action.conflict.detail} ` : ''
              }Walk me through whether to approve it.`}
            />
          </div>
        </div>

        <RiskRow
          maxCost={action.maxCost}
          reversibility={action.reversibility}
          blastRadius={action.blastRadius}
          policy={policy}
        />

        {!settled && <ConflictNote action={action} />}

        {status === 'executed' && entry ? (
          <Receipt lines={entry.receipt} />
        ) : status === 'rejected' ? (
          <div className="flex items-center gap-2">
            <Eyebrow>Rejected as</Eyebrow>
            <span className="text-[14px] font-medium text-mute">{entry?.rejectionReason ?? '—'}</span>
          </div>
        ) : (
          <>
            <p className="max-w-[68ch] text-[14px] leading-[1.6] text-mute">{action.rationale}</p>

            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:gap-6">
              <div>
                <Eyebrow className="mb-2">Resting on</Eyebrow>
                <ul className="space-y-1.5">
                  {action.evidence.map((e) => (
                    <li key={e} className="flex gap-2 text-[13px] leading-snug text-faint">
                      <span className="mt-[7px] size-[3px] shrink-0 rounded-full bg-gray-8" />
                      <span className="num">{e}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* One estimate, not two. Contribution to the goal is the only
                  one comparable across proposals, so it leads and the raw
                  impact becomes its caption. */}
              <div className="sm:min-w-[190px] sm:border-l sm:border-line-soft sm:pl-5">
                {action.goalContribution ? (
                  <>
                    <Eyebrow className="mb-2">Toward {goal.label}</Eyebrow>
                    <div
                      className={`num text-[16px] font-semibold tracking-[-0.02em] ${
                        action.goalContribution.monthlyDelta > 0 ? 'text-ink' : 'text-mute'
                      }`}
                      title={action.goalContribution.basis}
                    >
                      {action.goalContribution.monthlyDelta > 0
                        ? `+${money(action.goalContribution.monthlyDelta)}/mo`
                        : 'holds the line'}
                    </div>
                    <div className="num mt-1.5 text-[12px] text-faint">
                      {action.goalContribution.monthlyDelta > 0 && pace.gap > 0
                        ? `${shareOfGap(action.goalContribution.monthlyDelta, pace).toFixed(1)}% of the gap · agent's estimate`
                        : "agent's estimate"}
                    </div>
                    <div className="mt-3 border-t border-line-soft pt-2.5 text-[12px] leading-snug text-faint">
                      {action.expectedImpact.metric}{' '}
                      {action.expectedImpact.direction === 'up' ? '↑' : '↓'}{' '}
                      {action.expectedImpact.estimate} · {action.expectedImpact.confidence}
                    </div>
                  </>
                ) : (
                  <>
                    <Eyebrow className="mb-2">If it works</Eyebrow>
                    <div className="text-[13px] leading-snug text-faint">
                      {action.expectedImpact.metric}
                    </div>
                    <div className="num mt-1.5 text-[16px] font-semibold tracking-[-0.02em] text-ink">
                      {action.expectedImpact.direction === 'up' ? '↑' : '↓'}{' '}
                      {action.expectedImpact.estimate}
                    </div>
                    <div className="eyebrow mt-1.5 text-faint">
                      {action.expectedImpact.confidence} confidence
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {blocked && verdict.blockedBy && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-8/50 bg-red-surface/60 px-3.5 py-3">
            <div className="min-w-0">
              <Eyebrow className="text-red-11">Blocked · {verdict.blockedBy.rule}</Eyebrow>
              <p className="mt-1.5 text-[13px] leading-snug text-mute">
                {verdict.blockedBy.detail}
              </p>
            </div>
            <Btn variant="danger" onClick={() => override(action.id)}>
              Override once
            </Btn>
          </div>
        )}

        {mode === 'modify' && <ModifyPanel action={action} onCancel={() => setMode('idle')} />}

        {mode === 'reject' && (
          <div className="rise rounded-xl border border-line bg-raise p-4">
            <Eyebrow className="mb-2.5">Why not? One word.</Eyebrow>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {REJECT_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`h-7 rounded-md px-2.5 text-[13px] font-medium transition-colors ${
                    reason === r
                      ? 'bg-blue-surface text-blue-11'
                      : 'bg-gray-4 text-mute hover:bg-gray-5 hover:text-ink'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value.trim().split(/\s+/)[0] ?? '')}
                placeholder="or type one"
                className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-ground px-2.5 text-[14px] outline-none placeholder:text-faint focus:border-blue-9"
              />
              <Btn
                variant="danger"
                disabled={!reason}
                onClick={() => {
                  reject(action.id, reason)
                  setMode('idle')
                }}
              >
                Reject
              </Btn>
              <Btn variant="ghost" onClick={() => setMode('idle')}>
                Cancel
              </Btn>
            </div>
            <p className="mt-3 text-[12px] leading-snug text-faint">
              The reason is kept. It is what teaches the agent to stop proposing this.
            </p>
          </div>
        )}

        {!settled && mode === 'idle' && (
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <Btn
              variant="primary"
              disabled={blocked || status === 'executing'}
              onClick={() => approve(action.id)}
            >
              {status === 'executing' ? 'Executing…' : 'Approve'}
            </Btn>
            <Btn onClick={() => setMode('modify')} disabled={status === 'executing'}>
              Modify
            </Btn>
            <Btn variant="ghost" onClick={() => setMode('reject')} disabled={status === 'executing'}>
              Reject
            </Btn>
          </div>
        )}

        {!settled && !blocked && verdict.reasons.length > 0 && (
          <div className="border-t border-line-soft pt-3">
            {verdict.reasons.map((r) => (
              <div key={r.rule} className="flex flex-wrap gap-x-2 gap-y-0.5 text-[12px] leading-snug">
                <span className="shrink-0 font-medium text-mute">{r.rule}</span>
                <span className="text-faint">{r.detail}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
