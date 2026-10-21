---
description: Import KnowledgeOwl metadata and exported HTML
---

# import

Read CLAUDE.md first. Import KnowledgeOwl metadata and exported HTML.

Run `node scripts/knowledge.mjs import knowledgeowl <csv> --collection=Name [--content-dir=extracted-html] [--manifest=paths.json] [--dry-run] --actor=Name`. Replace placeholders with the operator's supplied values; quote names and text as single arguments. Add `--json` to read structured results. Run `help` if any argument is unclear.

Read the article and its history before any change. Never invent a name, evidence, review decision, date or resolution. If a match is ambiguous, show the candidate IDs. For writes, use the operator's actor label and confirm the intended record from the read result. An actor label is not authenticated identity.

Read docs/replace-knowledgeowl.md. Run --dry-run first, show article counts and missing content, then import the same files. CSV alone does not contain article bodies. Permissions are preserved as source metadata, not enforced access controls.
