# Documentation Maintenance

Last reviewed: 2026-08-01

This guide defines which docs are authoritative and what must be updated when the codebase changes.

## Current Source Of Truth

Use these files for current implementation facts:

Some assistant-context files (`CLAUDE.md` and `.ai-collab/context/*`) may be git-ignored in this workspace. Keep them locally in sync when they are present, but do not rely on them as the only public documentation.

| File | Owns |
| --- | --- |
| `README.md` | Product overview, architecture, setup, public API summary |
| `ai-information-hub/README.md` | Frontend features and deployment quick start |
| `ai-hub-backend/README.md` | Backend pipeline, data flow, and operational details |
| `CLAUDE.md` | Repository-wide AI-assistant context |
| `ai-information-hub/CLAUDE.md` | Frontend AI-assistant context |
| `.ai-collab/context/project-overview.md` | Shared current project summary |
| `.ai-collab/context/codebase-map.md` | Current route and file map |
| `docs/brand-guidelines.md` | Brand system (dated snapshot — design principles only) |
| `docs/seo-geo-optimization-plan.md` | Dated snapshot (2026-05); live SEO strategy lives in `.ai-collab/context/seo-growth-ads-strategy-2026-07.md` |
| `ai-information-hub/public/llms.txt` | AI crawler and citation-facing site description |
| `ai-information-hub/public/robots.txt` | Crawler access policy |

Strategy, launch, keyword-audit, and roadmap files under `.ai-collab/context/` may be dated planning snapshots. If they are not updated, add or preserve a header that makes their snapshot status clear.

## Update Checklist

When a change touches one of these areas, update all matching docs in the same change:

| Change area | Docs to check |
| --- | --- |
| Public routes, SEO pages, or middleware allowlists | root/frontend README, both `CLAUDE.md` files, `codebase-map.md`, `llms.txt`, SEO/GEO plan |
| Backend API endpoint or response shape | root README, backend README, both `CLAUDE.md` files, `project-overview.md`, `llms.txt` if public |
| Data pipeline, model choices, or translation behavior | root README, backend README, translated READMEs, both `CLAUDE.md` files |
| Newsletter signup or email delivery | root/frontend README, both `CLAUDE.md` files, brand guidelines if visual/tone changes |
| Brand, typography, or major frontend style | frontend README, brand guidelines, `project-overview.md`, `codebase-map.md` |
| SEO/GEO implementation | SEO/GEO plan implementation log, `llms.txt`, `robots.txt` if crawler policy changes |
| Deployment or environment variables | root README, service README, both `CLAUDE.md` files |

## Best Practices

- Separate current-state docs from historical planning notes.
- Prefer stable route patterns over examples that can drift.
- Mark open risks explicitly instead of implying that planned features already exist.
- Translated READMEs (`docs/README.*.md`) are intentionally ~30-line summaries linking to the English README — do NOT expand them back into full translations (they rot in 7 languages at once; decided 2026-08-01).
- **Invariants principle**: docs describe invariants and point to code for specifics. Never hardcode source lists, query lists, model IDs-in-prose, or line numbers — reference the owning function instead (`collector.load_sources()`, `youtube_fetcher.CHANNEL_ALLOWLIST`, `llm_processor.*_MODELS`).
- For docs-only changes, run `git diff --check` at minimum.
