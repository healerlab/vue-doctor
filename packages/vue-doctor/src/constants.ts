// ============================================================
// Shared constants for vue-doctor
// ============================================================

/** Regex for source files we care about */
export const SOURCE_FILE_PATTERN = /\.(vue|js|ts|jsx|tsx|mjs|cjs)$/;

/** Regex for Vue SFC files */
export const VUE_FILE_PATTERN = /\.vue$/;

/** Maximum buffer size for git ls-files (10 MB) */
export const GIT_LS_FILES_MAX_BUFFER_BYTES = 10 * 1024 * 1024;

/** Maximum argument length for child_process.spawn */
export const SPAWN_ARGS_MAX_LENGTH_CHARS = 100_000;

/** Truncation length for error preview messages */
export const ERROR_PREVIEW_LENGTH_CHARS = 500;

/** Score thresholds */
export const SCORE_THRESHOLDS = {
    GREAT: 75,
    NEEDS_WORK: 50,
} as const;

/** Weight multipliers for scoring */
export const SEVERITY_WEIGHTS = {
    error: 2,
    warning: 0.5,
} as const;

/** Category labels used for grouping diagnostics */
export const CATEGORIES = {
    REACTIVITY: "Reactivity",
    PERFORMANCE: "Performance",
    SECURITY: "Security",
    CORRECTNESS: "Correctness",
    ARCHITECTURE: "Architecture",
    ACCESSIBILITY: "Accessibility",
    DEAD_CODE: "Dead Code",
    BEST_PRACTICES: "Best Practices",
    NUXT: "Nuxt",
    OTHER: "Other",
} as const;
