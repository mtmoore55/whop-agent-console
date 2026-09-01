# Whop Agent Console — Working Spec

> Source of truth for this repo. The original brief is preserved verbatim at
> [`whop-agent-console-spec.md`](./whop-agent-console-spec.md); this file is the
> restructured build document (decisions log + milestone checklists).

---

## 1. Overview

A working prototype of the **human console for an agent-run business on Whop**.

Whop shipped a CLI in July 2026 that lets business owners and their AI agents launch
products, set prices, run ad campaigns, check stats, and move money. The capability
exists. The layer that lets a human safely *supervise* an agent doing all of that does not.

This prototype is that layer. The core loop:

1. An agent wakes on a schedule and reads the state of the business
2. It writes a brief: what happened, what it means
3. It proposes a small number of concrete, executable actions with reasoning and expected impact
4. The human approves, modifies, or rejects each one — with real consequences visible before they commit
5. Approved actions execute, produce receipts, and land in an audit log with a reversal path

**The product is the approval gate, not the digest.** The digest is the reason the gate
exists. Design accordingly.

---

## 2. Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) + TypeScript, Vercel-deployable |
| Styling | Tailwind v4. No component library defaults left visible. |
| Model access | `@anthropic-ai/sdk`, **server-side only**, in a route handler |
| Secrets | `ANTHROPIC_API_KEY` in env — never in the client bundle |
| Persistence | None. JSON seed + localStorage-backed store that survives refresh |
| Escape hatch | A "Reset demo" control restores seed state |

### Decisions log

| # | Decision | Rationale |
| --- | --- | --- |
| D1 | Model id is the brief's **`claude-sonnet-4-6`**, overridable via `ANTHROPIC_MODEL` | *Corrected at M2.* An earlier note here claimed `claude-sonnet-4-6` was not a real model id. It is. The brief's choice stands. |
| D2 | **Whop's own design tokens**, read off the live dashboard: gray-1 `#111111` ground, gray-2 `#191919` card, gray-4 `#2a2a2a` line, gray-12 `#eeeeee` ink, gray-11/10 for secondary text. Primary action is blue-9 `#1754d8`; brand orange `#FA4616` is the mark and the agent, never a button; red-11 `#ff9081` for over-limit and blocked; amber for conflicts. Radii 6/8/12. | Supersedes the brief's "adjacent, don't clone" line at the user's explicit direction: the console should read as part of Whop, not next to it |
| D3 | Type: **Inter**, as the dashboard uses. Numerals are Inter with `tabular-nums`, not a mono face. Body 14px / `-0.005625em`; titles 600 weight / `-0.037em`. | Matching Whop means matching its type, including the absence of a mono numeric face |
| D3a | The real Whop lockup ships in `components/WhopMark.tsx` (orange chevrons + `currentColor` wordmark) | Explicitly requested; the prototype is a Whop-surface concept, so it carries the mark |
| D4a | The left rail reproduces the dashboard's real nav — 40px rows, 9px inset, 14px radius, 16px/500 at `rgba(255,255,255,.686)`, `gray-4` active fill, 18px section gaps, 60px switcher squares — with the 14 solid 20x20 icons lifted from the live sidebar (`components/icons.tsx`) | "As real as possible." Every value was measured off the running dashboard rather than eyeballed |
| D4b | Whop-native rows (Home, Analytics, Products, …) render but are inert, with a `title` saying so. Only the Agent section routes. | The prototype owns one surface. Showing the rest as context is honest; wiring fake screens would not be |
| D4 | Money gets *size* proportional to magnitude (`costScale()` maps dollars → px on a log curve) | Brief: "a $61,000 treasury move should not look like a $40 ad budget change" |
| D5 | Store is a `useReducer` context with a full `BusinessState` snapshot per log entry | Makes M3's Undo a state swap rather than an inverse-executor per action type |
| D6 | Modify ships in M1 | It is one of the two proposals that carry the demo; the Brief is incomplete without it |
| D7 | `whop.payout.schedule` defaults to `never` in the seeded policy | Gives the plain-language policy line a second concrete prohibition |

---

## 3. Data model

### `BusinessState` (`lib/types.ts`, seeded in `lib/seed.ts`)

