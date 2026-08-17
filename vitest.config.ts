import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // happy-dom gives a lightweight DOM so SceneryStack code can import.
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    // --expose-gc lets us call global.gc() to force garbage collection
    execArgv: ["--expose-gc"],
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
