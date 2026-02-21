// ============================================================
// Score calculator — severity-weighted health score (0-100)
// ============================================================

import { SCORE_THRESHOLDS, SEVERITY_WEIGHTS } from "../constants.js";
import type { Diagnostic, ScoreResult } from "../types.js";

/**
 * Calculate a health score from 0-100 based on diagnostics.
 * Errors deduct 2 points each, warnings deduct 0.5 points each.
 * Score >= 75 is "Great", >= 50 is "Needs work", < 50 is "Critical".
 */
export const calculateScore = (diagnostics: Diagnostic[]): ScoreResult => {
    const errorCount = diagnostics.filter((d) => d.severity === "error").length;
    const warningCount = diagnostics.filter((d) => d.severity === "warning").length;

    const deduction =
        errorCount * SEVERITY_WEIGHTS.error +
        warningCount * SEVERITY_WEIGHTS.warning;

    const score = Math.max(0, Math.round(100 - deduction));

    let label: ScoreResult["label"];
    if (score >= SCORE_THRESHOLDS.GREAT) {
        label = "Great";
    } else if (score >= SCORE_THRESHOLDS.NEEDS_WORK) {
        label = "Needs work";
    } else {
        label = "Critical";
    }

    return { score, label };
};
