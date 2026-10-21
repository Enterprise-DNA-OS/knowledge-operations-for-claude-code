# CLI reference

Flags use --name=value. Quote a whole argument containing spaces. All commands support --json. Dates use YYYY-MM-DD. Paths refer to local files.

`node scripts/knowledge.mjs help`

`node scripts/knowledge.mjs collections`

`node scripts/knowledge.mjs authors`

`node scripts/knowledge.mjs articles`

`node scripts/knowledge.mjs review-queue`

`node scripts/knowledge.mjs attention`

`node scripts/knowledge.mjs performance`

`node scripts/knowledge.mjs workload`

`node scripts/knowledge.mjs feedback`

`node scripts/knowledge.mjs search-gaps`

`node scripts/knowledge.mjs compliance`

`node scripts/knowledge.mjs activity`

`node scripts/knowledge.mjs article <id-or-title>`

`node scripts/knowledge.mjs search <words>`

`node scripts/knowledge.mjs insights`

`node scripts/knowledge.mjs add-collection --name=Name`

`node scripts/knowledge.mjs add-author --name=Name`

`node scripts/knowledge.mjs set-author <name> --active=true|false`

`node scripts/knowledge.mjs add --collection=Name --title=Title --owner=Name --body-file=path --actor=Name`

`node scripts/knowledge.mjs assign <article> --owner=Name --actor=Name`

`node scripts/knowledge.mjs revise <article> --body-file=path --note=Reason --actor=Name`

`node scripts/knowledge.mjs review <article> --decision=approved|changes --evidence=Text --due=YYYY-MM-DD --actor=Name`

`node scripts/knowledge.mjs classify <article> --class=none|personal --purpose=Text --retention=YYYY-MM-DD --accuracy-checked=true --actor=Name`

`node scripts/knowledge.mjs activate <article> --actor=Name`

`node scripts/knowledge.mjs archive <article> --reason=Text --actor=Name`

`node scripts/knowledge.mjs log-feedback <article> --note=Text --priority=normal|urgent --actor=Name`

`node scripts/knowledge.mjs resolve <feedback-id> --note=Resolution --actor=Name`

`node scripts/knowledge.mjs log-search --phrase=Text --hits=0`

`node scripts/knowledge.mjs import knowledgeowl <csv> --collection=Name [--content-dir=extracted-html] [--manifest=paths.json] [--dry-run] --actor=Name`

`node scripts/knowledge.mjs export [--out=exports/backup.json]`

`node scripts/knowledge.mjs draft-review <article>`

`node scripts/knowledge.mjs weekly-review`

Search reads active content; it does not imply approval or privacy clearance. Read the review queue and compliance report before operational use.
