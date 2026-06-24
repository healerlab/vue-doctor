# AI Agent Skills

Teach your AI coding agents Vue.js best practices with one command.

## Install via skills.sh

Vue Doctor is published to [skills.sh](https://skills.sh), the registry for
reusable agent skills. Install it into your agent from the GitHub repo:

```bash
npx skills add healerlab/vue-doctor
```

The skill lives at [`skills/vue-doctor/SKILL.md`](https://github.com/healerlab/vue-doctor/blob/main/skills/vue-doctor/SKILL.md)
and is discovered automatically by the `skills` CLI.

## Install with the built-in installer

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
3. **Auto-fix issues** by parsing the `--json` output (stable, machine-readable)
4. **Apply common fixes** for each rule (reactivity, security, a11y, Nuxt, Pinia, etc.)

## Alternative: Bash Script

```bash
curl -fsSL https://raw.githubusercontent.com/healerlab/vue-doctor/main/scripts/install-skill.sh | bash
```

## Using with Your Agent

After installing the skill, try asking your AI agent:

- *"Run vue-doctor on this project"*
- *"Check this Vue component for anti-patterns"*
- *"Fix the reactivity issues vue-doctor found"*
