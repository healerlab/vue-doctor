# AI Agent Skills

Teach your AI coding agents Vue.js best practices with one command.

## Install

```bash
npx @healerlab/vue-doctor install-skill
```

This auto-detects your installed coding agents and installs the Vue Doctor skill to each one.

## Supported Agents

| Agent | Project-level | Global |
|---|---|---|
| **Cursor** | `.cursor/skills/` | `~/.cursor/skills/` |
| **Claude Code** | `.claude/skills/` | `~/.claude/skills/` |
| **Antigravity** | `.agent/skills/` | `~/.agent/skills/` |
| **Windsurf** | `.windsurf/skills/` | — |
| **Amp Code** | `.amp/skills/` | — |
| **Codex** | `.codex/skills/` | — |
| **Gemini CLI** | `.gemini/skills/` | — |

## What the Skill Teaches

After installation, your coding agent knows how to:

1. **Run vue-doctor** to scan a project
2. **Interpret the score** (Great / Needs work / Critical)
3. **Auto-fix issues** using the `--fix` structured output
4. **Apply common fixes** for each rule (reactivity, Nuxt, Pinia, etc.)

## Alternative: Bash Script

```bash
curl -fsSL https://raw.githubusercontent.com/healerlab/vue-doctor/main/scripts/install-skill.sh | bash
```

## Using with Your Agent

After installing the skill, try asking your AI agent:

- *"Run vue-doctor on this project"*
- *"Check this Vue component for anti-patterns"*
- *"Fix the reactivity issues vue-doctor found"*
