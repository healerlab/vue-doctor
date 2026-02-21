// ============================================================
// Custom Vue-specific rules — AST-based analysis using @vue/compiler-sfc
// Catches Vue anti-patterns that oxlint and eslint-plugin-vue don't cover
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { CATEGORIES, GIT_LS_FILES_MAX_BUFFER_BYTES, SOURCE_FILE_PATTERN, VUE_FILE_PATTERN } from "../constants.js";
import type { Diagnostic, Framework, ProjectInfo } from "../types.js";

// ---------------------------------------------------------------------------
// Rule definitions
// ---------------------------------------------------------------------------

interface RuleDefinition {
    id: string;
    severity: "error" | "warning";
    category: string;
    /** Regex pattern to match in the <script> block */
    scriptPattern?: RegExp;
    /** Regex pattern to match in the <template> block */
    templatePattern?: RegExp;
    /** Function to test full file content */
    test?: (content: string, scriptContent: string, templateContent: string) => RuleMatch[];
    message: string;
    help: string;
    /** Only apply to specific frameworks */
    frameworks?: Framework[];
}

interface RuleMatch {
    line: number;
    column: number;
    message?: string;
}

// ---------------------------------------------------------------------------
// Pattern-based helpers
// ---------------------------------------------------------------------------

const findPatternMatches = (content: string, pattern: RegExp, offset: number): RuleMatch[] => {
    const matches: RuleMatch[] = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
            matches.push({ line: i + 1 + offset, column: 1 });
        }
    }
    return matches;
};

// ---------------------------------------------------------------------------
// SFC block extraction (lightweight, no external parser needed)
// ---------------------------------------------------------------------------

const extractScriptBlock = (content: string): { code: string; startLine: number } => {
    const match = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    if (!match) return { code: "", startLine: 0 };

    // Count lines before the script block to get offset
    const beforeScript = content.slice(0, match.index ?? 0);
    const startLine = beforeScript.split("\n").length;
    return { code: match[1], startLine };
};

const extractTemplateBlock = (content: string): { code: string; startLine: number } => {
    const match = content.match(/<template[^>]*>([\s\S]*?)<\/template>/);
    if (!match) return { code: "", startLine: 0 };

    const beforeTemplate = content.slice(0, match.index ?? 0);
    const startLine = beforeTemplate.split("\n").length;
    return { code: match[1], startLine };
};

// ---------------------------------------------------------------------------
// Vue-specific rules
// ---------------------------------------------------------------------------

