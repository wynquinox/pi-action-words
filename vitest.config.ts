import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      // Stryker sandboxes contain stale copies of src/ and tests/; never run them.
      "**/.stryker-tmp/**",
      "**/.{idea,git,cache,output,temp}/**",
    ],
  },
});
