// Mock file imports for tests
module.exports = 'test-file-stub';

/**
 * Mock file for handling static assets in Jest tests
 * 
 * This allows Jest to process imports of various static assets without throwing errors.
 * Used in conjunction with moduleNameMapper in jest.config.js.
 * 
 * Handles the following file types:
 * - Images: .jpg, .jpeg, .png, .gif, .webp, .svg
 * - Fonts: .woff, .woff2, .ttf, .eot
 * - Other: .mp4, .wav, .mp3
 * 
 * Example mapping in jest.config.js:
 * moduleNameMapper: {
 *   "\\.(jpg|jpeg|png|gif|webp|svg)$": "<rootDir>/__mocks__/fileMock.js",
 *   "\\.(woff|woff2|ttf|eot)$": "<rootDir>/__mocks__/fileMock.js"
 * }
 */

module.exports = 'test-file-stub';
