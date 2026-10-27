# Model routing and rollback

The 2026-10-27 balanced profile uses OpenRouter. Vercel hosts the frontend;
Railway hosts the backend. No Gateway migration or new credentials are required.

| Task | Model order |
| --- | --- |
| News generation | `deepseek/deepseek-v4.1-flash-1017`, `qwen/qwen3.7-flash`, public-news free fallbacks |
| Classification | DeepSeek 1017, Qwen3.7 Flash, public-news free fallbacks |
| DE/ZH/FR/ES/PT/JA translation | Qwen3.7 Flash, DeepSeek 1017, public-news free fallbacks |
| Korean translation (including cheap repair) | DeepSeek 1017, Qwen3.7 Flash, public-news free fallbacks |
| Bulk translation repair | Same cheap-first chain; respects the profile |
| Frontend chat | Qwen3.7 Flash, DeepSeek 1017 |
| Frontend report | DeepSeek 1017, Qwen3.7 Flash |
| AI relevance filter | TypeSafe `jev-1.13.0`; calibrated threshold unchanged |

The public-news free fallbacks are `nvidia/nemotron-3.5-super-vl:free` and
`google/gemma-4-31b-it:free`. The old NVIDIA Super/Nano free IDs have no current
endpoints and are removed. User chat/report requests never route to free models
in the balanced profile.

## Cost and failure controls

Backend calls disable reasoning, cap output at 32,768 tokens and retain two
bounded attempts per model. The SDK's additional automatic retries are disabled.
Empty, invalid JSON and truncated responses remain failures. New DeepSeek calls
prefer the `deepinfra/fp8` standard endpoint, allow provider failover and cap
provider input/output rates at $0.15/$0.60 per million tokens. Qwen's limits are
$0.23/$0.92, covering long-context tiers. These are ceilings, not price quotes.
Provider filters can make a model unavailable; the next model is then tried.

Frontend requests retain the chat/report output limits of 500/4096 and existing
request/rate guards. The transport passes ordered model fallback, reasoning off
and a $0.23/$0.92 provider price ceiling to OpenRouter. Report requests prefer
DeepInfra standard FP8. Once streaming has begun, a stream failure is surfaced;
the application does not silently restart a partially delivered answer.

Successful and rejected backend completions log the returned usage metadata,
actual model and provider. Frontend completion logs include actual model and SDK
usage. This adds no prompt or subscriber data to usage logs. Classification and
translation have explicit instructions to preserve source attribution, limiting
words, financial quantities and exact company/product names.

## Rollback

Set server-side `LLM_MODEL_PROFILE=legacy` in Railway and Vercel, then redeploy
each affected service. Backend legacy restores DeepSeek V4 Flash 0731 before
Qwen for generation/classification/translation. Cheap backfill stays Qwen-first except Korean, which keeps the generation chain.
The two obsolete free endpoints stay removed. Frontend legacy restores
`openrouter/free`; this emergency profile again permits random free routing.
Remove the override or set `balanced` and redeploy to return to the new policy.
Unknown profile values fail rather than silently selecting another policy.

Alternatively restore the previous immutable deployment in each host's deployment
dashboard. Pre-refresh successful Railway deployment:
`da4d7356-bd05-479c-9a5a-4680c27a43e7`; Vercel:
`dpl_4LAAYT9pni2BrictdLpejV6LBe9Y`. No database migration is part of this change.

## Release evidence

The live comparison uses frozen 2026-10-26 raw news in a local artifact directory,
with a reserved token-cost upper bound before each request. It never calls
collection, database writes or email sending. Both generations use the same news;
translation compares all seven target languages. Keep the initial failures and
retests, not just the passing outputs. Review classification, duplicate handling,
source links, financial magnitudes, hedges/attribution and missing translations.
Provider benchmarks alone do not establish these task-specific qualities.

Local evidence for this release is under
`model-validation/` in this chat's artifact directory. Small-sample acceptance
does not establish long-term availability or native-speaker quality for all text.

Korean translation exception: the live financial sample exposed Qwen translating private-company valuation as market capitalization. Korean uses the generation chain (DeepSeek first), including cheap repairs; the other six languages remain Qwen-first.

Classification QA exception: Qwen misclassified an IPO discussion in an independent holdout, so classification uses the DeepSeek generation chain; Qwen remains the paid fallback.
