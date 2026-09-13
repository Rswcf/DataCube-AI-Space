# Translation Alignment Hotfix — Design

- Date: 2026-09-13
- Status: approved by the founder (hotfix ships separately, cheapest models; deploy needs explicit approval)
- Scope: backend only (`ai-hub-backend/`) + CI

## Problem

Since 2026-08-01 (EN-native pipeline), non-English content is misaligned on every collected day:

- `_backfill_translations_to_db` (`app/services/collector.py`) writes Stage 3.5 translations onto saved rows **by position**. The tech feed saves 10 articles plus 2 video rows interleaved at display positions 2 and 7, so rows 2–9 receive another story's translation and rows 10–11 stay English in all 7 translated languages. Investment rows shift whenever the save step drops a row.
- Failed translation mini-batches of ≤3 items are never retried; gaps are skipped silently and the run still reports `completed`.
- The admin backfill only checks whether a language key exists, so it cannot see misaligned rows, and it never writes the German `*_de` columns that `get_field` reads first.
- The daily newsletter sends whatever is stored, so German/Chinese/French subscribers receive mismatched stories.
- `/admin/collect/ma` pairs EN items with an empty DE list and saves zero rows after deleting the period's M&A posts.

Verified on production data for 2026-09-12 (row 2 video shows the Anthropic report, row 3 shows the Sam Altman story, rows 10–11 untranslated).

## Decisions

1. **Identity mapping.** Saved rows are matched to the EN items they were created from by the English text saved on the row (`content_en`; tips `content_en + tip_en`; trends `title_en`; videos `video_id`). Never by position. Duplicate keys pair in order.
2. **Integrity marker `_src`.** Every translation entry stores `_src` = first 16 hex chars of SHA-256 over the JSON list of normalized English source values. Source fields per section kind: tech `[content]`, video `[title, summary]`, tip `[content, tip]`, primary_market `[content]`, secondary_market `[content]`, ma `[content]`, trend `[title]`. Readers (`get_field`) only read named fields, so `_`-prefixed keys are invisible. German text stays in `<field>_de`; the JSONB `de` entry holds only `{"_src": ...}`.
3. **Translation status.** `ok | missing | stale | untranslated`: missing = no entry, no marker or no text; stale = marker ≠ hash of the row's current English; untranslated = localized text identical to English. Legacy rows without a marker count as missing.
4. **Stage 3.5 completeness.** After the parallel pass, every (item, language) pair without a usable translation is retried once in batches of 3; the remaining count is recorded as `counts.translation_gaps` on the collection run (status strings unchanged).
5. **Backfill service.** `app/services/translation_backfill.py` plans per period which rows/languages need work (or everything with `force`), translates in worker threads (DB access stays on the calling thread), stamps `_src` from the row's English, merges into existing translations and writes German into `*_de`. Admin endpoint `POST /api/admin/backfill-translations` gains `since`, `force`, `dry_run`, `cheap`; `cheap` uses `LLMProcessor.CHEAP_TRANSLATOR_MODELS` (`qwen/qwen3.7-flash` then free fallbacks). `patch-translation` stamps `_src`. The CLI script wraps the same service.
6. **Send gate.** Before taking a language's send lock, the newsletter counts translation statuses across tech (incl. video rows), funding, M&A and tips. A language is held (not sent, no lock) when any row is `stale` or at least half of its rows are not ready; otherwise it is sent with English fallback for the few rows that are not ready and the counts are reported under `translation_warnings`. The result gains `held_languages`; the admin endpoint returns HTTP 502 when any language is held so the workflow turns red.
7. **M&A-only save.** Build the DE side from EN via `_mirror_de_from_translations` and pair with `_pair_de_en`, using the same field defaults as the main save.
8. **Test safety.** `tests/conftest.py` refuses non-local databases; `integration` marker; CI runs all unit tests with pytest and all integration tests against the Postgres service.

## Acceptance criteria

- Integration test reproducing production order (save → translate → write back) with 10 articles + 2 videos: every tech row's German column and every JSONB language equal the translation of its own English text; all statuses `ok`.
- Same for process-only order (translate → save).
- Stage 3.5 retry test: a language failing on the first pass is filled on retry; an unfixable language is counted.
- Backfill test: misaligned legacy rows are repaired (German columns + JSONB), dry-run changes nothing, a second non-force run is a no-op, `cheap` passes the cheap model chain.
- Newsletter tests: ready translations send; a fully legacy/misaligned language is held; a language with a minority of unready rows sends with warnings; admin returns 502 when held.
- M&A-only save test keeps the EN-native row.
- Full unit + integration suites and `ruff check app/ scripts/ tests/` pass locally and in CI.

## Rollout and data repair (after founder deploy approval)

1. PR with green CI → merge → `railway up` (no migrations).
2. `POST /api/admin/backfill-translations?since=2026-08-01&dry_run=true` (read-only) to size the repair.
3. Repair the latest period first (`period_id=<latest>&force=true&cheap=true`), verify alignment on the public API.
4. Repair everything else (`since=2026-08-01&cheap=true`, non-force = only rows not yet ok); re-run dry-run until it returns no periods.
5. Next morning: newsletter run has no held languages; next collection reports `translation_gaps` 0.

Legacy rows have no `_src`, so until step 3–4 completes the gate holds non-English newsletters for unrepaired periods — intended: no known-wrong sends.

## Out of scope

Faithfulness prompt rules, one-click unsubscribe, subscribe hardening, Stripe endpoint removal and the other SP1 items (separate plan).
