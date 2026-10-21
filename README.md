# Knowledge Operations for Claude Code

Your articles, review evidence and reader corrections in a database you own. Built by Enterprise DNA.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free MIT code. Install and run it. | Your fields, review rules and KnowledgeOwl migration. | Installed and operated through Omni by Enterprise DNA. |
| [Quick start](#quick-start) | [Get your version built](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=knowledgeowl) | One setup fee, then a retainer. [Book a call](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=knowledgeowl) |

## What it does

An internal knowledge desk for service teams and distributors: keep the answer, know who owns it, review changes, and fix what readers report. No public portal or editing front end. Claude Code, Codex, OpenCode or Cursor runs the same commands against the same database.

KnowledgeOwl is sold by plan, author seats and knowledge bases. Its published monthly Business price is 500 US dollars, including one author and one knowledge base; extra authors are 25 US dollars each per month. A modelled 25-author setup costs 13,200 US dollars over twelve monthly payments. This is a calculated example, not a customer invoice; annual billing is discounted. [Vendor pricing](https://www.knowledgeowl.com/pricing), checked 21 October 2026.

The database holds collections, authors, articles, immutable revision snapshots, review decisions, reader feedback, searches and change history. The supplied workflows cover the weekly work: review the queue, resolve corrections, check unanswered searches, reassign former owners and review privacy evidence.

## Quick start

Node 20 or later. No database install needed for the local demo.

```bash
git clone https://github.com/Enterprise-DNA-OS/knowledge-operations-for-claude-code.git
cd knowledge-operations-for-claude-code
npm install
npm test
npm run demo
npm run view
npm run docs
```

The fictional demo includes a popular overdue returns guide, a former owner's contact article, unanswered searches, unresolved corrections, missing content and an archived record still needing a retention decision. Demo dates move with today. Do not seed a real database.

For a fresh business database, run npm run migrate without seed. Set DATABASE_URL in .env for a dedicated Postgres database, or set DATA_DIR to a new local directory. The adapter uses verified TLS for remote databases; tables have row-level security and no public grants. Use the database owner or a deliberately provisioned backend role, never expose these credentials to readers.

## Move from KnowledgeOwl

Export Manage articles to CSV and take an HTML Zip export. Extract the ZIP yourself, then run:

```bash
node scripts/knowledge.mjs add-collection --name="Service Handbook"
node scripts/knowledge.mjs import knowledgeowl imports/articles.csv --collection="Service Handbook" --content-dir=imports/html --actor="Migration operator" --dry-run
node scripts/knowledge.mjs import knowledgeowl imports/articles.csv --collection="Service Handbook" --content-dir=imports/html --actor="Migration operator"
```

CSV alone imports the article register and statistics, not the article bodies. When filenames differ from article IDs or permalinks, provide an explicit Article ID to HTML-path manifest. No guesswork: ambiguous or missing matches reject the entire import. Original HTML and the source CSV fields stay in the database; reports escape that HTML. Images, videos, previous revisions, portals, reader identities and access rules need separate migration work. [Full switching guide](docs/replace-knowledgeowl.md).

## Commands

32 CLI commands and 36 agent recipes. One CLI, JSON output with --json, exact names or partial IDs, case-insensitive name matching, ambiguity lists and exit status 1 on failures.

| Command | Result |
|---|---|
| /help | Show command usage |
| /collections | List knowledge collections |
| /authors | List authors and active ownership |
| /articles | Read the article register |
| /review-queue | Plan the editorial review queue |
| /attention | Find overdue reviews, missing owners and reader corrections |
| /performance | Compare readership, negative ratings and open corrections |
| /workload | Balance review work between owners |
| /feedback | Read reader corrections and resolutions |
| /search-gaps | Find unanswered reader searches |
| /compliance | Check recorded privacy evidence and house rules |
| /activity | Read the change log |
| /article | Read an article and its full revision, review and feedback history |
| /search | Search active article titles and text |
| /insights | Answer ten cross-record questions |
| /add-collection | Create a knowledge collection |
| /add-author | Register an author |
| /set-author | Mark an author active or inactive |
| /add | Draft an article from an approved local text file |
| /assign | Assign an active owner |
| /revise | Save a new revision and clear its previous approval |
| /review | Record an independent review and its evidence |
| /classify | Record personal-information classification and review dates |
| /activate | Make an approved article active in the local register |
| /archive | Retire an article without deleting its history |
| /log-feedback | Record a reader correction |
| /resolve | Record the resolution of a correction |
| /log-search | Record a search and its result count |
| /import | Import KnowledgeOwl metadata and exported HTML |
| /export | Write all records and revision content to a private JSON backup |
| /draft-review | Draft an article review packet |
| /weekly-review | Draft the Monday review from attention, review queue and compliance |

Also /view, /documents, /new-view and /customise. [Exact arguments](docs/cli.md).

## Ten questions to ask across your records

The insights command answers all ten today. These combine ownership, feedback and your own rules; we do not claim that KnowledgeOwl cannot be configured to answer similar questions.

1. Which heavily read articles have overdue reviews?
2. Which articles combine negative ratings with unresolved corrections?
3. Who carries the largest overdue review queue?
4. Which current articles depend on a former employee?
5. Which personal-information articles need a retention decision?
6. Which search phrases repeatedly return no answer?
7. Which imported articles have no usable body?
8. Which active revisions have no recorded approval?
9. Which categories hold the most open reader corrections?
10. Which correction requests have waited more than a week?

## Reviews and privacy

Each revision has its editor and note. A different reviewer records evidence and a next-review date. Activation requires the current revision's approval, a future review date, an active owner, privacy classification and resolved corrections. Personal-information articles also require purpose, accuracy-check evidence and a future retention review. Activation never puts anything on a website.

Compliance checks cite New Zealand Privacy Act principles 8 and 9 and distinguish them from house rules. The law does not prescribe our review interval. The owner chooses it. Archived personal-information records still appear in retention checks; archiving is not deletion. [Rule scope and sources](docs/compliance.md).

## Documents and views

Edit brand.json once for your business name, logo and colours. npm run docs renders an article dossier, an owner review pack and a collection privacy review. npm run view renders the review week, reader friction and ownership dashboards. Every output is read-only and private. /new-view adds a question. /customise adds a field or changes a house rule through a tested migration.

## Your first hour: ten things to ask for

1. Put our name and colours on the reports.
2. Create our service handbook collection.
3. Preview our KnowledgeOwl CSV and HTML import.
4. Match the article filenames that differ from their permalinks.
5. Show popular articles whose reviews are overdue.
6. Assign a new owner to a former employee's articles.
7. Draft a review pack for our returns guide.
8. Record the reviewer and the evidence behind the decision.
9. Show personal information that needs a retention decision.
10. Add our product-family field and a weekly view for it.

## Scope and operation

This base assumes a trusted operator on a protected machine. Source permissions are preserved as metadata; they are not reader authorization. Actor names are labels, not signed identities. Multi-user sign-in, enforced permissions, public search, hosted article pages, live analytics collection, mobile editing and connected support workflows are custom work. [Why no front end](docs/why-no-front-end.md).

Use export for a JSON archive of every record and revision, and your database's backup tooling for recovery. Test a restore before relying on a backup. Keep raw vendor exports and their assets in private storage. The CLI never sends messages, fetches imported links or executes imported HTML.

npm test uses a temporary database, exercises all CLI operations, checks malformed and partial imports, review gates, privacy flags, drafts, exports and escaped HTML. CI runs Node 20 and 22 on Windows and Linux. Local testing does not claim a remote Postgres run.

## Installed for you

Enterprise DNA brings your KnowledgeOwl exports across, reconciles the records, designs your access controls and builds the screens or connections you need. We run your version through Omni by Enterprise DNA: one setup fee, then a retainer. [Talk to Sam](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=knowledgeowl).

## Licence

MIT. KnowledgeOwl is its owner's trademark. This is an independent project, not affiliated with KnowledgeOwl.
