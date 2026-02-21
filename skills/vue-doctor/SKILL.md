---
name: vue-doctor
description: Run vue-doctor to diagnose and fix Vue.js project issues
---

# Vue Doctor Skill

Use this skill to analyze Vue.js projects for health issues and auto-fix them.

## When to use

- When the user asks to check a Vue/Nuxt project for issues
- When reviewing Vue components for anti-patterns
- When fixing linting or architecture issues in a Vue codebase
- When the user says "run vue-doctor" or "check my Vue project"

## How to run

### 1. Full scan

```bash
npx vue-doctor@latest . --verbose
```

### 2. Diff mode (only changed files)

```bash
npx vue-doctor@latest . --diff main --verbose
```

### 3. Fix mode (get structured diagnostics for auto-fixing)

```bash
npx vue-doctor@latest . --fix
```

### 4. Score only

```bash
npx vue-doctor@latest . --score
```

## Understanding the output

### Score ranges
- **80–100 (Great):** Project is healthy, minor optimizations only
- **50–79 (Needs work):** Several issues to address
- **0–49 (Critical):** Major problems that need urgent attention

### Diagnostic categories
- **Reactivity:** Props destructuring, reactive() reassignment, ref without .value
- **Performance:** Giant components, v-for method calls
- **Nuxt:** SSR anti-patterns (useFetch in onMounted, navigateTo without return)
- **Best Practices:** Pinia direct mutations, mixed API styles
- **Dead Code:** Unused files, exports, types, dependencies

## Auto-fix workflow

When the user asks to fix issues:

1. Run vue-doctor with `--fix` flag to get structured diagnostics
2. Read each diagnostic's file, rule, and suggested fix
3. Apply fixes one by one, following the "Fix" guidance in each diagnostic
4. Re-run vue-doctor to verify the score improved

### Common fixes

| Rule | How to fix |
|---|---|
| `reactivity-destructure-props` | Use `toRefs(props)` or access `props.xxx` directly |
| `reactivity-reactive-reassign` | Use `Object.assign(state, newData)` instead of `state = newData` |
| `reactivity-ref-no-value` | Add `.value` when accessing refs in `<script>` |
| `perf-giant-component` | Extract sub-components to reduce file size below 300 lines |
| `nuxt-fetch-in-mounted` | Move `useFetch`/`useAsyncData` to top level of `<script setup>` |
| `pinia-no-store-to-refs` | Wrap with `storeToRefs()`: `const { count } = storeToRefs(store)` |
| `pinia-direct-state-mutation` | Use store actions or `$patch()` |
| `arch-mixed-api-styles` | Migrate to Composition API with `<script setup>` |

## Node.js API

For programmatic use in custom scripts:

```typescript
import { diagnose } from "vue-doctor/api";

const result = await diagnose("./path/to/vue-project");
console.log(result.score);       // { score: 82, label: "Great" }
console.log(result.diagnostics); // Array<Diagnostic>
```

## Configuration

The user can configure vue-doctor via `.vue-doctorrc` in their project root:

```json
{
  "ignore": {
    "rules": ["vue/no-v-html"],
    "files": ["src/generated/**"]
  }
}
```
