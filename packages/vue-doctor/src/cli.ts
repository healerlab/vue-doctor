// ============================================================
// CLI entry point — vue-doctor command
// ============================================================

import { Command } from "commander";
import ora from "ora";
import pc from "picocolors";
import { diagnose, getDiffInfo } from "./index.js";
import {
    formatProjectInfo,
    formatDiagnosticsSummary,
    formatDiagnosticsVerbose,
    formatScore,
    formatScoreOnly,
    formatJsonOutput,
} from "./utils/format-output.js";
import { discoverProject } from "./utils/discover-project.js";

// Read version from package.json at build time
const VERSION = "0.0.1";

// ---------------------------------------------------------------------------
// Skill markdown installed into coding agents (kept backtick/apostrophe-free
// so the same text is safe to embed in scripts/install-skill.sh too).
// ---------------------------------------------------------------------------
const SKILL_MARKDOWN = `---
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
`;

const program = new Command();

program
    .name("vue-doctor")
    .description("Diagnose and fix issues in your Vue.js app")
    .version(VERSION, "-v, --version")
    .argument("[directory]", "project directory to scan", ".")
    .option("--no-lint", "skip linting")
    .option("--no-dead-code", "skip dead code detection")
    .option("--verbose", "show file details per rule")
    .option("--score", "output only the score")
    .option("--diff [base]", "scan only files changed vs base branch (default: main)")
    .option("--fix", "output diagnostics in a format suitable for AI agents to auto-fix")
    .option("--json", "output the full diagnosis as JSON (for AI agents, coding agents, CI)")
    .option("--min-score <number>", "exit with code 1 if the health score is below this threshold (CI gate)")
    .action(async (directory: string, options: {
        lint: boolean;
        deadCode: boolean;
        verbose: boolean;
        score: boolean;
        diff?: boolean | string;
        fix: boolean;
        json: boolean;
        minScore?: string;
    }) => {
        const minScore = parseMinScore(options.minScore);

        // JSON mode — pure machine-readable output, no spinner / colors
        if (options.json) {
            try {
                const includePaths = resolveDiffPaths(directory, options.diff);
                const result = await diagnose(directory, {
                    lint: options.lint,
                    deadCode: options.deadCode,
                    includePaths,
                });
                console.log(formatJsonOutput({
                    project: result.project,
                    score: result.score,
                    diagnostics: result.diagnostics,
                    elapsedMilliseconds: result.elapsedMilliseconds,
                    diff: includePaths
                        ? { base: typeof options.diff === "string" ? options.diff : "main", fileCount: includePaths.length }
                        : null,
                }));
                exitForScoreGate(result.score.score, minScore);
            } catch (error) {
                console.log(JSON.stringify({
                    schema: "vue-doctor/diagnosis@1",
                    error: error instanceof Error ? error.message : String(error),
                }, null, 2));
                process.exit(1);
            }
            return;
        }

        // Score-only mode — minimal output
        if (options.score) {
            try {
                const includePaths = resolveDiffPaths(directory, options.diff);
                const result = await diagnose(directory, {
                    lint: options.lint,
                    deadCode: options.deadCode,
                    includePaths,
                });
                console.log(formatScoreOnly(result.score));
                exitForScoreGate(result.score.score, minScore);
            } catch (error) {
                console.error(error instanceof Error ? error.message : String(error));
                process.exit(1);
            }
            return;
        }

        // Full interactive mode
        const spinner = ora({
            text: "Scanning project...",
            color: "cyan",
        }).start();

        try {
            // Quick project discovery for early feedback
            const project = discoverProject(directory);

            if (!project.vueVersion) {
                spinner.fail("No Vue dependency found in package.json");
                console.error(
                    pc.dim("\n  Make sure you are running vue-doctor from a Vue project root.\n"),
                );
                process.exit(1);
            }

            // Resolve diff mode
            const includePaths = resolveDiffPaths(directory, options.diff);
            if (includePaths && includePaths.length > 0) {
                spinner.text = `Analyzing ${includePaths.length} changed files...`;
            } else if (includePaths && includePaths.length === 0) {
                spinner.succeed("No changed files found — nothing to scan");
                return;
            } else {
                spinner.text = `Analyzing ${project.frameworkDisplayName} project (${project.sourceFileCount} files)...`;
            }

            const result = await diagnose(directory, {
                lint: options.lint,
                deadCode: options.deadCode,
                includePaths,
            });

            spinner.stop();

            // Output project info
            console.log(formatProjectInfo(result.project));

            // Diff mode header
            if (includePaths && includePaths.length > 0) {
                console.log(pc.dim(`  Mode: diff (${includePaths.length} changed files)\n`));
            }

            // Output diagnostics
            if (options.fix) {
                // Machine-readable output for AI agents
                console.log(formatFixOutput(result.diagnostics));
            } else if (options.verbose) {
                console.log(formatDiagnosticsVerbose(result.diagnostics));
            } else {
                console.log(formatDiagnosticsSummary(result.diagnostics));
            }

            // Output score
            const errorCount = result.diagnostics.filter((d) => d.severity === "error").length;
            const warningCount = result.diagnostics.filter((d) => d.severity === "warning").length;
            console.log(formatScore(result.score, errorCount, warningCount, result.elapsedMilliseconds));

            if (minScore !== undefined && result.score.score < minScore) {
                console.log(pc.red(`  ✖ Health score ${result.score.score} is below the required minimum of ${minScore}.\n`));
            }
            exitForScoreGate(result.score.score, minScore);

        } catch (error) {
            spinner.fail("Analysis failed");
            console.error(
                pc.red(`\n  ${error instanceof Error ? error.message : String(error)}\n`),
            );
            process.exit(1);
        }
    });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse the --min-score flag value into a number, or undefined if not set.
 */
