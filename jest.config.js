module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@core/(.*)$": "<rootDir>/src/core/$1",
    "^@ecs/(.*)$": "<rootDir>/src/core/ecs/$1",
    "^@utils/(.*)$": "<rootDir>/src/core/utils/$1",
    "^@debug/(.*)$": "<rootDir>/src/core/debug/$1",
    "^@types/(.*)$": "<rootDir>/src/types/$1",
    "^babylonjs$": "<rootDir>/tests/mocks/babylonjs.ts",
    "^uuid$": "<rootDir>/tests/mocks/uuid.ts"
  },
  transformIgnorePatterns: [
    "/node_modules/(?!uuid).+\\.js$"
  ],
  transform: {
    "^.+\\.(ts|tsx|js)$": ["ts-jest", {
      "isolatedModules": true
    }]
  },
  moduleDirectories: ["node_modules", "src"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts"
  ],
  testTimeout: 10000
}
