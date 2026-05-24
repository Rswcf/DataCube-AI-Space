# Documentation Maintenance

Last reviewed: 2026-05-24

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
| `docs/brand-guidelines.md` | Brand, typography, tone, and editorial design system |
| `docs/seo-geo-optimization-plan.md` | SEO/GEO backlog, implementation log, and audit base |
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
- Keep translated READMEs structurally aligned with the root README when architecture or pipeline basics change.
- For docs-only changes, run `git diff --check` at minimum.
