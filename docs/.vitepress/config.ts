import { defineConfig } from "vitepress";

export default defineConfig({
    title: "Vue Doctor",
    description: "Diagnose and fix issues in your Vue.js app",

    base: "/vue-doctor/",

    head: [
        ["meta", { name: "theme-color", content: "#42b883" }],
        ["meta", { name: "og:type", content: "website" }],
        ["meta", { name: "og:title", content: "Vue Doctor" }],
        ["meta", { name: "og:description", content: "Diagnose and fix issues in your Vue.js app" }],
    ],

    themeConfig: {
        logo: "🩺",

        nav: [
            { text: "Home", link: "/" },
            { text: "Get Started", link: "/guide/getting-started" },
            { text: "Rules", link: "/rules/" },
            { text: "Changelog", link: "https://github.com/healerlab/vue-doctor/releases" },
        ],

        sidebar: [
            {
                text: "Guide",
                items: [
                    { text: "Getting Started", link: "/guide/getting-started" },
                    { text: "Configuration", link: "/guide/configuration" },
                    { text: "CI / GitHub Actions", link: "/guide/ci" },
                    { text: "AI Agent Skills", link: "/guide/agent-skills" },
                    { text: "Node.js API", link: "/guide/api" },
                ],
            },
            {
                text: "Rules",
                items: [
                    { text: "Overview", link: "/rules/" },
                    { text: "Reactivity", link: "/rules/reactivity" },
                    { text: "Performance", link: "/rules/performance" },
                    { text: "Nuxt", link: "/rules/nuxt" },
                    { text: "Pinia", link: "/rules/pinia" },
                    { text: "Architecture", link: "/rules/architecture" },
                ],
            },
        ],

        socialLinks: [
            { icon: "github", link: "https://github.com/healerlab/vue-doctor" },
        ],

        footer: {
            message: "Released under the MIT License.",
            copyright: "Copyright © 2025 HealerLab",
        },

        search: {
            provider: "local",
        },
    },
});
