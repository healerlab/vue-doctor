import { defineConfig } from "tsdown";

export default defineConfig({
    entry: ["src/cli.ts", "src/index.ts"],
    format: "esm",
    dts: true,
    clean: true,
    splitting: true,
    target: "node18",
    banner: {
        js: "#!/usr/bin/env node",
    },
});
