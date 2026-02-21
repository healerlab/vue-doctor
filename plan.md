# Vue Doctor — Kế hoạch phát triển

> CLI tool "khám bệnh" cho dự án Vue.js — lấy cảm hứng từ kiến trúc [react-doctor](https://github.com/millionco/react-doctor).

---

## 1. Triết lý thiết kế

**Orchestrator, NOT Parser** — Vue Doctor không tự viết parser hay rules từ đầu. Thay vào đó, nó kết hợp (orchestrate) các tools mạnh có sẵn, tổng hợp kết quả thành **health score 0-100** với actionable diagnostics.

### Mô hình hoạt động:

```
[CLI Input] → [Discover Project] → [Parallel Analysis] → [Combine & Score] → [Report]
                   │                       │
                   │                  ┌────┴────┐
                   │                  │         │
              Detect Vue 2/3    [Oxlint]   [Knip]
              Detect Nuxt       Script      Dead code
              Detect Vite       analysis    detection
              Detect TS             │
                   │           [ESLint +
                   │         plugin-vue]
                   │          Template
                   │          analysis
                   │               │
                   └──────→ [Combine Diagnostics] → [Score 0-100]
```

---

## 2. Kiến trúc kỹ thuật

### 2.1. Lint Engine — Hybrid Approach

Oxlint (v1.0+) hỗ trợ lint `<script>` trong `.vue` files, nhưng **chưa hỗ trợ template-level rules** của eslint-plugin-vue. Do đó dùng **hybrid**:

| Layer | Tool | Phạm vi |
|---|---|---|
| **Script-level** | **oxlint** | JS/TS logic trong `<script>`, performance, security, correctness |
| **Template-level** | **ESLint + eslint-plugin-vue** | `v-if`/`v-for` conflicts, template directives, accessibility |
| **Dead code** | **knip** | Unused files, exports, types, duplicates |

### 2.2. Project Discovery

Detect tự động từ `package.json` và config files:

| Detect | Config files |
|---|---|
| Vue 2 / Vue 3 | `package.json` → `vue` version |
| Nuxt 2 / Nuxt 3 | `nuxt.config.ts`, `nuxt.config.js` |
| Vite | `vite.config.ts`, `vite.config.js` |
| TypeScript | `tsconfig.json` |
| Pinia / Vuex | `package.json` dependencies |
| Vue Router | `package.json` dependencies |

### 2.3. Core Dependencies

```json
{
  "dependencies": {
    "commander": "^14.0.0",
    "oxlint": "^1.47.0",
    "eslint": "^9.0.0",
    "eslint-plugin-vue": "^10.0.0",
    "vue-eslint-parser": "^10.0.0",
    "knip": "^5.83.0",
    "ora": "^9.3.0",
    "picocolors": "^1.1.0",
    "prompts": "^2.4.0",
    "typescript": ">=5.0.4 <7"
  },
  "devDependencies": {
    "tsdown": "^0.20.0",
    "vitest": "^3.0.0"
  }
}
```

---

## 3. Cấu trúc thư mục

```
vue-doctor/
├── packages/
│   └── vue-doctor/
│       ├── src/
│       │   ├── cli.ts                    # CLI entry (commander)
│       │   ├── index.ts                  # diagnose() public API
│       │   ├── types.ts                  # Diagnostic, ProjectInfo, ScoreResult
│       │   ├── constants.ts              # Patterns, limits
│       │   └── utils/
│       │       ├── discover-project.ts   # Detect Vue/Nuxt/Vite/TS
│       │       ├── load-config.ts        # Load .vue-doctorrc
│       │       ├── run-oxlint.ts         # Script-level lint (oxlint binary)
│       │       ├── run-eslint-vue.ts     # Template-level lint (eslint-plugin-vue)
│       │       ├── run-knip.ts           # Dead code detection
│       │       ├── combine-diagnostics.ts
│       │       ├── calculate-score.ts    # Severity-weighted scoring
│       │       └── format-output.ts      # Terminal output (picocolors + ora)
│       ├── tests/
│       │   ├── fixtures/                 # Sample Vue projects for testing
│       │   │   ├── vue3-basic/
│       │   │   ├── vue3-nuxt/
│       │   │   └── vue2-options/
│       │   ├── discover-project.test.ts
│       │   ├── calculate-score.test.ts
│       │   └── diagnose.test.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── tsdown.config.ts
├── skills/vue-doctor/                    # AI agent skill files
├── .oxlintrc.json                        # Oxlint config for self-linting
├── package.json                          # Monorepo root
├── pnpm-workspace.yaml
└── tsconfig.json
```

---

## 4. Bộ quy tắc kiểm tra (Rules)

### 4.1. Từ oxlint (Script-level) — có sẵn, chỉ cần enable:

**Performance:**
- Unnecessary re-renders, heavy computation
- `async/await` không dùng `Promise.all` cho parallel operations

**Security:**
- `v-html` với unsanitized input
- Eval usage, prototype pollution patterns

**Correctness:**
- TypeScript type errors
- Unused variables, unreachable code

### 4.2. Từ eslint-plugin-vue (Template-level) — có sẵn, chỉ cần integrate:

**Essential (Vue 3):**
- `vue/no-use-v-if-with-v-for` — v-if + v-for cùng element
- `vue/require-v-for-key` — thiếu `:key` trong v-for
- `vue/no-unused-components` — component import nhưng không dùng
- `vue/no-mutating-props` — mutate props trực tiếp
- `vue/return-in-computed-property` — computed thiếu return

**Strongly Recommended:**
- `vue/require-prop-types` — props thiếu type
- `vue/no-v-html` — XSS risk
- `vue/component-name-in-template-casing` — naming convention
- `vue/no-async-in-computed-properties` — async trong computed

**Performance:**
- `vue/no-useless-v-bind` — v-bind không cần thiết
- `vue/prefer-true-attribute-shorthand`
- Component lazy-loading patterns

### 4.3. Custom rules — viết riêng cho vue-doctor:

**Reactivity (Vue 3 Composition API):**
- Destructure `props` không dùng `toRefs()` → mất reactivity
- `reactive()` bị overwrite bằng reassignment
- `ref()` access thiếu `.value` trong script

**Nuxt-specific:**
- `useFetch` / `useAsyncData` trong `onMounted` (sai lifecycle)
- Auto-import conflicts (components/composables trùng tên)
- Missing `definePageMeta` cho route meta

**Pinia:**
- Mutate state trực tiếp ngoài store actions
- Store không dùng `storeToRefs()` khi destructure

**Architecture:**
- Giant SFC > 300 lines (khuyên tách component)
- Prop drilling > 3 levels (khuyên dùng provide/inject hoặc store)
- Mixed Options API + Composition API trong cùng project

---

## 5. Hệ thống tính điểm (Scoring)

```typescript
// Scoring formula (giống react-doctor)
// errors có weight cao hơn warnings
const calculateScore = (diagnostics: Diagnostic[]): ScoreResult => {
  const errorCount = diagnostics.filter(d => d.severity === 'error').length;
  const warningCount = diagnostics.filter(d => d.severity === 'warning').length;

  // Deduction: errors = 2 points, warnings = 0.5 points
  const deduction = (errorCount * 2) + (warningCount * 0.5);
  const score = Math.max(0, Math.round(100 - deduction));

  return {
    score,
    label: score >= 75 ? 'Great' : score >= 50 ? 'Needs work' : 'Critical'
  };
};
```

---

## 6. CLI Interface

```bash
# Cách dùng cơ bản
npx vue-doctor@latest .

# Verbose mode (hiện file + line number)
npx vue-doctor@latest . --verbose

# Chỉ lấy score
npx vue-doctor@latest . --score

# Chỉ scan files thay đổi
npx vue-doctor@latest . --diff main

# Skip một analysis
npx vue-doctor@latest . --no-lint
npx vue-doctor@latest . --no-dead-code
```

### Config file (`.vue-doctorrc` hoặc key `"vueDoctor"` trong package.json):

```json
{
  "ignore": {
    "rules": ["vue/no-v-html", "knip/exports"],
    "files": ["src/generated/**", "**/*.test.ts"]
  },
  "lint": true,
  "deadCode": true,
  "verbose": false
}
```

---

## 7. Node.js API

```typescript
import { diagnose } from 'vue-doctor/api';

const result = await diagnose('./path/to/vue-project');

console.log(result.score);       // { score: 82, label: 'Great' }
console.log(result.diagnostics); // Array<Diagnostic>
console.log(result.project);     // { framework: 'nuxt3', vueVersion: '3.x', ... }

// Interface
interface Diagnostic {
  filePath: string;
  plugin: string;        // 'oxlint' | 'eslint-plugin-vue' | 'knip' | 'vue-doctor'
  rule: string;
  severity: 'error' | 'warning';
  message: string;
  help: string;          // Actionable fix suggestion
  line: number;
  column: number;
  category: string;      // 'reactivity' | 'performance' | 'security' | ...
}
```

---

## 8. Lộ trình phát triển

### Phase 1 — MVP (1-2 tuần)
- [ ] Setup monorepo (pnpm workspace + tsdown)
- [ ] CLI skeleton: commander + picocolors + ora
- [ ] `discover-project.ts`: detect Vue 2/3, Nuxt 2/3, Vite, TS
- [ ] `run-oxlint.ts`: chạy oxlint binary, parse JSON output
- [ ] `run-eslint-vue.ts`: chạy ESLint programmatic API + eslint-plugin-vue
- [ ] `run-knip.ts`: dead code detection
- [ ] `combine-diagnostics.ts` + `calculate-score.ts`
- [ ] Formatted terminal output
- [ ] **Mục tiêu**: `npx vue-doctor .` → output score 0-100

### Phase 2 — Enhanced (2-3 tuần)
- [ ] Custom vue-doctor rules (reactivity, Nuxt, Pinia)
- [ ] `--verbose` mode (file + line details)
- [ ] `--diff` mode (chỉ scan changed files vs base branch)
- [ ] Config file support (`.vue-doctorrc`)
- [ ] `--fix` mode (mở AI agent để auto-fix)
- [ ] Node.js API export (`vue-doctor/api`)
- [ ] Workspace/monorepo support

### Phase 3 — Ecosystem (1 tuần)
- [ ] GitHub Actions integration
- [ ] AI agent skills (Cursor, Claude Code, Antigravity)
- [ ] Website + leaderboard cho Vue open-source projects
- [ ] `npx vue-doctor --install-skill` cho coding agents

---

## 9. So sánh kỹ thuật: React Doctor vs Vue Doctor

| Tính năng | React Doctor | Vue Doctor |
|---|---|---|
| **File types** | JSX / TSX | SFC (.vue) + JS/TS |
| **Script lint** | oxlint | oxlint |
| **Template lint** | N/A (JSX = JS) | eslint-plugin-vue |
| **Dead code** | knip | knip |
| **Framework detect** | Next.js, Vite, CRA, Remix, Expo | Nuxt 2/3, Vite, Vue CLI |
| **Trọng tâm** | Hooks, Render cycles, Compiler | Reactivity, Directives, SFC |
| **CLI** | commander + picocolors + ora | commander + picocolors + ora |
| **Config** | `.react-doctorrc` | `.vue-doctorrc` |
| **API** | `react-doctor/api` | `vue-doctor/api` |
| **Scoring** | 0-100, severity-weighted | 0-100, severity-weighted |