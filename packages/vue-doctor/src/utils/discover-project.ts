// ============================================================
// Project discovery — detect Vue version, framework, and features
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { GIT_LS_FILES_MAX_BUFFER_BYTES, SOURCE_FILE_PATTERN } from "../constants.js";
import type { Framework, PackageJson, ProjectInfo } from "../types.js";

// ---------------------------------------------------------------------------
// Config file patterns
// ---------------------------------------------------------------------------

const NUXT_CONFIG_FILENAMES = [
    "nuxt.config.ts",
    "nuxt.config.js",
    "nuxt.config.mjs",
    "nuxt.config.cjs",
];

const VITE_CONFIG_FILENAMES = [
    "vite.config.ts",
    "vite.config.js",
    "vite.config.mjs",
    "vite.config.cjs",
];

const VUE_CLI_CONFIG_FILENAMES = [
    "vue.config.js",
    "vue.config.ts",
    "vue.config.cjs",
];

const FRAMEWORK_DISPLAY_NAMES: Record<Framework, string> = {
    nuxt3: "Nuxt 3",
    nuxt2: "Nuxt 2",
    vite: "Vite",
    "vue-cli": "Vue CLI",
    unknown: "Vue",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const readPackageJson = (filePath: string): PackageJson => {
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf-8")) as PackageJson;
    } catch {
        return {};
    }
};

const collectAllDependencies = (pkg: PackageJson): Record<string, string> => ({
    ...pkg.peerDependencies,
    ...pkg.dependencies,
    ...pkg.devDependencies,
});

const hasConfigFile = (dir: string, filenames: string[]): boolean =>
    filenames.some((f) => fs.existsSync(path.join(dir, f)));

const countSourceFiles = (rootDirectory: string): number => {
    const result = spawnSync(
        "git",
        ["ls-files", "--cached", "--others", "--exclude-standard"],
        { cwd: rootDirectory, encoding: "utf-8", maxBuffer: GIT_LS_FILES_MAX_BUFFER_BYTES },
    );

    if (result.error || result.status !== 0) return 0;

    return result.stdout
        .split("\n")
        .filter((f) => f.length > 0 && SOURCE_FILE_PATTERN.test(f)).length;
};

// ---------------------------------------------------------------------------
// Framework detection
// ---------------------------------------------------------------------------

const detectFramework = (
    dir: string,
    deps: Record<string, string>,
): Framework => {
    // Nuxt takes priority
    if (deps.nuxt || hasConfigFile(dir, NUXT_CONFIG_FILENAMES)) {
        const nuxtVersion = deps.nuxt ?? "";
        // Nuxt 2 uses version "^2.x", Nuxt 3 uses "^3.x"
        if (nuxtVersion.match(/[~^]?2\./)) return "nuxt2";
        return "nuxt3";
    }

    // Then Vite
    if (deps.vite || hasConfigFile(dir, VITE_CONFIG_FILENAMES)) {
        return "vite";
    }

    // Then Vue CLI
    if (deps["@vue/cli-service"] || hasConfigFile(dir, VUE_CLI_CONFIG_FILENAMES)) {
        return "vue-cli";
    }

    return "unknown";
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const formatFrameworkName = (framework: Framework): string =>
    FRAMEWORK_DISPLAY_NAMES[framework];

/**
 * Scan a directory and detect the Vue project setup.
 */
export const discoverProject = (rootDirectory: string): ProjectInfo => {
    const packageJsonPath = path.join(rootDirectory, "package.json");
    const pkg = readPackageJson(packageJsonPath);
    const allDeps = collectAllDependencies(pkg);

    const vueVersion = allDeps.vue ?? null;
    const framework = detectFramework(rootDirectory, allDeps);
    const hasTypeScript = fs.existsSync(path.join(rootDirectory, "tsconfig.json"));
    const hasPinia = !!allDeps.pinia;
    const hasVuex = !!allDeps.vuex;
    const hasVueRouter = !!allDeps["vue-router"];
    const sourceFileCount = countSourceFiles(rootDirectory);

    return {
        vueVersion,
        framework,
        frameworkDisplayName: formatFrameworkName(framework),
        hasTypeScript,
        hasPinia,
        hasVuex,
        hasVueRouter,
        sourceFileCount,
    };
};
