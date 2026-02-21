// ============================================================
// Configuration loader — .vue-doctorrc or package.json "vueDoctor" key
// ============================================================

import fs from "node:fs";
import path from "node:path";
import type { VueDoctorConfig } from "../types.js";
import { readPackageJson } from "./discover-project.js";

const CONFIG_FILENAMES = [
    ".vue-doctorrc",
    ".vue-doctorrc.json",
    "vue-doctor.config.json",
];

/**
 * Load user configuration from a config file or package.json.
 * Config file takes precedence over package.json "vueDoctor" key.
 */
export const loadConfig = (rootDirectory: string): VueDoctorConfig | null => {
    // Try dedicated config files first
    for (const filename of CONFIG_FILENAMES) {
        const filePath = path.join(rootDirectory, filename);
        if (fs.existsSync(filePath)) {
            try {
                return JSON.parse(fs.readFileSync(filePath, "utf-8")) as VueDoctorConfig;
            } catch {
                console.error(`Failed to parse config file: ${filePath}`);
                return null;
            }
        }
    }

    // Fall back to package.json "vueDoctor" key
    const pkg = readPackageJson(path.join(rootDirectory, "package.json"));
    if (pkg.vueDoctor && typeof pkg.vueDoctor === "object") {
        return pkg.vueDoctor as VueDoctorConfig;
    }

    return null;
};
