// ============================================================
// Oxlint runner — script-level linting via the oxlint binary
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { CATEGORIES, SPAWN_ARGS_MAX_LENGTH_CHARS, ERROR_PREVIEW_LENGTH_CHARS } from "../constants.js";
import type { Diagnostic, Framework } from "../types.js";

const esmRequire = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// Rule → category mapping
// ---------------------------------------------------------------------------

const PLUGIN_CATEGORY_MAP: Record<string, string> = {
    "typescript": CATEGORIES.CORRECTNESS,
    "unicorn": CATEGORIES.BEST_PRACTICES,
    "import": CATEGORIES.ARCHITECTURE,
    "eslint": CATEGORIES.CORRECTNESS,
    "oxc": CATEGORIES.CORRECTNESS,
};

const RULE_CATEGORY_MAP: Record<string, string> = {
    "eslint/no-eval": CATEGORIES.SECURITY,
    "eslint/no-implied-eval": CATEGORIES.SECURITY,
    "unicorn/no-await-expression-member": CATEGORIES.PERFORMANCE,
};

// ---------------------------------------------------------------------------
// Rule → help text mapping
// ---------------------------------------------------------------------------

const RULE_HELP_MAP: Record<string, string> = {
    "no-eval": "Replace eval() with a safer alternative — eval opens the door to code injection attacks",
    "no-implied-eval": "Avoid passing strings to setTimeout/setInterval — use function references instead",
    "no-var": "Use 'let' or 'const' instead of 'var' for block-scoped declarations",
    "prefer-const": "Use 'const' for variables that are never reassigned",
    "no-unused-vars": "Remove or use the declared variable",
    "no-undef": "The variable is not defined — check for typos or missing imports",
};

// ---------------------------------------------------------------------------
// Oxlint output parsing
// ---------------------------------------------------------------------------

interface OxlintLabel {
    span: { line: number; column: number };
}

interface OxlintDiagnostic {
    message: string;
    code: string;
    severity: "error" | "warning";
    filename: string;
    help: string;
    labels: OxlintLabel[];
}

interface OxlintOutput {
    diagnostics: OxlintDiagnostic[];
}

const parseRuleCode = (code: string): { plugin: string; rule: string } => {
    const match = code.match(/^(.+)\((.+)\)$/);
    if (!match) return { plugin: "unknown", rule: code };
    return { plugin: match[1].replace(/^eslint-plugin-/, ""), rule: match[2] };
};

const resolveOxlintBinary = (): string => {
    const oxlintMainPath = esmRequire.resolve("oxlint");
    const oxlintPackageDirectory = path.resolve(path.dirname(oxlintMainPath), "..");
    return path.join(oxlintPackageDirectory, "bin", "oxlint");
};

const resolveDiagnosticCategory = (plugin: string, rule: string): string => {
    const ruleKey = `${plugin}/${rule}`;
    return RULE_CATEGORY_MAP[ruleKey] ?? PLUGIN_CATEGORY_MAP[plugin] ?? CATEGORIES.OTHER;
};

// ---------------------------------------------------------------------------
// Spawning oxlint
// ---------------------------------------------------------------------------

const spawnOxlint = (
    args: string[],
    rootDirectory: string,
    nodeBinaryPath: string,
): Promise<string> =>
    new Promise((resolve, reject) => {
        const child = spawn(nodeBinaryPath, args, { cwd: rootDirectory });

        const stdoutBuffers: Buffer[] = [];
        const stderrBuffers: Buffer[] = [];

        child.stdout.on("data", (buffer: Buffer) => stdoutBuffers.push(buffer));
        child.stderr.on("data", (buffer: Buffer) => stderrBuffers.push(buffer));

        child.on("error", (error) =>
            reject(new Error(`Failed to run oxlint: ${error.message}`)),
        );
        child.on("close", () => {
            const output = Buffer.concat(stdoutBuffers).toString("utf-8").trim();
            if (!output) {
                const stderrOutput = Buffer.concat(stderrBuffers).toString("utf-8").trim();
                if (stderrOutput) {
                    reject(new Error(`Failed to run oxlint: ${stderrOutput}`));
                    return;
                }
            }
            resolve(output);
        });
    });

const parseOxlintOutput = (stdout: string): Diagnostic[] => {
    if (!stdout) return [];

    let output: OxlintOutput;
    try {
        output = JSON.parse(stdout) as OxlintOutput;
    } catch {
        throw new Error(
            `Failed to parse oxlint output: ${stdout.slice(0, ERROR_PREVIEW_LENGTH_CHARS)}`,
        );
    }

    return output.diagnostics
        .filter((d) => d.code)
        .map((d) => {
            const { plugin, rule } = parseRuleCode(d.code);
            const primaryLabel = d.labels[0];

            return {
                filePath: d.filename,
                plugin: `oxlint/${plugin}`,
                rule,
                severity: d.severity,
                message: d.message,
                help: d.help || RULE_HELP_MAP[rule] || "",
                line: primaryLabel?.span.line ?? 0,
                column: primaryLabel?.span.column ?? 0,
                category: resolveDiagnosticCategory(plugin, rule),
            };
        });
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run oxlint on the project directory and return diagnostics.
 * Oxlint handles .vue files (script blocks) natively since v1.0.
 */
export const runOxlint = async (
    rootDirectory: string,
    hasTypeScript: boolean,
    framework: Framework,
    includePaths?: string[],
    nodeBinaryPath: string = process.execPath,
): Promise<Diagnostic[]> => {
    if (includePaths !== undefined && includePaths.length === 0) {
        return [];
    }

    const oxlintBinary = resolveOxlintBinary();

    const args = [
        oxlintBinary,
        "--format", "json",
        // Enable relevant plugin categories
        "-D", "correctness",
        "-D", "perf",
        "-D", "suspicious",
        "-W", "pedantic",
    ];

    if (hasTypeScript) {
        args.push("-D", "typescript");
    }

    // Add include paths or scan the whole directory
    if (includePaths && includePaths.length > 0) {
        args.push(...includePaths);
    } else {
        args.push(".");
    }

    const stdout = await spawnOxlint(args, rootDirectory, nodeBinaryPath);
    return parseOxlintOutput(stdout);
};