One specific, believable Whop seller. Numbers feel lived-in, not round.

**"Range" — a paid trading-education community.**

- 1,847 active members at $32/mo
- MRR $57,340, up 4.1% over 30 days
- Trailing 30-day churn 8.4%, up from 6.2% — **this is the story of the day**
- 312 lapsed members in the last 90 days
- Two products: the community ($32/mo) and a one-time course ($149)
- Whop Ads: one active Meta campaign, $240/day, CAC $61, drifting up from $44
- Affiliates: not enabled. Bounties: never used.
- Balance $84,120 — $65,720 settled, $18,400 in a 3-day clearing window; **$61,000 sits idle**, earning nothing
- Obligation: $12,400 creator payout due in 6 days
- 3 open issues, one spiking: checkout webhook timeouts, 41 events/24h, correlated with a drop in completed mobile checkouts

The agent reads this object. Actions mutate it.

### Action schema

The agent may only propose actions from this fixed set. Typed strictly; model output is
validated against it and anything malformed is dropped.

```ts
type ActionType =
  | 'whop.pricing.update'
  | 'whop.promo.create'
  | 'whop.affiliate.enable'
  | 'whop.affiliate.set_rate'
  | 'whop.bounty.create'
  | 'whop.ads.campaign.create'
  | 'whop.ads.campaign.adjust_budget'
  | 'whop.ads.campaign.pause'
  | 'whop.treasury.move'
  | 'whop.payout.schedule'
  | 'whop.broadcast.send'
  | 'whop.product.create'
  | 'whop.checkout_link.create'
```

Every proposed action carries:

```ts
interface ProposedAction {
  id: string
  type: ActionType
  params: Record<string, unknown>   // typed per action type via ActionParams[T]
  headline: string                  // one line, plain language
  rationale: string                 // 2-3 sentences
  evidence: string[]                // which metrics in BusinessState drove this
  expectedImpact: { metric: string; direction: 'up' | 'down'; estimate: string; confidence: 'low' | 'medium' | 'high' }
  maxCost: number                   // worst-case dollars at risk
  reversibility: 'instant' | 'costly' | 'irreversible'
  blastRadius: number               // how many humans see or feel this
  requiresApproval: boolean         // computed by the policy engine, not the model
}
```

A proposal may also be an **observation** — a do-nothing / keep-watching item with no
executable payload. At least one is required per brief.

### Policy engine (`lib/policy.ts`)

`requiresApproval` is **never** decided by the model. It is computed from cost,
reversibility and blast radius against the owner's standing policy. The model proposes;
the policy decides what needs a human.

```ts
interface Policy {
  perType: Record<ActionType, 'auto' | 'ask' | 'never'>
  dailySpendCapUSD: number
  perActionCostCeilingUSD: number
  broadcastCeiling: number
}
```

Rules, in evaluation order — first blocking rule wins, all forcing rules accumulate:

1. `perType === 'never'` → **blocked**
2. `maxCost + spentToday > dailySpendCapUSD` → **blocked** (daily cap)
3. `maxCost > perActionCostCeilingUSD` → forces **ask**
4. `blastRadius > broadcastCeiling` → forces **ask**
5. `reversibility === 'irreversible'` → forces **ask**
6. otherwise `perType` decides: `auto` → no approval needed, `ask` → approval needed

Rule 2 applies only to **spend-type** actions (`SPEND_ACTION_TYPES` in `lib/policy.ts`:
ad campaign create/adjust, bounty create, payout schedule). Moving your own money between
your own accounts is not agent spend, which is why the $61,000 treasury sweep is measured
against the per-action ceiling and reaches the human rather than being auto-blocked.

Blocked cards name the specific rule that blocked them and offer a one-time override.

---

## 4. Surfaces

### 4.0 Shell

`AppShell` = `TopBar` (full-width, 56px, Whop mark + business) + `SideNav` (279px, collapses
to 76px) + content. `MobileNav` replaces the rail with a bottom bar under 768px. Nav data
lives in `components/nav-items.ts`; giving an item an `href` is all it takes to make it live.

### 4.1 The Brief (`/`)

The morning digest, and the first thing anyone sees.

- One-sentence lede: the thing that changed
- A compact state-of-business strip (MRR, churn, CAC, balance, open issues) — glanceable, not a dashboard
- The proposed actions as a stack of cards

