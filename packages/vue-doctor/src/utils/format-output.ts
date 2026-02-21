// ============================================================
// Terminal output formatting — pretty-print diagnostics + score
// ============================================================

import pc from "picocolors";
import type { Diagnostic, ProjectInfo, ScoreResult } from "../types.js";
import { SCORE_THRESHOLDS } from "../constants.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const colorForSeverity = (severity: "error" | "warning"): ((s: string) => string) =>
    severity === "error" ? pc.red : pc.yellow;

const colorForScore = (score: number): ((s: string) => string) => {
    if (score >= SCORE_THRESHOLDS.GREAT) return pc.green;
    if (score >= SCORE_THRESHOLDS.NEEDS_WORK) return pc.yellow;
    return pc.red;
};

const severityIcon = (severity: "error" | "warning"): string =>
    severity === "error" ? "✖" : "⚠";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Format project information header for terminal output.
 */
export const formatProjectInfo = (project: ProjectInfo): string => {
    const lines: string[] = [];

    lines.push("");
    lines.push(pc.bold("  Vue Doctor"));
    lines.push("");

    const details: string[] = [];
    if (project.vueVersion) details.push(`Vue ${project.vueVersion}`);
    details.push(project.frameworkDisplayName);
    if (project.hasTypeScript) details.push("TypeScript");
    if (project.hasPinia) details.push("Pinia");
    if (project.hasVuex) details.push("Vuex");
    if (project.hasVueRouter) details.push("Vue Router");

    lines.push(`  ${pc.dim("Project:")} ${details.join(" · ")}`);
    lines.push(`  ${pc.dim("Files:")}   ${project.sourceFileCount} source files`);
    lines.push("");

    return lines.join("\n");
};

/**
 * Format diagnostics summary grouped by category.
 */
export const formatDiagnosticsSummary = (diagnostics: Diagnostic[]): string => {
    if (diagnostics.length === 0) {
        return `  ${pc.green("✓")} No issues found!\n`;
    }

    // Group by category
    const byCategory = new Map<string, Diagnostic[]>();
    for (const d of diagnostics) {
        const existing = byCategory.get(d.category) ?? [];
        existing.push(d);
        byCategory.set(d.category, existing);
    }

    const lines: string[] = [];

    for (const [category, diags] of byCategory) {
        const errors = diags.filter((d) => d.severity === "error").length;
        const warnings = diags.filter((d) => d.severity === "warning").length;

        const counts: string[] = [];
        if (errors > 0) counts.push(pc.red(`${errors} error${errors > 1 ? "s" : ""}`));
        if (warnings > 0) counts.push(pc.yellow(`${warnings} warning${warnings > 1 ? "s" : ""}`));

        lines.push(`  ${pc.bold(category)} ${pc.dim("—")} ${counts.join(", ")}`);
    }

    lines.push("");
    return lines.join("\n");
};

/**
 * Format verbose diagnostic details — shows individual issues with file locations.
 */
export const formatDiagnosticsVerbose = (diagnostics: Diagnostic[]): string => {
    if (diagnostics.length === 0) return "";

    const lines: string[] = [];

    // Group by category
    const byCategory = new Map<string, Diagnostic[]>();
    for (const d of diagnostics) {
        const existing = byCategory.get(d.category) ?? [];
        existing.push(d);
        byCategory.set(d.category, existing);
    }

    for (const [category, diags] of byCategory) {
        lines.push(`  ${pc.bold(pc.underline(category))}`);
        lines.push("");

        for (const d of diags) {
            const color = colorForSeverity(d.severity);
            const icon = severityIcon(d.severity);
            const location = pc.dim(`${d.filePath}:${d.line}:${d.column}`);

            lines.push(`  ${color(icon)} ${color(d.rule)} ${location}`);
            lines.push(`    ${d.message}`);
            if (d.help) {
                lines.push(`    ${pc.dim("→")} ${pc.dim(d.help)}`);
            }
            lines.push("");
        }
    }

    return lines.join("\n");
};

/**
 * Format the final health score.
 */
export const formatScore = (
    score: ScoreResult,
    errorCount: number,
    warningCount: number,
    elapsedMs: number,
): string => {
    const color = colorForScore(score.score);
    const elapsed = (elapsedMs / 1000).toFixed(1);

    const lines: string[] = [];
    lines.push(pc.dim("  ─".repeat(20)));
    lines.push("");
    lines.push(`  ${pc.bold("Health Score:")} ${color(pc.bold(`${score.score}`))} ${color(`(${score.label})`)}`);
    lines.push("");
    lines.push(`  ${pc.red(`${errorCount} error${errorCount !== 1 ? "s" : ""}`)}  ${pc.yellow(`${warningCount} warning${warningCount !== 1 ? "s" : ""}`)}  ${pc.dim(`${elapsed}s`)}`);
    lines.push("");

    return lines.join("\n");
};

/**
 * Format score-only output (for --score flag).
 */
export const formatScoreOnly = (score: ScoreResult): string => {
    return `${score.score}`;
};
