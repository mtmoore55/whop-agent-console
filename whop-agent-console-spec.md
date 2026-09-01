# Build spec: Whop Agent Console

Paste this whole file into Claude Code as the opening prompt in an empty repo, or save it as `SPEC.md` in the repo root and tell Claude Code to read it and start with Milestone 1.

---

## What we're building

A working prototype of the **human console for an agent-run business on Whop**.

Whop shipped a CLI in July 2026 that lets business owners and their AI agents launch products, set prices, run ad campaigns, check stats, and move money. The capability exists. The layer that lets a human safely *supervise* an agent doing all of that does not.

This prototype is that layer. The core loop:

1. An agent wakes up on a schedule, reads the state of the business
2. It writes a brief: what happened, what it means
3. It proposes a small number of concrete, executable actions with reasoning and expected impact
4. The human approves, modifies, or rejects each one — with real consequences visible before they commit
5. Approved actions execute, produce receipts, and land in an audit log with a reversal path

**The product is the approval gate, not the digest.** The digest is the reason the gate exists. Design accordingly.

## Stack

- Next.js (App Router) + TypeScript, deployed to Vercel
- Tailwind. No component library defaults left visible.
- Anthropic API via `@anthropic-ai/sdk`, called **server-side only** in a route handler. `ANTHROPIC_API_KEY` in env, never in the client bundle.
- Model: `claude-sonnet-4-6`
- No database. State lives in a JSON seed file plus an in-memory/localStorage-backed store that survives a page refresh. Include a "Reset demo" control.

## Demo mode (required, not optional)

Two paths through the agent:

- **Live**: hits the Anthropic API and generates the digest fresh
- **Cached**: serves a checked-in JSON response with a short artificial delay

Default to Live, fall back to Cached automatically on any error or timeout, and surface a small honest indicator of which one ran. This demo will be opened by people on their phones at odd hours. It must never show a stack trace.

## The fictional business

Seed the whole demo with one specific, believable Whop seller. Numbers should feel lived-in, not round.

**"Range" — a paid trading-education community.**

- 1,847 active members, $32/mo
- MRR $57,340, up 4.1% over 30 days
- Trailing 30-day churn 8.4%, up from 6.2% — this is the story of the day
- 312 lapsed members in the last 90 days
- Two products: the community ($32/mo) and a one-time course ($149)
- Whop Ads: one active Meta campaign, $240/day, CAC $61, trending up from $44
- Affiliates: not enabled
- Bounties: never used
- Balance: $84,120, of which $61,000 sits idle (not in Treasury yield)
- Upcoming obligations: $12,400 affiliate/creator payout scheduled in 6 days
- Sentry-equivalent: 3 open issues, one spiking — checkout webhook timeouts, 41 events in 24h, correlated with a drop in completed checkouts on mobile

Model the business state as a typed `BusinessState` object in `lib/state.ts`. The agent reads this. Actions mutate it.

## Action schema

