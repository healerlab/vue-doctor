---
name: vue-doctor
description: Diagnose and auto-fix Vue.js / Nuxt project issues — reactivity, performance, security, accessibility, Nuxt SSR, Pinia, and dead code. Use when checking, reviewing, or fixing a Vue codebase.
---

# Vue Doctor Skill

Diagnose Vue.js / Nuxt projects for health issues and auto-fix them. One command
runs four engines in parallel (oxlint, eslint-plugin-vue, custom Vue rules, knip)
and returns a 0–100 health score with actionable diagnostics.

## When to use

- The user asks to check, diagnose, audit, or fix a Vue/Nuxt project
- Reviewing Vue components for anti-patterns before a commit or PR
- Gating a build on code health in CI
- The user says "run vue-doctor" or "check my Vue project"

## Pick the right command

| Goal | Command |
|---|---|
| **Auto-fix issues (agents — start here)** | `npx vue-doctor@latest . --json` |
| Human-readable scan | `npx vue-doctor@latest . --verbose` |
| Only changed files (fast PR check) | `npx vue-doctor@latest . --diff main --json` |
| CI gate (fail under a threshold) | `npx vue-doctor@latest . --min-score 80` |
| Score only | `npx vue-doctor@latest . --score` |

`--no-dead-code` and `--no-lint` skip those engines. `--diff` automatically skips
dead-code analysis (it needs the whole project).

## Auto-fix workflow (for AI / coding agents)

**Always use `--json`** — it emits a stable, parseable document with no colors or
spinner noise. Do not parse the human/`--fix` output.

1. Run `npx vue-doctor@latest . --json` (add `--diff main` to scope to the PR).
2. Parse the JSON. Each entry in `diagnostics[]` has:
   `file`, `line`, `column`, `severity`, `category`, `rule`, `message`, `fix`.
3. For each diagnostic, open `file` at `line:column`, apply the `fix` guidance
   (see the rule table below), and edit the code.
4. Fix `severity: "error"` items first, then `warning`.
5. Re-run `--json` and confirm `score.value` went up and `summary.errors` dropped.

### JSON shape

```json
{
  "schema": "vue-doctor/diagnosis@1",
  "score": { "value": 82, "label": "Great" },
  "project": { "framework": "nuxt3", "vueVersion": "^3.4.0", "typescript": true },
  "summary": { "total": 5, "errors": 1, "warnings": 4, "byCategory": { "Reactivity": 2 } },
  "diagnostics": [
    {
      "file": "src/components/User.vue",
      "line": 12, "column": 1,
      "severity": "error",
      "category": "Reactivity",
      "rule": "vue-doctor/reactivity-destructure-props",
      "message": "Destructuring props loses reactivity in Vue 3",
      "fix": "Use toRefs(props) or access props.xxx directly"
    }
  ],
  "diff": null,
  "elapsedMs": 1240
}
```

## Exit codes (CI / scripting)

- `0` — completed (and, if `--min-score` was set, score met the threshold)
- `1` — score below `--min-score`, or the scan failed (no Vue project, etc.)

```bash
npx vue-doctor@latest . --min-score 80   # exits 1 if health < 80
```

## Score interpretation

- **80–100 (Great):** healthy project, minor optimizations only
- **50–79 (Needs work):** several issues to address
- **0–49 (Critical):** major problems needing urgent attention

## Diagnostic categories

Reactivity · Performance · Security · Correctness · Accessibility ·
Architecture · Best Practices · Nuxt · Dead Code

## Rule → fix reference

| Rule | How to fix |
|---|---|
| `reactivity-destructure-props` | Use `toRefs(props)` or access `props.xxx` directly |
| `reactivity-reactive-reassign` | Use `Object.assign(state, newData)` instead of `state = newData` |
| `reactivity-ref-no-value` | Add `.value` when reading/writing refs in `<script>` |
| `pinia-no-store-to-refs` | Wrap with `storeToRefs()`: `const { count } = storeToRefs(store)` |
| `pinia-direct-state-mutation` | Use store actions or `$patch()` |
| `correctness-mutating-props` | Emit an event to the parent, or copy the prop into local `ref`/`computed` |
| `perf-giant-component` | Extract sub-components to get the file under 300 lines |
| `perf-v-for-method-call` | Replace the in-template method call with a `computed` |
| `perf-v-if-with-v-for` | Move `v-if` to a wrapper `<template>`, or pre-filter with a `computed` |
| `a11y-img-no-alt` | Add an `alt` attribute (`alt=""` for decorative images) |
| `security-v-html` | Sanitize HTML (e.g. DOMPurify) or use `{{ }}` interpolation |
| `nuxt-fetch-in-mounted` | Move `useFetch`/`useAsyncData` to the top level of `<script setup>` |
| `nuxt-no-navigate-to-in-setup` | `return navigateTo('/path')` from setup |
| `arch-mixed-api-styles` | Migrate to Composition API with `<script setup>` |

## Node.js API

For programmatic use in custom scripts:

```typescript
import { diagnose } from "@healerlab/vue-doctor/api";

const result = await diagnose("./path/to/vue-project");
console.log(result.score);       // { score: 82, label: "Great" }
console.log(result.diagnostics); // Array<Diagnostic>
```

## Configuration

Users can ignore rules/files via `.vue-doctorrc` in the project root:

```json
{
  "ignore": {
    "rules": ["vue/no-v-html"],
    "files": ["src/generated/**"]
  }
}
```
