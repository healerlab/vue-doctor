// ============================================================
// ESLint + eslint-plugin-vue runner — template-level linting
// ============================================================

import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { CATEGORIES, ERROR_PREVIEW_LENGTH_CHARS } from "../constants.js";
import type { Diagnostic } from "../types.js";

// ---------------------------------------------------------------------------
// Rule → category mapping for eslint-plugin-vue rules
// ---------------------------------------------------------------------------

const VUE_RULE_CATEGORY_MAP: Record<string, string> = {
    // Reactivity
    "vue/no-mutating-props": CATEGORIES.REACTIVITY,
    "vue/no-ref-as-operand": CATEGORIES.REACTIVITY,
    "vue/no-watch-after-await": CATEGORIES.REACTIVITY,

    // Performance
    "vue/no-use-v-if-with-v-for": CATEGORIES.PERFORMANCE,
    "vue/no-useless-v-bind": CATEGORIES.PERFORMANCE,
    "vue/no-async-in-computed-properties": CATEGORIES.PERFORMANCE,
    "vue/no-computed-properties-in-data": CATEGORIES.PERFORMANCE,
    "vue/require-v-for-key": CATEGORIES.PERFORMANCE,

    // Security
    "vue/no-v-html": CATEGORIES.SECURITY,

    // Correctness
    "vue/return-in-computed-property": CATEGORIES.CORRECTNESS,
    "vue/no-unused-components": CATEGORIES.CORRECTNESS,
    "vue/no-unused-vars": CATEGORIES.CORRECTNESS,
    "vue/valid-v-for": CATEGORIES.CORRECTNESS,
    "vue/valid-v-if": CATEGORIES.CORRECTNESS,
    "vue/valid-v-model": CATEGORIES.CORRECTNESS,
    "vue/valid-v-on": CATEGORIES.CORRECTNESS,
    "vue/valid-v-bind": CATEGORIES.CORRECTNESS,
    "vue/valid-v-slot": CATEGORIES.CORRECTNESS,
    "vue/no-parsing-error": CATEGORIES.CORRECTNESS,
    "vue/no-dupe-keys": CATEGORIES.CORRECTNESS,
    "vue/no-duplicate-attributes": CATEGORIES.CORRECTNESS,
    "vue/require-valid-default-prop": CATEGORIES.CORRECTNESS,

    // Best Practices
    "vue/require-prop-types": CATEGORIES.BEST_PRACTICES,
    "vue/require-default-prop": CATEGORIES.BEST_PRACTICES,
    "vue/component-name-in-template-casing": CATEGORIES.BEST_PRACTICES,
    "vue/multi-word-component-names": CATEGORIES.BEST_PRACTICES,
    "vue/no-reserved-component-names": CATEGORIES.BEST_PRACTICES,

    // Accessibility
    "vue/html-has-lang": CATEGORIES.ACCESSIBILITY,
};

// ---------------------------------------------------------------------------
// ESLint execution via inline config (flat config approach)
// Creates a temporary ESLint flat config and runs it
// ---------------------------------------------------------------------------

const ESLINT_FLAT_CONFIG = `
import vuePlugin from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";

export default [
  {
    files: ["**/*.vue"],
    languageOptions: {
      parser: vueParser,
    },
    plugins: {
      vue: vuePlugin,
    },
    rules: {
      // Essential rules (errors)
      ...vuePlugin.configs["flat/essential"].reduce((acc, cfg) => ({ ...acc, ...(cfg.rules || {}) }), {}),
      // Strongly recommended (warnings)
      ...vuePlugin.configs["flat/strongly-recommended"].reduce((acc, cfg) => ({ ...acc, ...(cfg.rules || {}) }), {}),
      // Recommended (warnings)
      ...vuePlugin.configs["flat/recommended"].reduce((acc, cfg) => ({ ...acc, ...(cfg.rules || {}) }), {}),
    },
  },
];
`;

interface EslintJsonEntry {
    filePath: string;
    messages: Array<{
        ruleId: string | null;
        severity: 1 | 2;
        message: string;
        line: number;
        column: number;
    }>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run ESLint with eslint-plugin-vue to check template-level issues in .vue files.
 * Uses the JSON formatter for machine-readable output.
 */
export const runEslintVue = async (
    rootDirectory: string,
    includePaths?: string[],
): Promise<Diagnostic[]> => {
    // Write a temporary eslint config
    const configPath = path.join(rootDirectory, ".vue-doctor-eslint.config.mjs");
    fs.writeFileSync(configPath, ESLINT_FLAT_CONFIG, "utf-8");

    try {
        const args = [
            "npx", "--yes",
            "eslint",
            "--no-eslintrc",
            "--config", configPath,
            "--format", "json",
            "--no-error-on-unmatched-pattern",
        ];

        if (includePaths && includePaths.length > 0) {
            args.push(...includePaths);
        } else {
            args.push(".");
        }

        const stdout = await spawnEslint(args, rootDirectory);
        return parseEslintOutput(stdout);
    } finally {
        // Clean up temp config
        try {
            fs.unlinkSync(configPath);
        } catch {
            // Ignore cleanup errors
        }
    }
};

const spawnEslint = (
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
            reject(new Error(`Failed to run ESLint: ${error.message}`)),
        );
        child.on("close", () => {
            const output = Buffer.concat(stdoutBuffers).toString("utf-8").trim();
            // ESLint exits with code 1 when it finds issues — that's expected
            resolve(output);
        });
    });

const parseEslintOutput = (stdout: string): Diagnostic[] => {
    if (!stdout) return [];

    let entries: EslintJsonEntry[];
    try {
        entries = JSON.parse(stdout) as EslintJsonEntry[];
    } catch {
        // ESLint might output warnings before JSON — try to extract JSON
        const jsonStart = stdout.indexOf("[");
        if (jsonStart === -1) return [];
        try {
            entries = JSON.parse(stdout.slice(jsonStart)) as EslintJsonEntry[];
        } catch {
            console.error(
                `Failed to parse ESLint output: ${stdout.slice(0, ERROR_PREVIEW_LENGTH_CHARS)}`,
            );
            return [];
        }
    }

    const diagnostics: Diagnostic[] = [];

    for (const entry of entries) {
        for (const msg of entry.messages) {
            if (!msg.ruleId) continue;

            diagnostics.push({
                filePath: entry.filePath,
                plugin: "eslint-plugin-vue",
                rule: msg.ruleId,
                severity: msg.severity === 2 ? "error" : "warning",
                message: msg.message,
                help: VUE_RULE_CATEGORY_MAP[msg.ruleId]
                    ? `See eslint-plugin-vue docs for ${msg.ruleId}`
                    : "",
                line: msg.line,
                column: msg.column,
                category: VUE_RULE_CATEGORY_MAP[msg.ruleId] ?? CATEGORIES.OTHER,
            });
        }
    }

    return diagnostics;
};
