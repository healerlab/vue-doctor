# Vue Doctor — Example GitHub Actions Workflows

## 1. Run on every PR (diff mode)

```yaml
# .github/workflows/vue-doctor.yml
name: Vue Doctor

on:
  pull_request:
    branches: [main, develop]

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Need full history for diff

      - name: Vue Doctor
        uses: user/vue-doctor@v1
        with:
          diff: "true"
          verbose: "true"
          fail-on-score: "60"
```

## 2. Full scan on main branch

```yaml
name: Vue Doctor Full Scan

on:
  push:
    branches: [main]

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Vue Doctor
        id: doctor
        uses: user/vue-doctor@v1
        with:
          verbose: "true"

      - name: Comment PR with score
        if: always()
        run: |
          echo "## 🩺 Vue Doctor Score: ${{ steps.doctor.outputs.score }}/100 (${{ steps.doctor.outputs.label }})" >> $GITHUB_STEP_SUMMARY
```

## 3. Using npx directly (no action)

```yaml
name: Vue Doctor

on: pull_request

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm ci

      - name: Run Vue Doctor
        run: npx vue-doctor@latest . --diff main --verbose
```

## 4. Score as PR comment (with threshold gate)

```yaml
name: Vue Doctor PR Check

on: pull_request

permissions:
  pull-requests: write

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm ci

      - name: Get Score
        id: score
        run: |
          SCORE=$(npx vue-doctor@latest . --score 2>/dev/null || echo "0")
          echo "score=$SCORE" >> $GITHUB_OUTPUT

      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            const score = ${{ steps.score.outputs.score }};
            const emoji = score >= 80 ? '🟢' : score >= 50 ? '🟡' : '🔴';
            const label = score >= 80 ? 'Great' : score >= 50 ? 'Needs work' : 'Critical';

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `## 🩺 Vue Doctor\n\n${emoji} **Score: ${score}/100** (${label})\n\nRun \`npx vue-doctor . --verbose\` locally for details.`
            });
```
