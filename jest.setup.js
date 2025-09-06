// Import jest-dom additions
require('@testing-library/jest-dom');

// Mock Next.js modules only if they're used in the components
// Remove router mocks as they're not needed for our current tests

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Add any global setup needed for Jest tests here

// To fix requestAnimationFrame error in some tests
if (typeof window !== 'undefined') {
  window.requestAnimationFrame = (callback) => {
    setTimeout(callback, 0);
    return 0;
  };
}

// Mock IntersectionObserver for UI tests
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {
    return null;
  }
  unobserve() {
    return null;
  }
  disconnect() {
    return null;
  }
}

global.IntersectionObserver = MockIntersectionObserver;

// Suppress console error/warnings in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    if (
      /Warning.*not wrapped in act/i.test(args[0]) ||
      /test was not wrapped in act/i.test(args[0])
    ) {
      return;
    }
    originalConsoleError.call(console, ...args);
  };
  
  console.warn = (...args) => {
    if (/Warning.*not wrapped in act/i.test(args[0])) {
      return;
    }
    originalConsoleWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});


