# CivicTheme Storybook Update Tool Tests

This directory contains tests for the CivicTheme Storybook update tool.

## Running Tests

To run the tests, use:

```bash
npm test
```

## Test Structure

### Fixtures

The `fixtures` directory contains test subdirectories that simulate different
subtheme structures:

- `valid-subtheme`: A valid CivicTheme subtheme with all required files and directories
- `invalid-no-info`: Missing the required .info.yml file
- `invalid-wrong-base`: Has an incorrect base theme (not civictheme)
- `invalid-no-components`: Missing the components directory

### Test Files

- `validateSubTheme.test.js`: Tests for the subtheme validation functionality

## Adding New Tests

To add new tests:

1. Create any additional fixture files or directories needed
2. Add new test cases to existing test files or create new test files
3. Run the tests to ensure they pass

## Testing Strategy

These tests focus on validating the subtheme directory structure requirements
without needing to mock filesystem operations. They utilize real fixture files
to test the validation logic under different scenarios.