import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // CI gate: fail the build if coverage drops below these thresholds.
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      thresholds: {
        lines: 66,
        statements: 66,
        functions: 66,
        branches: 66,
      },
    },
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      // Stryker sandboxes contain stale copies of src/ and tests/; never run them.
      "**/.stryker-tmp/**",
      "**/.{idea,git,cache,output,temp}/**",
    ],
  },
});
