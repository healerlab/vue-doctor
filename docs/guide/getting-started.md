# Getting Started

## Quick Start

Run vue-doctor on any Vue.js project:

```bash
npx @healerlab/vue-doctor@latest .
```

For verbose output with file locations:

```bash
npx @healerlab/vue-doctor@latest . --verbose
```

## What it does

Vue Doctor auto-detects your project setup and runs **four analysis engines in parallel**:

| Engine | What it checks |
|---|---|
| **oxlint** | Script-level: performance, security, correctness |
| **eslint-plugin-vue** | Template-level: directives, reactivity, best practices |
| **Custom rules** | Vue anti-patterns: reactivity loss, Nuxt SSR, Pinia misuse |
| **knip** | Dead code: unused files, exports, types, dependencies |

## Auto-detection

Vue Doctor automatically detects:

- **Vue version** (2.x or 3.x)
- **Framework** (Nuxt 2/3, Vite, Vue CLI, or standalone)
- **TypeScript** support
- **State management** (Pinia or Vuex)
- **Vue Router**

## Score Interpretation

| Score | Label | Meaning |
|---|---|---|
| 80–100 | 🟢 Great | Healthy project, minor optimizations only |
| 50–79 | 🟡 Needs work | Several issues to address |
| 0–49 | 🔴 Critical | Major problems needing urgent attention |

## CLI Options

```bash
vue-doctor [options] [command] [directory]

Options:
  -v, --version        output the version number
  --no-lint            skip linting
  --no-dead-code       skip dead code detection
  --verbose            show file details per rule
  --score              output only the score
  --diff [base]        scan only changed files vs base branch
  --fix                output diagnostics for AI agents
  -h, --help           display help for command

Commands:
  install-skill        install skill for AI coding agents
```