const RULES: RuleDefinition[] = [
    // ---- Reactivity ----
    {
        id: "vue-doctor/reactivity-destructure-props",
        severity: "error",
        category: CATEGORIES.REACTIVITY,
        // Match: const { foo } = defineProps  OR  const { foo } = props
        scriptPattern: /(?:const|let|var)\s*\{[^}]+\}\s*=\s*(?:defineProps|props)\b/,
        message: "Destructuring props loses reactivity in Vue 3",
        help: "Use `toRefs(props)` or access `props.xxx` directly instead of destructuring",
    },
    {
        id: "vue-doctor/reactivity-reactive-reassign",
        severity: "error",
        category: CATEGORIES.REACTIVITY,
        // Match: state = reactive({  followed later by  state = {  or  state = reactive(
        test: (content, script) => {
            const matches: RuleMatch[] = [];
            const lines = script.split("\n");

            // Find variables assigned with reactive()
            const reactiveVars = new Set<string>();
            for (const line of lines) {
                const m = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*reactive\(/);
                if (m) reactiveVars.add(m[1]);
            }

            // Find reassignments to those variables
            for (let i = 0; i < lines.length; i++) {
                for (const varName of reactiveVars) {
                    const reassignPattern = new RegExp(`^\\s*${varName}\\s*=\\s*(?!.*\\.)`);
                    // Skip the initial declaration
                    if (reassignPattern.test(lines[i]) && !lines[i].includes("reactive(") && !lines[i].includes("const ") && !lines[i].includes("let ") && !lines[i].includes("var ")) {
                        matches.push({ line: i + 1, column: 1 });
                    }
                }
            }
            return matches;
        },
        message: "Reassigning a reactive() variable replaces the proxy and breaks reactivity",
        help: "Use Object.assign(state, newData) or replace individual properties instead",
    },
    {
        id: "vue-doctor/reactivity-ref-no-value",
        severity: "warning",
        category: CATEGORIES.REACTIVITY,
        test: (_content, script) => {
            const matches: RuleMatch[] = [];
            const lines = script.split("\n");

            // Find ref() variables
            const refVars = new Set<string>();
            for (const line of lines) {
                const m = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*ref\s*[<(]/);
                if (m) refVars.add(m[1]);
            }

            // Check for usage without .value in script (not in template)
            for (let i = 0; i < lines.length; i++) {
                for (const varName of refVars) {
                    const line = lines[i];
                    // Skip the declaration line and comment lines
                    if (line.includes(`= ref`) || line.trim().startsWith("//") || line.trim().startsWith("*")) continue;

                    // Match usage like: `if (count ===` or `count =` but NOT `count.value`
                    const usagePattern = new RegExp(`\\b${varName}\\b(?!\\.value)(?!\\s*=\\s*ref)(?!\\w)`);
                    const valuePattern = new RegExp(`\\b${varName}\\.value\\b`);

                    if (usagePattern.test(line) && !valuePattern.test(line) && !line.includes("watch(") && !line.includes("computed(") && !line.includes("return")) {
                        // Check that it's actually used in an expression context
                        const assignOrCompare = new RegExp(`\\b${varName}\\b\\s*(?:[=!<>]=|[+\\-*/]=|\\+\\+|--)`);
                        if (assignOrCompare.test(line)) {
                            matches.push({
                                line: i + 1,
                                column: 1,
                                message: `Ref "${varName}" used without .value in script — this compares/assigns the Ref object, not its value`,
                            });
                        }
                    }
                }
            }
            return matches;
        },
        message: "Ref used without .value in script block",
        help: "Access ref values with .value in <script> (auto-unwrapping only works in <template>)",
    },

    // ---- Performance ----
    {
        id: "vue-doctor/perf-giant-component",
        severity: "warning",
        category: CATEGORIES.PERFORMANCE,
        test: (content) => {
            const lineCount = content.split("\n").length;
            if (lineCount > 300) {
                return [{ line: 1, column: 1, message: `Component has ${lineCount} lines — consider splitting into smaller components` }];
            }
            return [];
        },
        message: "Giant component with too many lines",
        help: "Split components larger than 300 lines into smaller, focused sub-components",
    },
    {
        id: "vue-doctor/perf-v-for-method-call",
        severity: "warning",
        category: CATEGORIES.PERFORMANCE,
        // Match: v-for="item in someMethod()" — method called inside v-for
        templatePattern: /v-for\s*=\s*"[^"]*\w+\([^)]*\)/,
        message: "Method call inside v-for — this runs on every re-render",
        help: "Use a computed property instead of calling a method inside v-for",
    },

    // ---- Nuxt-specific ----
    {
        id: "vue-doctor/nuxt-fetch-in-mounted",
        severity: "error",
        category: CATEGORIES.NUXT,
        frameworks: ["nuxt3"],
        scriptPattern: /onMounted\s*\(\s*(?:async\s*)?\(\)\s*=>\s*\{[\s\S]*?(?:useFetch|useAsyncData|\$fetch)\b/,
        message: "Data fetching composable used inside onMounted()",
        help: "Move useFetch/useAsyncData to the top level of <script setup> — they are designed to run during SSR",
    },
    {
        id: "vue-doctor/nuxt-no-navigate-to-in-setup",
        severity: "warning",
        category: CATEGORIES.NUXT,
        frameworks: ["nuxt3"],
        test: (_content, script) => {
            const matches: RuleMatch[] = [];
            const lines = script.split("\n");

            // Check for navigateTo() at the top level of setup (not inside a function)
            let braceDepth = 0;
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                braceDepth += (line.match(/\{/g) || []).length;
                braceDepth -= (line.match(/\}/g) || []).length;

                if (braceDepth <= 1 && /navigateTo\s*\(/.test(line) && !/return\s+navigateTo/.test(line)) {
                    matches.push({ line: i + 1, column: 1 });
                }
            }
            return matches;
        },
        message: "navigateTo() called at setup level without return",
        help: "Use `return navigateTo('/path')` — without return, the navigation may not work correctly",
    },

    // ---- Pinia ----
    {
        id: "vue-doctor/pinia-no-store-to-refs",
        severity: "warning",
        category: CATEGORIES.REACTIVITY,
        // Match destructuring from a store without storeToRefs
        // e.g.: const { count, name } = useCounterStore()
        scriptPattern: /(?:const|let|var)\s*\{[^}]+\}\s*=\s*use\w+Store\s*\(\)/,
        message: "Destructuring store without storeToRefs() loses reactivity",
        help: "Use `const { count } = storeToRefs(useCounterStore())` for reactive destructuring, or destructure only actions",
    },
    {
        id: "vue-doctor/pinia-direct-state-mutation",
        severity: "warning",
        category: CATEGORIES.BEST_PRACTICES,
        test: (_content, script) => {
            const matches: RuleMatch[] = [];
            const lines = script.split("\n");

            // Find store variable assignments (e.g., const store = useXxxStore())
            const storeVars = new Set<string>();
            for (const line of lines) {
                const m = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*use\w+Store\s*\(\)/);
                if (m) storeVars.add(m[1]);
            }

            // Find direct state mutations: store.someState = value
            for (let i = 0; i < lines.length; i++) {
                for (const varName of storeVars) {
                    const mutationPattern = new RegExp(`\\b${varName}\\.(?!\\$patch|\\$reset|\\$subscribe|\\$state)\\w+\\s*=`);
                    if (mutationPattern.test(lines[i])) {
                        matches.push({ line: i + 1, column: 1 });
                    }
                }
            }
            return matches;
        },
        message: "Direct mutation of store state outside store actions",
        help: "Use store actions or $patch() for state mutations to maintain traceability",
    },

    // ---- Architecture ----
    {
        id: "vue-doctor/arch-mixed-api-styles",
        severity: "warning",
        category: CATEGORIES.ARCHITECTURE,
        test: (content) => {
            const hasSetupScript = /<script[^>]*\bsetup\b/.test(content);
            const hasOptionsAPI = /(?:export\s+default\s*\{[\s\S]*?(?:data\s*\(\s*\)|methods\s*:|computed\s*:|watch\s*:|mounted\s*\(\s*\)|created\s*\(\s*\)))/.test(content);
            const hasCompositionAPI = /\b(?:ref|reactive|computed|watch|onMounted|defineProps|defineEmits)\s*\(/.test(content);

            if (!hasSetupScript && hasOptionsAPI && hasCompositionAPI) {
                return [{ line: 1, column: 1, message: "Component mixes Options API and Composition API — pick one style for consistency" }];
            }
            return [];
        },
        message: "Mixed Options API and Composition API in the same component",
        help: "Migrate to Composition API with <script setup> for consistency and better TypeScript support",
    },
];

// ---------------------------------------------------------------------------
// File scanning
// ---------------------------------------------------------------------------

const getSourceFiles = (rootDirectory: string, includePaths?: string[]): string[] => {
    if (includePaths && includePaths.length > 0) {
        return includePaths.filter((f) => VUE_FILE_PATTERN.test(f));
    }

    const result = spawnSync(
        "git",
        ["ls-files", "--cached", "--others", "--exclude-standard"],
        { cwd: rootDirectory, encoding: "utf-8", maxBuffer: GIT_LS_FILES_MAX_BUFFER_BYTES },
    );

    if (result.error || result.status !== 0) return [];

    return result.stdout
        .split("\n")
        .filter((f) => f.length > 0 && VUE_FILE_PATTERN.test(f))
        .map((f) => path.join(rootDirectory, f));
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run custom vue-doctor rules on .vue files.
 * These are pattern-based and lightweight — no heavy AST required.
 */
export const runCustomRules = async (
    rootDirectory: string,
    projectInfo: ProjectInfo,
    includePaths?: string[],
): Promise<Diagnostic[]> => {
    const files = getSourceFiles(rootDirectory, includePaths);
    const diagnostics: Diagnostic[] = [];

    // Filter rules by framework
    const applicableRules = RULES.filter((rule) => {
        if (!rule.frameworks) return true;
        return rule.frameworks.includes(projectInfo.framework);
    });

    for (const filePath of files) {
        let content: string;
        try {
            content = fs.readFileSync(filePath, "utf-8");
        } catch {
            continue;
        }

        const script = extractScriptBlock(content);
        const template = extractTemplateBlock(content);
        const relativePath = path.relative(rootDirectory, filePath);

        for (const rule of applicableRules) {
            let matches: RuleMatch[] = [];

            // Test with custom function
            if (rule.test) {
                matches = rule.test(content, script.code, template.code);
                // Adjust line numbers for script/template offsets
                matches = matches.map((m) => ({
                    ...m,
                    line: m.line + (rule.category === CATEGORIES.NUXT || rule.category === CATEGORIES.REACTIVITY || rule.category === CATEGORIES.BEST_PRACTICES
                        ? script.startLine : 0),
                }));
            }

            // Test with script pattern
            if (rule.scriptPattern && script.code) {
                const patternMatches = findPatternMatches(script.code, rule.scriptPattern, script.startLine);
                matches.push(...patternMatches);
            }

            // Test with template pattern
            if (rule.templatePattern && template.code) {
                const patternMatches = findPatternMatches(template.code, rule.templatePattern, template.startLine);
                matches.push(...patternMatches);
            }

            for (const match of matches) {
                diagnostics.push({
                    filePath: relativePath,
                    plugin: "vue-doctor",
                    rule: rule.id,
                    severity: rule.severity,
                    message: match.message ?? rule.message,
                    help: rule.help,
                    line: match.line,
                    column: match.column,
                    category: rule.category,
                });
            }
        }
    }

    return diagnostics;
};
