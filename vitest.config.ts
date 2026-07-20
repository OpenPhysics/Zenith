import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    execArgv: ["--expose-gc"],
    // happy-dom gives a lightweight DOM so SceneryStack code can import.
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**"],
      exclude: [
        "src/zenith-screen/view/EarthShoreData.ts", // generated, 210 KB
        "src/zenith-screen/model/BrightStarCatalog.ts", // generated
        "src/zenith-screen/model/DeepStarCatalog.ts", // generated
        "src/zenith-screen/model/ConstellationLines.ts", // generated
      ],
    },
  },
});
