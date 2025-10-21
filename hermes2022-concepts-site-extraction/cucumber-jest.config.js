// Configuration Jest-Cucumber pour hermes2022-concepts-site-extraction
module.exports = {
  testMatch: [
    '**/__tests__/integration/**/*.steps.{js,ts}',
    '**/__tests__/e2e/**/*.steps.{js,ts}'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { esModuleInterop: true } }],
    '^.+\\.js$': 'babel-jest'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testEnvironment: 'node',
  testTimeout: 15000,
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/support/jest-cucumber-setup.js'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/support/'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  }
};
