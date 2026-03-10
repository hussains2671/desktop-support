module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/config/**',
    '!src/utils/logger.js',
    '!src/server.js'
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)(test|spec).js'
  ],
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/backend/__tests__/setup.js'],
  testTimeout: 10000
};
