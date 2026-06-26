import { defineConfig } from "vitest/config";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

export default defineConfig({
    test: {
        environment: "node",
        globals: false,
        include: ["tests/**/*.test.ts"],
        // Stub Next.js's build-time guards so service code can be loaded
        // under vitest. server-only is a no-op at test time.
        server: {
            deps: {
                inline: [/server-only/],
            },
        },
        alias: [
            { find: "server-only", replacement: path.resolve(import.meta.dirname, "tests/server-only-stub.ts") },
        ],
    },
    resolve: {
        alias: {
            "@": path.resolve(import.meta.dirname, "src"),
        },
    },
});