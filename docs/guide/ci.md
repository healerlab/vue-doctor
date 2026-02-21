# CI / GitHub Actions

## Basic PR Check

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
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: "20"

      - run: npm ci

      - name: Vue Doctor (diff mode)
        run: npx @healerlab/vue-doctor@latest . --diff main --verbose
```

## Score Gate

Fail the build if the score drops below a threshold:

```yaml
- name: Check Score
  run: |
    SCORE=$(npx @healerlab/vue-doctor@latest . --score)
    echo "Score: $SCORE"
    if [ "$SCORE" -lt 60 ]; then
      echo "::error::Vue Doctor score $SCORE is below threshold 60"
      exit 1
    fi
```

## PR Comment with Score

```yaml
- name: Get Score
  id: score
  run: |
    SCORE=$(npx @healerlab/vue-doctor@latest . --score 2>/dev/null || echo "0")
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
        body: `## 🩺 Vue Doctor\n\n${emoji} **Score: ${score}/100** (${label})`
      });
```

## Full Scan on Push

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
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npx @healerlab/vue-doctor@latest . --verbose
```
