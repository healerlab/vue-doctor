// ============================================================
// Knip runner — dead code detection
// ============================================================

import { spawn } from "node:child_process";
import { CATEGORIES, ERROR_PREVIEW_LENGTH_CHARS } from "../constants.js";
import type { Diagnostic } from "../types.js";

// ---------------------------------------------------------------------------
// Knip output parsing
// ---------------------------------------------------------------------------

interface KnipIssue {
    type: string;
    filePath: string;
    symbol?: string;
    line?: number;
    col?: number;
}

// Knip JSON reporter output format
interface KnipOutput {
    files?: string[];
    issues?: KnipIssue[];
    [key: string]: unknown;
}

const KNIP_TYPE_TO_RULE: Record<string, string> = {
    file: "knip/unused-file",
    export: "knip/unused-export",
    type: "knip/unused-type",
    duplicate: "knip/duplicate",
    dependency: "knip/unused-dependency",
    devDependency: "knip/unused-devDependency",
    enum: "knip/unused-enum",
};

const KNIP_TYPE_TO_MESSAGE: Record<string, string> = {
    file: "Unused file — not imported anywhere",
    export: "Unused export — not consumed by any other module",
    type: "Unused type export",
    duplicate: "Duplicate export detected",
    dependency: "Unused dependency in package.json",
    devDependency: "Unused devDependency in package.json",
    enum: "Unused enum member",
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run Knip for dead code detection. Returns diagnostics for unused files,
 * exports, types, dependencies, and duplicates.
 */
export const runKnip = async (
    rootDirectory: string,
): Promise<Diagnostic[]> => {
    const args = [
        "npx", "--yes",
        "knip",
        "--reporter", "json",
        "--no-progress",
        "--no-exit-code",
    ];

    const stdout = await spawnKnip(args, rootDirectory);
    return parseKnipOutput(stdout, rootDirectory);
};

const spawnKnip = (
    args: string[],
    cwd: string,
): Promise<string> =>
    new Promise((resolve, reject) => {
        const child = spawn(args[0], args.slice(1), { cwd, shell: true });

        const stdoutBuffers: Buffer[] = [];
        const stderrBuffers: Buffer[] = [];

        child.stdout.on("data", (buf: Buffer) => stdoutBuffers.push(buf));
        child.stderr.on("data", (buf: Buffer) => stderrBuffers.push(buf));

        child.on("error", (error) =>
            reject(new Error(`Failed to run knip: ${error.message}`)),
        );
        child.on("close", () => {
            const output = Buffer.concat(stdoutBuffers).toString("utf-8").trim();
            resolve(output);
        });
    });

const parseKnipOutput = (stdout: string, rootDirectory: string): Diagnostic[] => {
    if (!stdout) return [];

    let output: KnipOutput;
    try {
        output = JSON.parse(stdout) as KnipOutput;
    } catch {
        console.error(
            `Failed to parse knip output: ${stdout.slice(0, ERROR_PREVIEW_LENGTH_CHARS)}`,
        );
        return [];
    }

    const diagnostics: Diagnostic[] = [];

    // Handle unused files
    if (output.files && Array.isArray(output.files)) {
        for (const filePath of output.files) {
            diagnostics.push({
                filePath,
                plugin: "knip",
                rule: "knip/unused-file",
                severity: "warning",
                message: "Unused file — not imported anywhere",
                help: "Remove this file or import it where needed",
                line: 1,
                column: 1,
                category: CATEGORIES.DEAD_CODE,
            });
        }
    }

    // Handle other issues
    if (output.issues && Array.isArray(output.issues)) {
        for (const issue of output.issues) {
            const rule = KNIP_TYPE_TO_RULE[issue.type] ?? "knip/unknown";
            const message = KNIP_TYPE_TO_MESSAGE[issue.type] ?? `Dead code: ${issue.type}`;
            const symbolInfo = issue.symbol ? ` (${issue.symbol})` : "";

            diagnostics.push({
                filePath: issue.filePath,
                plugin: "knip",
                rule,
                severity: "warning",
                message: `${message}${symbolInfo}`,
                help: "Remove the unused code or mark it as used",
                line: issue.line ?? 1,
                column: issue.col ?? 1,
                category: CATEGORIES.DEAD_CODE,
            });
        }
    }

    return diagnostics;
};
