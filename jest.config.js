module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@core/(.*)$": "<rootDir>/src/core/",
    "^@ecs/(.*)$": "<rootDir>/src/core/ecs/",
    "^@utils/(.*)$": "<rootDir>/src/core/utils/",
    "^@debug/(.*)$": "<rootDir>/src/core/debug/",
    "^@types/(.*)$": "<rootDir>/src/types/"
  },
  collectCoverage: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts"
  ]
}
