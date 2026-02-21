# Configuration

Vue Doctor works out of the box with zero configuration. Optionally, you can customize its behavior.

## Config File

Create a `.vue-doctorrc` in your project root:

```json
{
  "ignore": {
    "rules": ["vue/no-v-html", "knip/exports"],
    "files": ["src/generated/**"]
  }
}
```

## Package.json

Alternatively, use the `"vueDoctor"` key in `package.json`:

```json
{
  "vueDoctor": {
    "ignore": {
      "rules": ["vue/no-v-html"],
      "files": ["src/generated/**", "*.test.ts"]
    }
  }
}
```

## Options

### `ignore.rules`

Array of rule IDs to ignore. Supports both short and fully-qualified names:

```json
{
  "ignore": {
    "rules": [
      "vue/no-v-html",
      "vue-doctor/perf-giant-component",
      "knip/exports"
    ]
  }
}
```

### `ignore.files`

Glob patterns for files to exclude from diagnostics:

```json
{
  "ignore": {
    "files": [
      "src/generated/**",
      "**/*.test.ts",
      "**/*.spec.ts"
    ]
  }
}
```
