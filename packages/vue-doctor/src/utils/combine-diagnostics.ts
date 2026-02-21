// ============================================================
// Combine diagnostics from all analysis sources and apply filters
// ============================================================

import path from "node:path";
import type { Diagnostic, VueDoctorConfig } from "../types.js";

/**
 * Merge diagnostics from oxlint, eslint-plugin-vue, knip, and custom rules.
 * Apply user config filters (ignored rules and files).
 * Deduplicate diagnostics that overlap between tools.
 */
export const combineDiagnostics = (
    oxlintDiagnostics: Diagnostic[],
    eslintVueDiagnostics: Diagnostic[],
    knipDiagnostics: Diagnostic[],
    customRulesDiagnostics: Diagnostic[],
    rootDirectory: string,
    config: VueDoctorConfig | null,
): Diagnostic[] => {
    let all = [...oxlintDiagnostics, ...eslintVueDiagnostics, ...knipDiagnostics, ...customRulesDiagnostics];

    // Normalize file paths to be relative
    all = all.map((d) => ({
        ...d,
        filePath: path.isAbsolute(d.filePath)
            ? path.relative(rootDirectory, d.filePath)
            : d.filePath,
    }));

    // Apply ignored rules
    const ignoredRules = new Set(config?.ignore?.rules ?? []);
    if (ignoredRules.size > 0) {
        all = all.filter((d) => !ignoredRules.has(d.rule) && !ignoredRules.has(`${d.plugin}/${d.rule}`));
    }

    // Apply ignored file patterns
    const ignoredFilePatterns = config?.ignore?.files ?? [];
    if (ignoredFilePatterns.length > 0) {
        all = all.filter((d) => {
            return !ignoredFilePatterns.some((pattern) => matchGlob(d.filePath, pattern));
        });
    }

    // Deduplicate — same file, same line, same rule
    const seen = new Set<string>();
    all = all.filter((d) => {
        const key = `${d.filePath}:${d.line}:${d.rule}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // Sort by severity (errors first), then by file path
    all.sort((a, b) => {
        if (a.severity !== b.severity) return a.severity === "error" ? -1 : 1;
        return a.filePath.localeCompare(b.filePath);
    });

    return all;
};

/**
 * Simple glob matcher for file path patterns.
 * Supports * and ** wildcards.
 */
const matchGlob = (filePath: string, pattern: string): boolean => {
    const regexStr = pattern
        .replace(/\./g, "\\.")
        .replace(/\*\*/g, "{{DOUBLE_STAR}}")
        .replace(/\*/g, "[^/]*")
        .replace(/\{\{DOUBLE_STAR\}\}/g, ".*");
    const regex = new RegExp(`^${regexStr}$`);
    return regex.test(filePath);
};
