module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@core/(.*)$': '<rootDir>/src/core/',
    '^@components/(.*)$': '<rootDir>/src/components/',
    '^@game/(.*)$': '<rootDir>/src/game/',
    '^@utils/(.*)$': '<rootDir>/src/utils/',
    '^@types/(.*)$': '<rootDir>/src/types/'
  },
  testMatch: ['**/tests/**/*.test.ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.ts']
};