const parseMinScore = (value?: string): number | undefined => {
    if (value === undefined) return undefined;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
        console.error(pc.red(`Invalid --min-score value: "${value}" (expected a number 0–100)`));
        process.exit(1);
    }
    return parsed;
};

/**
 * Exit with code 1 when a CI score gate is set and the score falls below it.
 * No-op when no gate is configured.
 */
const exitForScoreGate = (score: number, minScore?: number): void => {
    if (minScore !== undefined && score < minScore) {
        process.exit(1);
    }
};

/**
 * Resolve --diff flag into file paths for diff-only scanning.
 * Returns undefined if diff mode is not active.
 */
const resolveDiffPaths = (
    directory: string,
    diff?: boolean | string,
): string[] | undefined => {
    if (diff === undefined || diff === false) return undefined;

    const base = typeof diff === "string" ? diff : "main";
    const diffInfo = getDiffInfo(directory, base);
    return diffInfo.changedFiles;
};

/**
 * Format diagnostics for AI agent consumption (--fix mode).
 * Outputs each diagnostic as a structured, parseable block.
 */
const formatFixOutput = (diagnostics: import("./types.js").Diagnostic[]): string => {
    if (diagnostics.length === 0) {
        return "  No issues found — nothing to fix.\n";
    }

    const lines: string[] = [];
    lines.push(pc.bold("  Diagnostics for auto-fix:\n"));

    for (const d of diagnostics) {
        lines.push(`  ${pc.dim("───")}`);
        lines.push(`  ${pc.bold("File:")}     ${d.filePath}:${d.line}:${d.column}`);
        lines.push(`  ${pc.bold("Rule:")}     ${d.rule}`);
        lines.push(`  ${pc.bold("Severity:")} ${d.severity === "error" ? pc.red(d.severity) : pc.yellow(d.severity)}`);
        lines.push(`  ${pc.bold("Issue:")}    ${d.message}`);
        if (d.help) {
            lines.push(`  ${pc.bold("Fix:")}      ${d.help}`);
        }
        lines.push("");
    }

    return lines.join("\n");
};

