// ============================================================
// Type definitions for vue-doctor
// ============================================================

/** Supported Vue meta-frameworks */
export type Framework =
    | "nuxt3"
    | "nuxt2"
    | "vite"
    | "vue-cli"
    | "unknown";

/** Information about the scanned project */
export interface ProjectInfo {
    /** Detected Vue version string (e.g. "^3.4.0") */
    vueVersion: string | null;
    /** Detected meta-framework */
    framework: Framework;
    /** Framework display name for output */
    frameworkDisplayName: string;
    /** Whether the project uses TypeScript */
    hasTypeScript: boolean;
    /** Whether the project uses Pinia */
    hasPinia: boolean;
    /** Whether the project uses Vuex */
    hasVuex: boolean;
    /** Whether the project uses Vue Router */
    hasVueRouter: boolean;
    /** Number of source files found */
    sourceFileCount: number;
}

/** A single diagnostic issue found in the project */
export interface Diagnostic {
    /** Absolute path to the file */
    filePath: string;
    /** Plugin that reported the issue (e.g. "oxlint", "eslint-plugin-vue", "knip") */
    plugin: string;
    /** Specific rule identifier */
    rule: string;
    /** Severity level */
    severity: "error" | "warning";
    /** Human-readable description of the issue */
    message: string;
    /** Actionable suggestion on how to fix it */
    help: string;
    /** 1-based line number */
    line: number;
    /** 1-based column number */
    column: number;
    /** High-level category (e.g. "reactivity", "performance", "security") */
    category: string;
}

/** Health score result */
export interface ScoreResult {
    /** Numeric score 0-100 */
    score: number;
    /** Human-readable label */
    label: "Great" | "Needs work" | "Critical";
}

/** User configuration loaded from .vue-doctorrc or package.json */
export interface VueDoctorConfig {
    ignore?: {
        rules?: string[];
        files?: string[];
    };
    lint?: boolean;
    deadCode?: boolean;
    verbose?: boolean;
}

/** Raw package.json structure (partial) */
export interface PackageJson {
    name?: string;
    version?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    workspaces?: string[] | { packages?: string[] };
    vueDoctor?: VueDoctorConfig;
    [key: string]: unknown;
}

/** Workspace package entry */
export interface WorkspacePackage {
    name: string;
    directory: string;
}
