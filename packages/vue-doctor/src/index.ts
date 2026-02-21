// ============================================================
// Public API — diagnose() entry point for programmatic usage
// ============================================================

import path from "node:path";
import { performance } from "node:perf_hooks";
import type { Diagnostic, ProjectInfo, ScoreResult, VueDoctorConfig } from "./types.js";
import { calculateScore } from "./utils/calculate-score.js";
import { combineDiagnostics } from "./utils/combine-diagnostics.js";
import { discoverProject } from "./utils/discover-project.js";
import { loadConfig } from "./utils/load-config.js";
import { runKnip } from "./utils/run-knip.js";
import { runOxlint } from "./utils/run-oxlint.js";
import { runEslintVue } from "./utils/run-eslint-vue.js";
import { runCustomRules } from "./utils/run-custom-rules.js";
import { getDiffInfo, filterSourceFiles } from "./utils/get-diff-files.js";

export type { Diagnostic, ProjectInfo, ScoreResult, VueDoctorConfig };
export { getDiffInfo, filterSourceFiles };

export interface DiagnoseOptions {
    /** Run lint checks (default: true) */
    lint?: boolean;
    /** Run dead code detection (default: true) */
    deadCode?: boolean;
    /** Only scan specific file paths */
    includePaths?: string[];
}

export interface DiagnoseResult {
    /** All diagnostics found */
    diagnostics: Diagnostic[];
    /** Computed health score */
    score: ScoreResult;
    /** Detected project information */
    project: ProjectInfo;
    /** Time taken in milliseconds */
    elapsedMilliseconds: number;
}

/**
 * Diagnose a Vue.js project directory.
 *
 * Runs four analyses in parallel:
 * 1. Oxlint — script-level lint (performance, security, correctness)
 * 2. ESLint + eslint-plugin-vue — template-level lint (directives, reactivity)
 * 3. Knip — dead code detection (unused files, exports, types)
 * 4. Custom rules — Vue-specific anti-patterns (reactivity loss, Nuxt, Pinia)
 *
 * @param directory - Path to the Vue project root
 * @param options - Optional configuration
 * @returns Diagnostics, score, and project info
 *
 * @example
 * ```ts
 * import { diagnose } from "vue-doctor/api";
 *
 * const result = await diagnose("./my-vue-app");
 * console.log(result.score);       // { score: 82, label: "Great" }
 * console.log(result.diagnostics); // Array<Diagnostic>
 * console.log(result.project);     // { framework: "nuxt3", vueVersion: "^3.4.0", ... }
 * ```
 */
export const diagnose = async (
    directory: string,
    options: DiagnoseOptions = {},
): Promise<DiagnoseResult> => {
    const { includePaths = [] } = options;
    const isDiffMode = includePaths.length > 0;

    const startTime = performance.now();
    const resolvedDirectory = path.resolve(directory);
    const projectInfo = discoverProject(resolvedDirectory);
    const userConfig = loadConfig(resolvedDirectory);

    const effectiveLint = options.lint ?? userConfig?.lint ?? true;
    const effectiveDeadCode = options.deadCode ?? userConfig?.deadCode ?? true;

    if (!projectInfo.vueVersion) {
        throw new Error(
            "No Vue dependency found in package.json. " +
            "Make sure you are running vue-doctor from a Vue project root.",
        );
    }

    const emptyDiagnostics: Diagnostic[] = [];

    // Run all analyses in parallel
    const oxlintPromise = effectiveLint
        ? runOxlint(
            resolvedDirectory,
            projectInfo.hasTypeScript,
            projectInfo.framework,
            isDiffMode ? includePaths : undefined,
        ).catch((error: unknown) => {
            console.error("Oxlint failed:", error);
            return emptyDiagnostics;
        })
        : Promise.resolve(emptyDiagnostics);

    const eslintVuePromise = effectiveLint
        ? runEslintVue(
            resolvedDirectory,
            isDiffMode ? includePaths : undefined,
        ).catch((error: unknown) => {
            console.error("ESLint Vue failed:", error);
            return emptyDiagnostics;
        })
        : Promise.resolve(emptyDiagnostics);

    const customRulesPromise = effectiveLint
        ? runCustomRules(
            resolvedDirectory,
            projectInfo,
            isDiffMode ? includePaths : undefined,
        ).catch((error: unknown) => {
            console.error("Custom rules failed:", error);
            return emptyDiagnostics;
        })
        : Promise.resolve(emptyDiagnostics);

    const knipPromise =
        effectiveDeadCode && !isDiffMode
            ? runKnip(resolvedDirectory).catch((error: unknown) => {
                console.error("Dead code analysis failed:", error);
                return emptyDiagnostics;
            })
            : Promise.resolve(emptyDiagnostics);

    const [oxlintDiagnostics, eslintVueDiagnostics, knipDiagnostics, customRulesDiagnostics] =
        await Promise.all([
            oxlintPromise,
            eslintVuePromise,
            knipPromise,
            customRulesPromise,
        ]);

    const diagnostics = combineDiagnostics(
        oxlintDiagnostics,
        eslintVueDiagnostics,
        knipDiagnostics,
        customRulesDiagnostics,
        resolvedDirectory,
        userConfig,
    );

    const elapsedMilliseconds = performance.now() - startTime;
    const score = calculateScore(diagnostics);

    return {
        diagnostics,
        score,
        project: projectInfo,
        elapsedMilliseconds,
    };
};
