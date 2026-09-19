#!/usr/bin/env bash
#
# Phase publisher: verify, build, commit and push in one step.
#
#   ./scripts/publish.sh "feat: add the phase 5 species map"
#
# Every phase of the project goes out through this script so the sequence is
# always the same: the checks run first, the production build is proven to
# compile, and only then is anything pushed. CI re-runs the same suite on the
# server, which is the actual guarantee.
#
# Flags:
#   --no-build   skip the production build (checks still run)
#   --dry-run    do everything except the push

set -euo pipefail

MESSAGE=""
SKIP_BUILD=0
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --no-build) SKIP_BUILD=1 ;;
    --dry-run) DRY_RUN=1 ;;
    -*) echo "unknown flag: $arg" >&2; exit 2 ;;
    *) MESSAGE="$arg" ;;
  esac
done

if [ -z "$MESSAGE" ]; then
  echo "usage: ./scripts/publish.sh \"<commit message>\" [--no-build] [--dry-run]" >&2
  exit 2
fi

cd "$(dirname "$0")/.."

echo "==> 1/5 typecheck"
npm run typecheck

echo "==> 2/5 check suites"
node --test scripts/check-rigs.mjs scripts/check-size.mjs scripts/check-sql.mjs

echo "==> 3/5 seed is in sync with the dataset"
npm run seed:generate
if ! git diff --quiet supabase/seed.sql; then
  echo "    seed.sql was stale and has been regenerated — it will be included in this commit."
fi

if [ "$SKIP_BUILD" -eq 0 ]; then
  echo "==> 4/5 production build"
  npm run build
else
  echo "==> 4/5 production build (skipped)"
fi

echo "==> 5/5 commit and push"
if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  echo "    nothing to commit; pushing any existing commits."
else
  git add -A
  git commit -m "$MESSAGE"
fi

if [ "$DRY_RUN" -eq 1 ]; then
  echo "    --dry-run: not pushing."
  exit 0
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git push origin "$BRANCH"
echo "    pushed $BRANCH -> $(git remote get-url origin)"
