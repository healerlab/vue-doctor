# Node.js API

Use `vue-doctor` programmatically in your scripts and tools.

## Install

```bash
npm install @healerlab/vue-doctor
```

## Usage

```ts
import { diagnose } from "@healerlab/vue-doctor/api";

const result = await diagnose("./path/to/vue-project");

console.log(result.score);       // { score: 82, label: "Great" }
console.log(result.diagnostics); // Array<Diagnostic>
console.log(result.project);     // ProjectInfo
```

## `diagnose(directory, options?)`

### Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `directory` | `string` | — | Path to Vue project root |
| `options.lint` | `boolean` | `true` | Run lint checks |
| `options.deadCode` | `boolean` | `true` | Run dead code detection |
| `options.includePaths` | `string[]` | `[]` | Only scan specific files |

### Returns: `DiagnoseResult`

```ts
interface DiagnoseResult {
  diagnostics: Diagnostic[];
  score: ScoreResult;
  project: ProjectInfo;
  elapsedMilliseconds: number;
}
```

## Types

### `Diagnostic`

```ts
interface Diagnostic {
  filePath: string;
  plugin: string;
  rule: string;
  severity: "error" | "warning";
  message: string;
  help?: string;
  line: number;
  column: number;
  category: string;
}
```

### `ScoreResult`

```ts
interface ScoreResult {
  score: number;            // 0-100
  label: string;            // "Great" | "Needs work" | "Critical"
  errorCount: number;
  warningCount: number;
}
```

### `ProjectInfo`

```ts
interface ProjectInfo {
  vueVersion: string | null;
  framework: Framework;      // "nuxt3" | "nuxt2" | "vite" | "vue-cli" | "unknown"
  frameworkDisplayName: string;
  hasTypeScript: boolean;
  hasPinia: boolean;
  hasVuex: boolean;
  hasVueRouter: boolean;
  sourceFileCount: number;
}
```

## Example: Custom CI Script

```ts
import { diagnose } from "@healerlab/vue-doctor/api";

const result = await diagnose(".");

if (result.score.score < 70) {
  console.error(`Health score ${result.score.score} is below threshold`);
  process.exit(1);
}

console.log(`✅ Score: ${result.score.score}/100`);
```
