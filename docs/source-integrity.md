# Source integrity and recovery

Source configuration lives in `collector.load_sources()`. Its `enabled`,
`disabled_reason`, `max_items`, `ai_only` and `preprint` fields
describe acquisition policy. A valid HTTP response alone is not evidence of
permission, freshness or factual accuracy.

## Acquisition and cost controls

- `source-prefetch.yml` calls authenticated `POST /api/admin/sources/prefetch`
  every two hours. It retains seven days of dated source metadata in the
  regenerable `source_cache` table. It creates no public edition, invokes no
  model, runs no YouTube searches and sends no email.
- Daily collection runs at 00:17 and 01:17 UTC and targets yesterday in
  `APP_TIMEZONE`. The second slot is a recovery opportunity. Both slots are
  after the end of the target Berlin day in winter and summer. Existing
  collection and newsletter idempotency gates still apply.
- Stage 1 merges cache, fresh acquisitions and already retained raw rows.
  It does not clear earlier raw rows on retry. Canonical URL/video IDs
  deduplicate within an edition. Daily and weekly windows use exact local
  calendar boundaries converted to UTC, including 23/25-hour DST days.
  HN and YouTube queries use the target interval rather than execution time.
- Identified HTTP requests check robots.txt, including after redirects.
  Unavailable robots responses are reported as blocked; identity spoofing,
  proxies and access bypasses are not used. arXiv requests are serialized
  with at least three seconds between them.
- Generation still sees at most 40 technology, 40 capital and 15 practical
  inputs. Relevance, date and deterministic tie-breakers precede these caps.
  A soft domain cap reserves space for other publishers, then fills spare
  capacity on quiet days. Classification admits at most 120 inputs; excess
  raw rows remain stored with `section="deferred"`. This is a bounded
  selection policy, not a claim of complete event recall.

`GET /api/admin/sources/health` requires the existing admin key. It exposes
per-source checks. Prefetch returns `prefetched`, `degraded` or `disabled`;
if no source can be checked it returns an error. A valid quiet feed is
different from a failed request, non-feed HTML or a policy block. Source
failures can coexist with a completed edition; see collection raw counts
and source health separately.

## Evidence and dates

Practical generation returns an opaque `source_item_id`. The server resolves
that ID to a retained input and supplies source, URL, platform and Berlin
publication date. Unknown IDs, duplicate IDs, undated sources and empty
techniques are rejected. Models cannot invent these metadata fields.
`sourceStatus=input_verified` establishes input membership, not independent
verification of every generated sentence. Returning fewer supported tips,
including none, is preferable to inventing techniques to fill a quota.

The caption client uses the pinned instance `YouTubeTranscriptApi.list()`
and `fetch().to_raw_data()` API. Caption HTTP requests have a 15-second
timeout; at most five selected videos receive a caption attempt per fetch.
Unavailable captions fall back to the publisher's description, without
access bypass. Video prompts include at most 2,500 transcript characters
and 700 description characters per input. Unknown output video IDs are
discarded. Summaries carry an explicit evidence prefix and API/UI evidence
labels (`transcript_excerpt` or `description`). An excerpt is not a full
video review. Video dates are converted to the edition timezone.

## Historical metadata repair

`scripts/repair_tip_sources.py plan <manifest>` writes a new backup/plan
without changing the database. The default scope is the audited
2026-09-29 through 2026-10-26 editions.

The repair retains a legacy URL only when its canonical form matches a raw
input in the same edition. It clears unmatched outbound URLs, replaces the
known erroneous date with the edition date and marks every repaired item
`unverified_legacy` / `dateBasis=edition`. Matching an input URL does not
prove that the historical prose accurately describes that input. Article
IDs, English/German prose and all translations remain unchanged. For older
unrepaired legacy rows outside this scope, the API also derives the displayed
edition date from the period ID, so the edition-date label remains truthful.

After independently saving and hashing the manifest:

1. Run `python -m scripts.repair_tip_sources apply <manifest>`.
2. Check row counts, metadata and the saved content/translation hashes.
3. To undo, run `python -m scripts.repair_tip_sources restore <manifest>`.

Apply and restore lock and validate every row before mutation. A changed
metadata value or content hash aborts the entire transaction. A restore
never overwrites intervening edits silently. Do not regenerate historical
editions just to repair these fields: regeneration changes IDs and costs
money, and does not send a correction to already delivered emails.

## Source additions and exclusions

The October audit pauses failed/non-feed feeds and robots-disallowed
acquisitions explicitly; these are not claims that their publishers have
permanently closed. Re-enable only after a fresh acquisition check.

The initial expansion adds bounded arXiv AI/CL metadata, labelled as
preprints, and the European Commission's centrally published news RSS,
filtered for AI-related announcements. The RSS link comes directly from
`https://commission.europa.eu/news-and-media/news_en` and was verified from
Railway with the same identified, robots-aware client. It reads feed
metadata, not article bodies. See `data-rights.md` for primary terms and
exclusions.

The earlier Digital Strategy index candidate worked locally but Railway
could not retrieve its robots.txt (HTTP 403). It was replaced with the
Commission's officially distributed RSS; no blocked resource or identity
was bypassed. Retired source-health rows are removed on the next prefetch
so old blocked checks are not presented as current configuration.

The Commission feed does not cover all EU institutions, and this expansion
does not solve every geographic or capital-data gap. Feed metadata
and input caps still limit coverage. New-cache behavior needs cross-day
production observation; one successful acquisition does not establish
schedule reliability.

## Rollback

- Set `SOURCE_PREFETCH_ENABLED=false` to stop cache reads/writes; disable
  the Source Prefetch GitHub workflow as well to stop scheduled HTTP calls.
- Set `EXTRA_SOURCES_ENABLED=false` to remove the additions from fresh
  acquisition and cache admission. Model profiles/fallbacks are unchanged.
- Application rollback: redeploy the preceding successful Railway and
  Vercel releases. Migration `0022` only adds cache/health tables; leave
  them in place for an old application. No content table downgrade is
  required. Revert schedule changes independently if reverting the code.
- Historical metadata rollback uses its exact manifest separately from
  application rollback. Keep the manifest outside the repository.

Tests cover DST, target-day HN filters, robots/redirects, HTML masquerading
as RSS, Commission AI filtering, input binding, input ranking, caption API shape,
PostgreSQL cache idempotency, raw-row preservation, and guarded metadata
repair/restore. Live model evaluation must use a frozen input and a stated
budget; it must not publish an edition or send email.
