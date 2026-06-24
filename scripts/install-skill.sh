#!/usr/bin/env bash
# ============================================================
# Vue Doctor — Install AI Agent Skill
# Automatically detects coding agents and installs the
# vue-doctor skill to help them diagnose Vue.js projects.
#
# Usage:
#   curl -fsSL https://vue.doctor/install-skill.sh | bash
#   OR
#   npx vue-doctor install-skill
# ============================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Skill content
SKILL_DIR_NAME="vue-doctor"

SKILL_CONTENT='---
name: vue-doctor
description: Diagnose and fix Vue.js / Nuxt issues — reactivity, performance, security, a11y, Nuxt SSR, Pinia, dead code
---

# Vue Doctor Skill

Use this skill when the user asks to check, diagnose, or fix a Vue.js / Nuxt project.

## Commands

| Goal | Command |
|---|---|
| Auto-fix (agents start here) | npx vue-doctor@latest . --json |
| Human-readable scan | npx vue-doctor@latest . --verbose |
| Only changed files | npx vue-doctor@latest . --diff main --json |
| CI gate (fail under threshold) | npx vue-doctor@latest . --min-score 80 |
| Score only | npx vue-doctor@latest . --score |

## Auto-fix workflow (AI / coding agents)

Always use --json. It is stable and parseable, with no colors or spinner noise.
Do not parse the --fix or --verbose output.

1. Run: npx vue-doctor@latest . --json  (add --diff main to scope to the PR)
2. Parse the JSON. Each diagnostics[] entry has:
   file, line, column, severity, category, rule, message, fix.
3. Open each file at line:column and apply the "fix" guidance.
4. Fix severity "error" items first, then "warning".
5. Re-run --json and confirm score.value rose and summary.errors dropped.

## Exit codes
- 0: completed (and score met --min-score if set)
- 1: score below --min-score, or the scan failed

## Score: 80-100 Great | 50-79 Needs work | 0-49 Critical

## Rule reference

| Rule | Fix |
|---|---|
| reactivity-destructure-props | Use toRefs(props) or access props.xxx directly |
| reactivity-reactive-reassign | Use Object.assign(state, newData) |
| reactivity-ref-no-value | Add .value in script |
| pinia-no-store-to-refs | Use storeToRefs(store) |
| pinia-direct-state-mutation | Use actions or $patch() |
| correctness-mutating-props | Emit an event, or copy the prop into a local ref/computed |
| perf-giant-component | Split into sub-components (<300 lines) |
| perf-v-for-method-call | Replace the in-template call with a computed |
| perf-v-if-with-v-for | Move v-if to a wrapper template, or pre-filter with a computed |
| a11y-img-no-alt | Add an alt attribute (alt="" for decorative images) |
| security-v-html | Sanitize HTML (DOMPurify) or use text interpolation |
| nuxt-fetch-in-mounted | Move useFetch to top level of script setup |
| nuxt-no-navigate-to-in-setup | return navigateTo("/path") |
| arch-mixed-api-styles | Migrate to script setup |

## Configuration

Ignore rules/files via .vue-doctorrc in the project root:

    {
      "ignore": {
        "rules": ["vue/no-v-html"],
        "files": ["src/generated/**"]
      }
    }
'

# ============================================================
# Agent detection
# ============================================================

declare -a INSTALLED_AGENTS=()
TOTAL_INSTALLED=0

print_header() {
  echo ""
  echo -e "${BOLD}  🩺 Vue Doctor — Skill Installer${NC}"
  echo -e "${DIM}  Teach your coding agent Vue.js best practices${NC}"
  echo ""
}

install_skill_to_dir() {
  local dir="$1"
  local agent_name="$2"
  local skill_path="${dir}/${SKILL_DIR_NAME}"

  mkdir -p "${skill_path}"
  echo "${SKILL_CONTENT}" > "${skill_path}/SKILL.md"
  INSTALLED_AGENTS+=("${agent_name}")
  TOTAL_INSTALLED=$((TOTAL_INSTALLED + 1))
}

# ---- Cursor ----
detect_cursor() {
  # Project-level
  if [ -d ".cursor" ]; then
    install_skill_to_dir ".cursor/skills" "Cursor (project)"
  fi
  # Global
  local global_dir="${HOME}/.cursor/skills"
  if [ -d "${HOME}/.cursor" ]; then
    install_skill_to_dir "${global_dir}" "Cursor (global)"
  fi
}

