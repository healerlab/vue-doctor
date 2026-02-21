# Rules Overview

Vue Doctor runs **10 custom rules** in addition to oxlint, eslint-plugin-vue, and knip. These catch Vue-specific anti-patterns that general linters miss.

## Categories

| Category | Rules | Severity |
|---|---|---|
| [Reactivity](/rules/reactivity) | 3 rules | error / warning |
| [Performance](/rules/performance) | 2 rules | warning |
| [Nuxt](/rules/nuxt) | 2 rules | error / warning |
| [Pinia](/rules/pinia) | 2 rules | warning |
| [Architecture](/rules/architecture) | 1 rule | warning |

## All Rules

| Rule | Severity | Category |
|---|---|---|
| `reactivity-destructure-props` | error | Reactivity |
| `reactivity-reactive-reassign` | error | Reactivity |
| `reactivity-ref-no-value` | warning | Reactivity |
| `perf-giant-component` | warning | Performance |
| `perf-v-for-method-call` | warning | Performance |
| `nuxt-fetch-in-mounted` | error | Nuxt |
| `nuxt-no-navigate-to-in-setup` | warning | Nuxt |
| `pinia-no-store-to-refs` | warning | Pinia |
| `pinia-direct-state-mutation` | warning | Pinia |
| `arch-mixed-api-styles` | warning | Architecture |

## Ignoring Rules

Add rule IDs to `.vue-doctorrc`:

```json
{
  "ignore": {
    "rules": ["vue-doctor/perf-giant-component"]
  }
}
```
