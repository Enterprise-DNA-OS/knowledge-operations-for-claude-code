---
description: Draft an article review packet
---

# draft-review

Read CLAUDE.md first. Draft an article review packet.

Run `node scripts/knowledge.mjs draft-review <article>`. Replace placeholders with the operator's supplied values; quote names and text as single arguments. Add `--json` to read structured results. Run `help` if any argument is unclear.

Read the article and its history before any change. Never invent a name, evidence, review decision, date or resolution. If a match is ambiguous, show the candidate IDs. For writes, use the operator's actor label and confirm the intended record from the read result. An actor label is not authenticated identity.

Read the generated file, present the findings and link the draft in chat. Nothing is sent.
