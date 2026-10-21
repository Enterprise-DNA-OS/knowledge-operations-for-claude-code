# Replace KnowledgeOwl

Checked 21 October 2026 against the vendor's [CSV export steps](https://support.knowledgeowl.com/help/generate-your-csv-export), [column catalogue](https://support.knowledgeowl.com/help/manage-csv-export-column-list) and [HTML Zip guide](https://support.knowledgeowl.com/help/html-zip-export).

1. In Manage, select the articles you need, including archived records if required. Export Articles to CSV. Include Article ID, Article Title, Status, Permalink, Author, Breadcrumbs, Visibility, reader restrictions, dates, ratings and views. The CSV is metadata, not article text.
2. In Tools, Exports, HTML Zip, choose whether to include drafts. Generate and download the export. Extract it into a private folder. Retain the original archive with its files and videos. Windows extraction can change category names containing question marks; inspect the actual extracted paths.
3. In a fresh database run npm run migrate, then create your collection with add-collection. Preview the one-command import below. A CSV-only import is allowed but marks absent bodies for attention.
4. Check counts and content matches, then run the same import without --dry-run. Review sample articles, source permissions, ratings and every missing-content flag before switching any operational process.

```bash
node scripts/knowledge.mjs import knowledgeowl imports/articles.csv --collection="Service Handbook" --content-dir=imports/html --manifest=imports/paths.json --actor="Migration operator" --dry-run
```

The optional manifest is an object from Article ID to a relative HTML path, for example:

```json
{"article-123":"Service/Returns procedure.html"}
```

Without a manifest, filenames must match an Article ID or Permalink exactly, ignoring only the .html or .htm extension. Multiple matches, absent files, paths outside the selected folder and symbolic links fail the import. The importer does not assume KnowledgeOwl uses one filename convention. An export with renamed files needs a manifest. No partial write occurs when a row fails. Repeating the same import is a no-op; a changed export cannot overwrite existing articles and requires an explicit revision workflow.

Article IDs are unique within a collection. Titles, owner names, category paths, current status, views and thumb ratings map to their corresponding fields. All supplied CSV fields also remain in source_data, including restrictions, tags, links, timestamps, version labels and non-thumb ratings. Source dates remain as exported text because the source timezone is not guaranteed. Published maps to active, Draft to draft, Ready for review to ready, Archived and Deleted to archived. Other statuses require an explicit mapping before import.

HTML is retained as original_html and converted to searchable plain text. Vendor wrappers can appear in that text, so inspect a representative sample. Scripts are excluded from text extraction and raw HTML is never executed. Referenced media remains in your original export, not embedded into the database. Keep that private archive. Previous revision history, comments, search logs, author accounts, reader accounts, SSO, public URLs, widgets, snippets and shared-content relationships are not reconstructed by this import. A specialist migration can map those separately.

Imported Published status records the source state; it does not fabricate local approval. Assign active owners, classify privacy, set review dates and obtain evidence before use. Restrictions are source records, not enforced reader permissions. Use the base only with a trusted operator. Public reader access is a separate build.

Before cancelling KnowledgeOwl, reconcile counts for each export filter, read representative content and keep a verified backup. Do not delete your vendor account as part of this script.
