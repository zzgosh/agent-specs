---
name: release-pr
description: Create and push a release pull request for this repository when the user wants to bump the npm package version, prepare a release branch, and open a PR before manually triggering the GitHub release workflow.
---

# Release PR

Use this skill when the user asks to prepare a release PR for this repository, for example:

- "Create the release PR for 0.1.5"
- "Bump the package to 0.1.5 and open a release PR"
- "Prepare the next npm release branch"

This skill covers the manual pre-release workflow only: create a release branch, bump the npm version, validate the package still builds, commit, push, and open a PR. Do not trigger the release workflow unless the user explicitly asks.

## Workflow

1. Confirm the target version.
2. Start from the latest `main`.
3. Create a dedicated release branch.
4. Bump the version with npm tooling.
5. Build to verify the release state.
6. Commit only the release-version changes.
7. Push the branch and create the PR with `gh pr create --body-file`.

## Rules

- Use a fresh branch from `main`. For this repository, prefer `codex/release-v<version>`.
- Use `npm version <version> --no-git-tag-version` instead of manually editing version fields.
- Expect both `package.json` and `package-lock.json` to change. Review both.
- Do not create a git tag locally for the PR. The repository release workflow handles tagging after merge.
- Do not trigger the GitHub Actions release workflow unless the user explicitly asks.
- If the working tree is not clean before starting, stop and ask how to proceed unless the existing changes are obviously part of the requested release work.

## Commands

Use the commands as separate one-shot steps. Do not rewrite history and do not use interactive git flows.

```bash
git checkout main
git pull --ff-only
git checkout -b codex/release-v0.1.4
npm version 0.1.4 --no-git-tag-version
npm run build
git add package.json package-lock.json
git commit -m "chore: release v0.1.4"
git push -u origin codex/release-v0.1.4
```

Create the PR body with a temporary file rather than inline escaped newlines:

```bash
body_file=$(mktemp)
cat > "$body_file" <<'EOF'
## Summary

- bump package version to `0.1.4`
- align `package-lock.json` root package metadata with the release version

## Testing

- npm run build
EOF

gh pr create \
  --title "chore: release v0.1.4" \
  --body-file "$body_file" \
  --base main \
  --head codex/release-v0.1.4
```

## Validation Checklist

- `package.json` version matches the requested release version.
- `package-lock.json` top-level `version` matches `package.json`.
- `package-lock.json.packages[""].version` matches `package.json`.
- `npm run build` passes.
- The commit contains only release-version changes unless the user explicitly asked for more.
- The PR title matches `chore: release v<version>`.

## Output Expectations

When completing the task, report:

- the branch name
- the release commit hash
- the PR URL
- whether `npm run build` passed
- any blockers, such as an existing dirty worktree or version mismatch
