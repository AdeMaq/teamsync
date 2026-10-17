// Run with `npm test` (needs Node's --experimental-vm-modules because the project uses ES modules).
export default {
  testEnvironment: 'node',
  transform: {}, // plain ES modules, no Babel
  roots: ['<rootDir>/src/tests'],
  testMatch: ['**/*.test.js'],
  setupFiles: ['<rootDir>/src/tests/env.setup.js'],
  maxWorkers: 1, // every test file shares one test database, so files run one after another
  testTimeout: 20000,
};
