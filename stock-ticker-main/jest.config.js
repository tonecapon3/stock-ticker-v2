const nextJest = require('next/jest');

// Providing the path to your Next.js app which will enable loading next.config.js and .env files
const createJestConfig = nextJest({
  dir: './',
});

// Any custom config you want to pass to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    // Handle module aliases
    '^@/(.*)$': '<rootDir>/src/$1',
  
  // Test environment for DOM testing
  testEnvironment: 'jest-environment-jsdom',
  
  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,
  
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  
  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: 'v8',
  
  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  
  // Path mapping for module resolution
  moduleNameMapper: {
    // Handle module aliases
    '^@/(.*)$': '<rootDir>/$1',
    
    // Handle CSS imports
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
    
    // Handle image imports
    '^.+\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  
  // Ignore patterns for coverage
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/.next/',
    '/dist/',
  ],
  
  // Collect coverage from these directories
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  
  // The paths to directories that Jest should use to search for files in
  roots: [
    '<rootDir>',
  ],
  
  // Transform paths for TypeScript and other file types
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  
  // Modules that don't need to be transformed
  transformIgnorePatterns: [
    '/node_modules/',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
  
  // This option allows you to use custom runners and test-environment
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config
module.exports = createJestConfig(customJestConfig);

