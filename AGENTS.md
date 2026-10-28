# Instructions for coding assistants

- This Desktop source repository is the team's development copy. Read `CONTRIBUTING.md` before making changes. Preserve human edits; do not copy files from the old Codex workspace over this repository.
- After the initial bootstrap commit, work on a feature/fix/docs branch, never directly on `main`. Inspect status first. If human work is present, preserve it and avoid including it in your changes.
- Check the assigned Issue/PR scope. Keep shared-file changes small: `src/main.cjs`, preload bridges, package manifests/lockfile and build scripts are integration points. Coordinate overlaps through the human task owner; do not assume files are locked or require a separate permission ritual for an already authorized change.
- Do not reformat unrelated files, mass-rename assets or change dependencies as part of a cosmetic edit. Use existing plain JavaScript, HTML/CSS, Canvas and C# architecture.
- Use `npm ci` for an existing lockfile. Commit `package.json` and `package-lock.json` together when dependencies intentionally change.
- Run `npm run check` and `npm test` for relevant code changes. UI changes need visual verification; native C# changes need the corresponding helper rebuilt and tested on Windows. Be explicit about checks not run; CI is not a full native/UI test.
- Do not commit caches, local app data or test output. The small runtime helpers in `src/native/*.exe` are intentionally tracked with their C# source for now; rebuild them when editing native code.
- Never force-push, bypass checks or use destructive resets to resolve conflicts. Merge `origin/main` into the task branch and preserve both intended behaviors. Do not merge a PR without the human's authorization and the team's review requirements.
- Keep the app silent. Respect reduced motion, click-through behavior in game mode, local-only media metadata and context-isolated IPC. Do not claim support for exclusive fullscreen or macOS adapters without real verification.
