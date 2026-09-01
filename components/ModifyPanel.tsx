'use client'

import { useMemo, useState } from 'react'
import { PARAM_FIELDS, derive, type FieldDef } from '@/lib/derive'
import { count, money } from '@/lib/format'
import { useConsole } from '@/lib/store'
import type { ProposedAction } from '@/lib/types'
import { Btn, Eyebrow } from './ui'

type Draft = Record<string, unknown>

function Field({
  def,
  value,
  onChange,
}: {
  def: FieldDef
  value: unknown
  onChange: (v: unknown) => void
}) {
  const base =
    'h-8 w-full rounded-lg border border-line bg-ground px-2.5 text-[14px] text-ink outline-none transition-colors focus:border-blue-9'

  return (
    <label className="block">
      <Eyebrow className="mb-1.5">{def.label}</Eyebrow>
      {def.kind === 'select' ? (
        <select
          className={`${base} appearance-none`}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        >
          {def.options?.map((o) => (
            <option key={o.value} value={o.value} className="bg-ground">
              {o.label}
            </option>
          ))}
        </select>
      ) : def.kind === 'number' ? (
        <div className="flex items-center gap-1.5">
          {def.prefix && <span className="num text-[14px] text-faint">{def.prefix}</span>}
          <input
            type="number"
            inputMode="numeric"
            className={`${base} num`}
            min={def.min}
            max={def.max}
            step={def.step ?? 1}
            value={Number(value ?? 0)}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          {def.suffix && <span className="num text-[14px] text-faint">{def.suffix}</span>}
        </div>
      ) : (
        <input
          type="text"
          className={base}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {def.help && <div className="mt-1.5 text-[12px] leading-snug text-faint">{def.help}</div>}
    </label>
  )
}

function Delta({
  label,
  before,
  after,
}: {
  label: string
  before: string
  after: string
}) {
  const changed = before !== after
  return (
    <div className="flex items-baseline gap-2">
      <Eyebrow className="w-[92px] shrink-0">{label}</Eyebrow>
      <span className={`num text-[14px] ${changed ? 'text-faint line-through' : 'text-mute'}`}>
        {before}
      </span>
      {changed && (
        <>
          <span className="text-[13px] text-faint">→</span>
          <span className="num text-[14px] font-semibold text-blue-11">{after}</span>
        </>
      )}
    </div>
  )
}

export function ModifyPanel({
  action,
  onCancel,
}: {
  action: ProposedAction
  onCancel: () => void
}) {
  const { state, modify } = useConsole()
  const [draft, setDraft] = useState<Draft>(() => ({ ...(action.params as Draft) }))

  const preview = useMemo(
    () => derive(action.type, draft as never, state),
    [action.type, draft, state],
  )

  const fields = PARAM_FIELDS[action.type]
  const dirty = fields.some((f) => draft[f.key] !== (action.params as Draft)[f.key])

  return (
    <div className="rise rounded-xl border border-line bg-raise p-4">
      <Eyebrow className="mb-3">Edit the actual parameters</Eyebrow>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <Field
            key={f.key}
            def={f}
            value={draft[f.key]}
            onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
          />
        ))}
      </div>

      <div className="mt-4 space-y-1.5 border-t border-line-soft pt-3.5">
        <Delta label="Max cost" before={money(action.maxCost)} after={money(preview.maxCost)} />
        <Delta
          label="Blast radius"
          before={count(action.blastRadius)}
          after={count(preview.blastRadius)}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Btn
          variant="primary"
          disabled={!dirty}
          onClick={() => {
            modify(action.id, draft)
            onCancel()
          }}
        >
          Save changes
        </Btn>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
      </div>
    </div>
  )
}
