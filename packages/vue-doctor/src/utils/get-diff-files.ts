// ============================================================
// Git diff utilities — scan only changed files vs a base branch
// ============================================================

import { spawnSync } from "node:child_process";
import path from "node:path";
import { SOURCE_FILE_PATTERN, GIT_LS_FILES_MAX_BUFFER_BYTES } from "../constants.js";

export interface DiffInfo {
    /** Base branch or commit used for comparison */
    base: string;
    /** List of changed source file paths (absolute) */
    changedFiles: string[];
    /** Number of changed files found */
    fileCount: number;
}

/**
 * Get list of source files changed compared to a base branch.
 * Defaults to "main" if no base is specified.
 */
export const getDiffInfo = (
    rootDirectory: string,
    base: string = "main",
): DiffInfo => {
    const resolvedDir = path.resolve(rootDirectory);

    // Try git diff with the specified base
    const result = spawnSync(
        "git",
        ["diff", "--name-only", "--diff-filter=ACMR", base],
        {
            cwd: resolvedDir,
            encoding: "utf-8",
            maxBuffer: GIT_LS_FILES_MAX_BUFFER_BYTES,
        },
    );

    if (result.error || result.status !== 0) {
        // Fall back to comparing with HEAD~1 if base branch doesn't exist
        const fallbackResult = spawnSync(
            "git",
            ["diff", "--name-only", "--diff-filter=ACMR", "HEAD~1"],
            {
                cwd: resolvedDir,
                encoding: "utf-8",
                maxBuffer: GIT_LS_FILES_MAX_BUFFER_BYTES,
            },
        );

        if (fallbackResult.error || fallbackResult.status !== 0) {
            return { base, changedFiles: [], fileCount: 0 };
        }

        const files = parseChangedFiles(fallbackResult.stdout, resolvedDir);
        return { base: "HEAD~1", changedFiles: files, fileCount: files.length };
    }

    const changedFiles = parseChangedFiles(result.stdout, resolvedDir);
    return { base, changedFiles, fileCount: changedFiles.length };
};

/**
 * Filter a list of file paths to only include source files.
 */
export const filterSourceFiles = (files: string[]): string[] =>
    files.filter((f) => SOURCE_FILE_PATTERN.test(f));

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const parseChangedFiles = (stdout: string, rootDirectory: string): string[] =>
    stdout
        .split("\n")
        .filter((f) => f.length > 0 && SOURCE_FILE_PATTERN.test(f))
        .map((f) => path.resolve(rootDirectory, f));