// ---------------------------------------------------------------------------
// install-skill subcommand
// ---------------------------------------------------------------------------

program
    .command("install-skill")
    .description("Install vue-doctor skill for your AI coding agents")
    .action(async () => {
        await installSkill();
    });

program.parse();

// ---------------------------------------------------------------------------
// Skill installer
// ---------------------------------------------------------------------------

async function installSkill(): Promise<void> {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const os = await import("node:os");

    const SKILL_DIR = "vue-doctor";
    const SKILL_CONTENT = SKILL_MARKDOWN;

    // Agent directories: [configDirName, displayName, isGlobal]
    interface AgentDir {
        dir: string;
        name: string;
    }

    const cwd = process.cwd();
    const home = os.homedir();

    const agents: AgentDir[] = [
        // Project-level
        { dir: path.join(cwd, ".cursor", "skills"), name: "Cursor (project)" },
        { dir: path.join(cwd, ".claude", "skills"), name: "Claude Code (project)" },
        { dir: path.join(cwd, ".agent", "skills"), name: "Antigravity (project)" },
        { dir: path.join(cwd, ".windsurf", "skills"), name: "Windsurf (project)" },
        { dir: path.join(cwd, ".amp", "skills"), name: "Amp Code (project)" },
        { dir: path.join(cwd, ".codex", "skills"), name: "Codex (project)" },
        { dir: path.join(cwd, ".gemini", "skills"), name: "Gemini CLI (project)" },
        // Global
        { dir: path.join(home, ".cursor", "skills"), name: "Cursor (global)" },
        { dir: path.join(home, ".claude", "skills"), name: "Claude Code (global)" },
        { dir: path.join(home, ".agent", "skills"), name: "Antigravity (global)" },
    ];

    console.log("");
    console.log(pc.bold("  🩺 Vue Doctor — Skill Installer"));
    console.log(pc.dim("  Teach your coding agent Vue.js best practices"));
    console.log("");

    const installed: string[] = [];

    for (const agent of agents) {
        // Check if the parent agent dir exists (e.g., .cursor/)
        const parentDir = path.dirname(agent.dir);
        if (!fs.existsSync(parentDir)) continue;

        const skillPath = path.join(agent.dir, SKILL_DIR, "SKILL.md");
        fs.mkdirSync(path.dirname(skillPath), { recursive: true });
        fs.writeFileSync(skillPath, SKILL_CONTENT, "utf-8");
        installed.push(agent.name);
    }

    if (installed.length === 0) {
        console.log(pc.yellow("  ⚠ No coding agents detected."));
        console.log("");
        console.log("  Installing to common directories...");
        console.log("");

        // Install to the 3 most common project-level dirs
        const fallbacks = [
            path.join(cwd, ".cursor", "skills"),
            path.join(cwd, ".claude", "skills"),
            path.join(cwd, ".agent", "skills"),
        ];

        for (const dir of fallbacks) {
            const skillPath = path.join(dir, SKILL_DIR, "SKILL.md");
            fs.mkdirSync(path.dirname(skillPath), { recursive: true });
            fs.writeFileSync(skillPath, SKILL_CONTENT, "utf-8");
            installed.push(path.basename(path.dirname(dir)));
        }

        console.log(`  ${pc.green("✓")} Installed to .cursor/skills/, .claude/skills/, .agent/skills/`);
    } else {
        for (const name of installed) {
            console.log(`  ${pc.green("✓")} ${name}`);
        }
    }

    console.log("");
    console.log(pc.dim("  ─".repeat(20)));
    console.log("");
    console.log(`  ${pc.green("Done!")} Your coding agent now knows ${pc.bold("Vue Doctor")} best practices.`);
    console.log(pc.dim("  Ask your agent: \"Run vue-doctor on this project\""));
    console.log("");
}
