/**
 * Tests for the subtheme directory validation functionality
 */

const path = require('path');
const { validateSubThemeDirectory } = require('../src/validateSubTheme');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

describe('Subtheme Directory Validation', () => {
  test('Valid subtheme passes validation', async () => {
    const dirPath = path.join(FIXTURES_DIR, 'valid-subtheme');
    const result = await validateSubThemeDirectory(dirPath);
    expect(result.valid).toBe(true);
  });

  test('Subtheme without info.yml fails validation', async () => {
    const dirPath = path.join(FIXTURES_DIR, 'invalid-no-info');
    const result = await validateSubThemeDirectory(dirPath);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Could not find');
  });

  test('Subtheme with wrong base theme fails validation', async () => {
    const dirPath = path.join(FIXTURES_DIR, 'invalid-wrong-base');
    const result = await validateSubThemeDirectory(dirPath);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('base theme: civictheme');
  });

  test('Subtheme without components directory fails validation', async () => {
    const dirPath = path.join(FIXTURES_DIR, 'invalid-no-components');
    const result = await validateSubThemeDirectory(dirPath);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('components directory');
  });
});