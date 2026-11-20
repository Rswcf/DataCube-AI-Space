#!/usr/bin/env bash
# Vercel "Ignored Build Step" (vercel.json → ignoreCommand). Vercel runs it from
# the project's Root Directory (ai-information-hub/) before every build:
#   exit 0 → skip the build, exit 1 → build.
#
# The monorepo also holds ai-hub-backend/, docs/ and .github/. Before this
# script, every push to main deployed the frontend, even a backend-only commit,
# and each deployment starts with an empty ISR cache that crawlers then refill
# (billed ISR writes + function CPU). Three of the five production deploys
# before 2026-11-21 (#33, #34, #35) changed no frontend file.
#
# Fail open: whenever the answer is not a clear "nothing changed here", build.

prev="${VERCEL_GIT_PREVIOUS_SHA:-}"
curr="${VERCEL_GIT_COMMIT_SHA:-HEAD}"

if [ -z "$prev" ]; then
  echo "No previous deployment SHA for this branch: building."
  exit 1
fi

# A shallow clone may not contain the previous SHA; git then errors (exit 128).
if ! git cat-file -e "${prev}^{commit}" 2>/dev/null; then
  echo "Previous deployment ${prev} is not in the clone: building."
  exit 1
fi

if git diff --quiet "$prev" "$curr" -- .; then
  echo "No changes under ai-information-hub/ since ${prev}: skipping the build."
  exit 0
fi

echo "ai-information-hub/ changed since ${prev}: building."
exit 1
