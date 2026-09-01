# Whop Agent Console

The human approval layer for an agent-run business on Whop. See [`spec.md`](./spec.md)
for the working spec; [`whop-agent-console-spec.md`](./whop-agent-console-spec.md) is the
original brief, kept verbatim.

```bash
npm install
npm run dev     # http://localhost:3000
```

Milestone 1 is complete: the Brief at `/` runs on a seeded `BusinessState`, a real policy
engine, and local executors. Nothing touches the Whop API and no money moves.