The agent may only propose actions from this fixed set. Type it strictly; validate the model's output against it and drop anything malformed.

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
  params: Record<string, unknown>      // typed per action type
  headline: string                      // one line, plain language
  rationale: string                     // 2-3 sentences
  evidence: string[]                    // which metrics in BusinessState drove this
  expectedImpact: { metric: string; direction: 'up' | 'down'; estimate: string; confidence: 'low' | 'medium' | 'high' }
  maxCost: number                       // worst-case dollars at risk
  reversibility: 'instant' | 'costly' | 'irreversible'
  blastRadius: number                   // how many humans see or feel this
  requiresApproval: boolean             // computed by the policy engine, not the model
}
```

`requiresApproval` is **never** decided by the model. It's computed by the policy engine from the action's cost, reversibility, and blast radius against the user's standing policy. The model proposes; the policy decides what needs a human.

## The agent

A single server route, `POST /api/digest`.

It sends `BusinessState` to Claude with a system prompt that:

- Frames it as the operator of this business, reporting to an owner who has a few minutes
- Requires JSON-only output, no prose wrapper, no markdown fences
- Requires it to open with the single most important thing that changed, not a metric dump
- Caps proposals at 6 and requires at least one to be a *do nothing / keep watching* observation rather than an action
- Forbids inventing metrics not present in the state

Parse defensively: strip fences, validate against a Zod schema, and fall back to cached output if parsing fails.

## Surfaces

Three screens. Build them in this order.

### 1. The Brief (`/`)

The morning digest, and the first thing anyone sees. Structure:

- One-sentence lede: the thing that changed
- A compact state-of-business strip (MRR, churn, CAC, balance, open issues) — glanceable, not a dashboard
- The proposed actions as a stack of cards

Each action card shows the headline, the rationale, the evidence it's resting on, and — before any interaction — the three numbers that decide whether you should say yes: **max cost, reversibility, blast radius**. Those must be visible without expanding anything. A person should be able to decline without reading the reasoning.

Each card has: **Approve**, **Modify**, **Reject**. Reject asks for a one-word reason (this feeds the memory in Milestone 4). Modify opens an inline editor of the action's actual parameters, not a text box.

There is also a batch control: approve everything currently marked auto-eligible. It must show the combined cost before it fires.

### 2. The Console (`/console`)

Where the owner sets the rules once so the brief gets faster over time.

- Per-action-type policy: **auto-approve / ask me / never**
- Daily agent spend cap, with today's remaining budget shown against it
- Per-action cost ceiling above which approval is always required regardless of type
- Broadcast ceiling: agent may never message more than N members without approval
- A plain-language rendering of the current policy: "Your agent can spend up to $400/day on ads without asking, can't change prices, and can't message more than 50 people at once."

Make the enforcement visibly real: if the agent proposes something over cap, the card shows it blocked by policy with the specific rule that blocked it, and offers a one-time override.

### 3. The Log (`/log`)

Every action ever proposed, with its full lifecycle: proposed → approved/modified/rejected → executed → outcome. For each executed action, a receipt showing what changed in the business state and, where reversibility is `instant`, a working **Undo** that actually reverts the state.

This screen is what makes the other two trustworthy. Don't stub it.

## The two proposals that matter

Seed the demo so these two appear in the first brief. They're the point.

**The one you should reject.** The agent proposes `whop.treasury.move`: sweep $61,000 of idle balance into yield, correctly noting it's earning nothing. It's a good-looking suggestion with real upside. But there's a $12,400 payout due in 6 days and the move has a settlement window that would put it at risk. The console should make this catchable — surface the upcoming obligation adjacent to the balance the action touches — but should *not* block it automatically. The human catches it. That's the demo.

**The one you should modify.** The agent proposes `whop.promo.create`: 40% off for 90 days to all 312 lapsed members. Blast radius 312, and the code will leak to active members who are paying full price. The right move is to modify it down: a lower discount, a shorter window, capped redemptions. The Modify flow has to make that a fifteen-second edit of real parameters.

The other proposals should be genuinely good: enable affiliates at a suggested rate, create a bounty for member referrals, pause or rebudget the ads campaign whose CAC is drifting, and one non-action flag on the checkout webhook errors that recommends waiting for more data.

## Aesthetic direction

Whop's audience is internet-native and young. The failure mode here is enterprise SaaS: slate-gray cards, generic sans, a sidebar with lucide icons, everything at 8px radius. Don't.

- Dark surface, high contrast, one confident accent color used sparingly and only for consequence
- Typography does the hierarchy work. A real typeface with character, tight leading on the numbers, generous on the prose.
- Money and risk numbers get visual weight proportional to their actual weight. A $61,000 treasury move should not look like a $40 ad budget change.
- Density is fine. This is a tool for someone who reads it every morning, not a landing page.
- Motion only on state transitions that represent something real: an action executing, a balance changing, a budget depleting.

Do not clone Whop's marketing site. Adjacent and clearly considered beats a bad copy.

## Build order

**Milestone 1 (get it running):** State model, action schema, policy engine, seeded brief with hardcoded proposals, approve/reject that actually mutates state. No Anthropic call yet. Deployable and clickable.

**Milestone 2:** Swap hardcoded proposals for the live Anthropic route, with cached fallback. Validate and constrain output.

**Milestone 3:** The Console screen with working enforcement, and the Log with working undo.

**Milestone 4 (only if time):** Rejection memory — rejected actions and their reasons get fed back into the next digest's system prompt, so the agent visibly stops proposing things this owner doesn't want. This is the strongest single idea in the prototype if it can be made to work. It turns the approval gate from a chore into training.

## Constraints

- Never call the real Whop API. Every executor is local.
- No auth. Anyone with the URL sees the demo.
- Include a Reset button that restores seed state.
- Mobile has to work. It will be opened on a phone.
- Ship Milestone 1 before touching anything in Milestone 3.