# ---- Claude Code ----
detect_claude() {
  # Project-level
  if [ -d ".claude" ]; then
    install_skill_to_dir ".claude/skills" "Claude Code (project)"
  fi
  # Global
  local global_dir="${HOME}/.claude/skills"
  if [ -d "${HOME}/.claude" ]; then
    install_skill_to_dir "${global_dir}" "Claude Code (global)"
  fi
}

# ---- Antigravity ----
detect_antigravity() {
  # Project-level
  if [ -d ".agent" ]; then
    install_skill_to_dir ".agent/skills" "Antigravity (project)"
  fi
  # Global
  local global_dir="${HOME}/.agent/skills"
  if [ -d "${HOME}/.agent" ]; then
    install_skill_to_dir "${global_dir}" "Antigravity (global)"
  fi
}

# ---- Windsurf ----
detect_windsurf() {
  if [ -d ".windsurf" ]; then
    install_skill_to_dir ".windsurf/skills" "Windsurf (project)"
  fi
  local global_dir="${HOME}/.windsurf/skills"
  if [ -d "${HOME}/.windsurf" ]; then
    install_skill_to_dir "${global_dir}" "Windsurf (global)"
  fi
}

# ---- Amp Code ----
detect_amp() {
  if [ -d ".amp" ]; then
    install_skill_to_dir ".amp/skills" "Amp Code (project)"
  fi
}

# ---- Codex ----
detect_codex() {
  if [ -d ".codex" ]; then
    install_skill_to_dir ".codex/skills" "Codex (project)"
  fi
}

# ---- Gemini CLI ----
detect_gemini() {
  if [ -d ".gemini" ]; then
    install_skill_to_dir ".gemini/skills" "Gemini CLI (project)"
  fi
}

# ============================================================
# Main
# ============================================================

print_header

echo -e "${DIM}  Detecting coding agents...${NC}"
echo ""

detect_cursor
detect_claude
detect_antigravity
detect_windsurf
detect_amp
detect_codex
detect_gemini

if [ ${TOTAL_INSTALLED} -eq 0 ]; then
  echo -e "${YELLOW}  ⚠ No coding agents detected.${NC}"
  echo ""
  echo -e "  To install manually, create the skill file in your agent's skill directory:"
  echo ""
  echo -e "    ${DIM}Cursor:${NC}       .cursor/skills/vue-doctor/SKILL.md"
  echo -e "    ${DIM}Claude Code:${NC}  .claude/skills/vue-doctor/SKILL.md"
  echo -e "    ${DIM}Antigravity:${NC}  .agent/skills/vue-doctor/SKILL.md"
  echo -e "    ${DIM}Windsurf:${NC}     .windsurf/skills/vue-doctor/SKILL.md"
  echo ""

  # Offer to install to all common directories anyway
  echo -e "  ${BOLD}Installing to all common directories...${NC}"
  echo ""
  mkdir -p ".cursor/skills/${SKILL_DIR_NAME}" && echo "${SKILL_CONTENT}" > ".cursor/skills/${SKILL_DIR_NAME}/SKILL.md"
  mkdir -p ".claude/skills/${SKILL_DIR_NAME}" && echo "${SKILL_CONTENT}" > ".claude/skills/${SKILL_DIR_NAME}/SKILL.md"
  mkdir -p ".agent/skills/${SKILL_DIR_NAME}" && echo "${SKILL_CONTENT}" > ".agent/skills/${SKILL_DIR_NAME}/SKILL.md"

  echo -e "  ${GREEN}✓${NC} Installed to .cursor/skills/, .claude/skills/, .agent/skills/"
else
  for agent in "${INSTALLED_AGENTS[@]}"; do
    echo -e "  ${GREEN}✓${NC} ${agent}"
  done
fi

echo ""
echo -e "${DIM}  ─────────────────────────────────────────${NC}"
echo ""
echo -e "  ${GREEN}Done!${NC} Your coding agent now knows ${BOLD}Vue Doctor${NC} best practices."
echo -e "  ${DIM}Ask your agent: \"Run vue-doctor on this project\"${NC}"
echo ""
