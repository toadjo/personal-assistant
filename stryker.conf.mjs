/**
 * Stryker mutation testing configuration.
 *
 * This config pilots mutation testing on src/main/services/* to catch logic gaps
 * and edge cases that unit tests might miss.
 *
 * Run: npx stryker run
 */

export default {
  // Only test the services directory for this pilot
  mutator: "javascript",
  mutate: [
    "src/main/services/**/*.ts",
    "!src/main/services/**/*.test.ts"
  ],
  // Use Vitest as the test runner
  testRunner: "vitest",
  testRunnerConfig: {
    // Reuse existing vitest config
    configFile: "vitest.config.ts"
  },
  // Only mutate a subset of files for the pilot (avoid full project overhead)
  maxConcurrentTestRunners: 2,
  // Coverage thresholds for mutation testing
  coverageAnalysis: "perTest",
  // Reporters
  reporters: ["html", "clear-text", "progress"],
  // HTML report output
  htmlReporter: {
    baseDir: "reports/mutation"
  },
  // Thresholds: fail if mutation score drops below 60%
  thresholds: {
    high: 80,
    low: 60,
    break: 60
  },
  // Exclude files that are mostly boilerplate or generated
  exclude: [
    "src/main/services/lifeAreas/**/*.ts", // New module system, test separately
    "src/main/services/connectedCalendar/**/*.ts", // External OAuth, complex setup
    "src/main/services/team/**/*.ts" // External sync, complex setup
  ]
};