Each card shows headline, rationale, the evidence it rests on, and — before any
interaction — the three numbers that decide whether you should say yes: **max cost,
reversibility, blast radius**. Visible without expanding anything. A person should be
able to decline without reading the reasoning.

Each card has **Approve / Modify / Reject**. Reject asks for a one-word reason (this
feeds M4's memory). Modify opens an inline editor of the action's actual parameters, not
a text box. A batch control approves everything auto-eligible, showing combined cost first.

### 4.2 The Console (`/console`)

- Per-action-type policy: auto-approve / ask me / never
- Daily agent spend cap, with today's remaining budget shown against it
- Per-action cost ceiling above which approval is always required
- Broadcast ceiling: never message more than N members without approval
- A plain-language rendering of the current policy

Enforcement must be visibly real: an over-cap proposal shows as blocked, names the rule,
and offers a one-time override.

### 4.3 The Log (`/log`)

**Seeded with ten days of prior history** (`lib/seed-log.ts`). An audit trail that opens
empty proves nothing, and this is the screen that is supposed to make the other two
trustworthy. The entries are consistent with `SEED_STATE` by construction: the Meta
campaign sits at $240/day because of the raise on Aug 31, the $12,400 obligation exists
because the owner overrode policy to schedule it on Aug 20, the August webinar checkout
link is in state, and everything else was either rejected or undone so it left no trace to
reconcile. Four of them are rejections, so the Brief shows agent memory on a first visit
without anyone having to click.

Seeded entries carry no `stateBefore`. They predate the session, so there is nothing
honest to restore, and the Log labels them **Archived** rather than offering an Undo that
would quietly do the wrong thing. Actions taken in-session still get a real Undo.

Every action ever proposed with its full lifecycle: proposed → approved/modified/rejected
→ executed → outcome. Each executed action gets a receipt of what changed in the business
state, and where `reversibility === 'instant'`, a working **Undo** that actually reverts.
This screen is what makes the other two trustworthy. Don't stub it.

**Undo replays.** Restoring an entry's `stateBefore` alone would silently discard every
action taken after it. Instead Undo restores that snapshot and then re-applies every later
executed, non-undone entry in order, refreshing each of their snapshots as it goes — so a
second undo afterwards is still correct. Only `instant` actions offer it; `costly` and
`irreversible` ones say plainly that undo here would be a lie.

---

## 5. The two proposals that matter

**The one you should reject** — `whop.treasury.move`: sweep $61,000 of idle balance into
yield, correctly noting it earns nothing today. Real upside. But a $12,400 payout is due
in 6 days, yield settles in 7, and the sweep leaves only $4,720 settled behind an $18,400
clearing window. The console surfaces the obligation *adjacent to the balance the action
touches* — and does **not** auto-block. The human catches it. That's the demo.

**The one you should modify** — `whop.promo.create`: 40% off for 90 days to all 312 lapsed
members. Blast radius 312; the code leaks to active members paying full price. The right
move is to modify it down — lower discount, shorter window, capped redemptions. Modify has
to make that a fifteen-second edit of real parameters.

The rest are genuinely good: enable affiliates at a suggested rate, a referral bounty,
a rebudget of the campaign whose CAC is drifting, and one non-action flag on the checkout
webhook errors recommending more data before acting.

---

## 6. The agent

A single server route, `POST /api/digest`, sending `BusinessState` to Claude with a system
prompt that:

- Frames it as the operator of this business, reporting to an owner who has a few minutes
- Requires JSON-only output — no prose wrapper, no markdown fences
- Requires it to open with the single most important thing that changed, not a metric dump
- Caps proposals at 6 and requires at least one do-nothing / keep-watching observation
- Forbids inventing metrics not present in the state

Parse defensively: strip fences, validate against a Zod schema, fall back to cached output
on failure.

### Demo mode (required, not optional)

- **Live** — hits the Anthropic API, generates fresh
- **Cached** — serves a checked-in JSON response with a short artificial delay

Default Live, fall back to Cached automatically on any error or timeout, and surface a
small honest indicator of which ran. This will be opened on phones at odd hours. It must
never show a stack trace.

---

## 7. Aesthetic direction

**This section supersedes the original brief's "adjacent, don't clone" instruction.** The
console uses Whop's actual dashboard design system so it reads as a surface inside the
product. Tokens live in `app/globals.css` under `@theme`.

| Role | Token | Value |
| --- | --- | --- |
| Page ground | `gray-1` | `#111111` |
| Card | `gray-2` | `#191919` |
| Raised / inset | `gray-3` | `#222222` |
| Hairline | `gray-4` | `#2a2a2a` |
| Body text | `gray-12` / `gray-11` / `gray-10` | `#eeeeee` / `#b4b4b4` / `#7b7b7b` |
| Primary action | `blue-9` | `#1754d8`, white label, 8px radius, 32px tall, 14px/500 |
| Brand | `brand` | `#FA4616` — the mark, the agent tag, the execution sweep, the budget bar. Never a button. |
| Over-limit / blocked | `red-11` / `red-surface` | `#ff9081` / `#311511` |
| Conflict | `amber-9` / `amber-surface` | `#ffc53d` / `#271f13` |
| Executed | `green-11` / `green-surface` | `#3dd68c` / `#15251d` |
| Radii | badges 6 · buttons/inputs 8 · cards 12 | |
| Type | Inter, `tabular-nums` on all figures | body 14px `-0.005625em`; titles 600 `-0.037em` |

What the brief asked for still holds inside that system:

- Money and risk numbers get visual weight proportional to their actual weight
  (`costScale()` maps dollars to a font size on a log curve, clamped on narrow screens)
- Density is fine. This is a tool someone reads every morning, not a landing page.
- Motion only on state transitions that represent something real: an action executing, a
  balance changing, a budget depleting
- The shell is Whop's: full-width 56px header, left rail beneath it, content to the right.
  The rail collapses to a 76px icon strip (state lives in the store, so Reset demo leaves
  it alone), and drops to a bottom bar under 768px exactly as the dashboard does.

---

## 8. Milestones

### Milestone 1 — get it running ✅
- [x] `BusinessState` typed and seeded (`lib/types.ts`, `lib/seed.ts`)
- [x] Action schema, strictly typed per-action params (`lib/types.ts`)
- [x] Policy engine with the six rules and a seeded default policy (`lib/policy.ts`)
- [x] Cost and blast radius **derived** from real params (`lib/derive.ts`), so Modify moves them
- [x] Local executors + receipts for every action type (`lib/execute.ts`)
- [x] Store: reducer + localStorage persistence + Reset demo (`lib/store.tsx`)
- [x] The Brief at `/` with seeded proposals, incl. the reject-one and the modify-one
- [x] Approve / Reject that actually mutate `BusinessState`
- [x] Modify: inline editor of real parameters with a live cost delta (D6)
- [x] Batch approve of auto-eligible actions, combined cost shown before it fires
- [x] Blocked-by-policy card state naming the rule, plus a one-time override *(pulled
      forward from M3 — it is card behaviour on the Brief, and the engine already had it)*
- [x] Whop design system, Inter, and the real lockup
- [x] The dashboard's left rail, collapsible, with the real icon set (D4a, D4b)
- [x] Mobile: bottom bar under 768px, 2-up stat grid, cost type scales with the viewport
- [x] `next build` clean, lint clean, deployable

### Milestone 2 — the live agent ✅
- [x] `POST /api/digest` with `@anthropic-ai/sdk`, server-side only, 30s budget
- [x] System prompt per §6 (`lib/agent/prompt.ts`)
- [x] Zod validation, fence stripping, per-proposal malformed drop (`lib/agent/parse.ts`)
- [x] Cached fallback (`lib/agent/cached-brief.json`) — **model-shaped**, so it runs through
      the identical validator and can never drift from what live produces
- [x] Automatic fallback on missing key, API error, refusal, timeout, or unparseable output
- [x] Honest Live/Cached indicator naming the model, plus the reason cached ran
- [x] Dropped proposals report *why* (`droppedReasons`) — a silent drop hides a schema
      that is too strict, and hid exactly that here

**Two bugs the live path only revealed once it ran against the real API.** Neither was
visible from the cached path, which is worth remembering: cached mode exercises the parser
but not the model.

1. *Retry into the function limit.* The SDK retries timeouts, so a 30s budget with
   `maxRetries: 1` could run 60s — past `maxDuration`, and Vercel killed the function
   before the cached fallback could return. The user got `FUNCTION_INVOCATION_TIMEOUT`,
   the one thing the fallback exists to prevent. Fixed: `maxRetries: 0`, streamed request,
   budget kept well under `maxDuration`.
2. *The prompt never gave the model the param contract.* It listed the thirteen action
   types but not their fields or enum values, so the model guessed — `destination`,
   `audience`, `recipientCount`, `subject` all came back wrong and **3 of 4 proposals were
   dropped**. Fixed by putting the exact contract in the system prompt (`PARAMS_DOC`,
   defined next to the Zod schema so the two stay in sync). Result: 0 dropped, 6 kept.

Live runs take roughly 40s at `effort: 'low'`. That is a real wait; the brief stays on
screen and the button reads "Reading the business…" until it returns.

### Milestone 3 — console + log ✅
- [x] `/console`: per-type stance, three limits, live plain-language rendering
- [x] Live enforcement preview — what this policy does to today's undecided proposals
- [x] `/log` with full lifecycle chips, receipts, and totals
- [x] Working Undo for `instant` actions, with replay (see below)
- [x] Console and Log routed in the rail and the mobile bottom bar

### Milestone 4 — rejection memory ✅
- [x] Rejections + reasons become memory (`lib/memory.ts`), derived from the log
- [x] Live: memory is injected into the system prompt as "what this owner has already told you"
- [x] Cached: the same intent applied mechanically — a rejected action type is withheld and
      **reported as withheld**, never silently dropped
- [x] "Learned from you" panel on the Brief and Console, with per-entry Forget
- [x] An action type rejected twice is marked a standing no

---

## 9. Deployment

Repo: `github.com/mtmoore55/whop-agent-console` (private).
Vercel project: `mtmoore55s-projects/whop-agent-console`.

Vercel deployments are immutable, so **every milestone keeps a permanent URL**. Each one
gets a git tag and an alias pinned to that exact build; nothing deployed later can move it
unless the alias is re-pointed on purpose.

M2, M3 and M4 were built and shipped as a single increment, so they share one tag and one
URL rather than three. There is no `-m2` or `-m3` alias, because there was never a build
that was only M2 or only M3 — inventing one would make the URLs lie about the history.

| URL | Tag | What it serves |
| --- | --- | --- |
| `whop-agent-console-m1.vercel.app` | `milestone-1` | M1, frozen |
| `whop-agent-console-m4.vercel.app` | `milestone-4` | M2 + M3 + M4 — the finished prototype |
| `whop-agent-console.vercel.app` | — | production; moves only on request |

To cut a milestone:

```bash
git tag -a milestone-N -m "..." && git push origin milestone-N
npx vercel deploy --prod=false --yes            # returns <deployment-url>
npx vercel alias set <deployment-url> whop-agent-console-mN.vercel.app
npx vercel alias set <deployment-url> whop-agent-console.vercel.app   # only when promoting
```

No auth, no deployment protection. The project's `ssoProtection` was on by default and
silently gated every `*.vercel.app` URL behind a Vercel login — it still rendered for the
owner, which is what made it easy to miss. It is now disabled, and verified the way it
should have been the first time: status without following redirects, plus a check that the
body is actually the app rather than a login page.

```bash
for u in <urls>; do
  curl -s -o /dev/null -w '%{http_code}' "$u"        # 200, not 302
  curl -s "$u" | grep -q "Churn jumped" && echo APP  # and it is the app
done
```

Re-run that after anything that touches project settings. A 200 alone proves nothing.

`vercel link` could not attach the GitHub repo (the Vercel GitHub App is not installed on
it), so pushes do not auto-deploy. Deploys are CLI-driven, which is what keeps the
per-milestone URLs stable. Installing the app from the Vercel project's Git settings would
add push-to-deploy on `main` if that is ever wanted.

## 10. Constraints

- Never call the real Whop API. Every executor is local.
- No auth. Anyone with the URL sees the demo.
- Reset button restores seed state.
- Mobile has to work. It will be opened on a phone.
- Ship Milestone 1 before touching anything in Milestone 3.
