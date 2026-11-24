# Home-Base

Android TV app in `tv/app`, web page in `tv/page`. See `tv/README.md` and `tv/PLAN.md`.

## Subagents
- Main session runs on Sonnet (`.claude/settings.json`).
- Searches across many files: use the `search` (map) or `grep` (call sites) agents. A single quick grep, just do it yourself.
- Before committing: run the `audit` agent on the diff.
- Before locking a big plan, after the same error twice, and before calling work done: ask `reviewer` (Opus).
- Never open `*.apk`, `build/`, `keystore.properties`, `*.jks`.
