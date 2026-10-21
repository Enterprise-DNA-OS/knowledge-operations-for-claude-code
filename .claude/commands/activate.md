---
description: Make an approved article active in the local register
---

# activate

Read CLAUDE.md first. Make an approved article active in the local register.

Run `node scripts/knowledge.mjs activate <article> --actor=Name`. Replace placeholders with the operator's supplied values; quote names and text as single arguments. Add `--json` to read structured results. Run `help` if any argument is unclear.

Read the article and its history before any change. Never invent a name, evidence, review decision, date or resolution. If a match is ambiguous, show the candidate IDs. For writes, use the operator's actor label and confirm the intended record from the read result. An actor label is not authenticated identity.

This changes local status only. It never publishes a website or sends a message. Check the exact revision, approval, owner, review dates and unresolved corrections.
