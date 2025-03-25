# Integration Tests for CivicTheme Storybook Update Tool

This directory contains integration tests that verify the functionality of the update scripts when run on fixture subthemes.

## Update Script Integration Test

The `update-script.test.js` file tests the `update-build-and-storybook.sh` script to ensure it:
1. Correctly removes old files
2. Adds new files from the CivicTheme starter kit
3. Preserves essential subtheme files like info.yml and component stories

### How the Test Works

1. **Setup**: Creates a test fixture subtheme with all the necessary files, including ones that should be removed
2. **Execution**: Runs a modified version of the update script that uses a mock monorepo instead of cloning the real one
3. **Verification**: Checks that files were added, removed, and preserved as expected
4. **Cleanup**: Removes the test fixtures

### Running the Test

To run the integration test:

```bash
npm run test:integration
```

### Test Fixtures

The test creates the following test fixture structure:

```
fixtures/
└── test_subtheme/
    ├── test_subtheme.info.yml   # Proper theme info file
    ├── components/              # Contains component stories
    │   └── test-component/
    │       └── test-component.stories.js
    ├── .storybook/             # Should be replaced
    ├── webpack/                # Should be removed
    ├── dist/                   # Should be removed
    ├── ...                     # Other files to be removed/replaced
```

### Mock Monorepo

Instead of cloning the actual CivicTheme monorepo, the test creates a mock structure:

```
mock-monorepo/
└── web/
    └── themes/
        └── contrib/
            └── civictheme/
                └── civictheme_starter_kit/
                    ├── .storybook/
                    ├── package.json
                    ├── package-lock.json
                    ├── build.js
                    ├── vite.config.js
                    └── .nvmrc
```

### Expected Test Output

If successful, the test should output:
- Confirmation of files that were verified to be added
- Confirmation that the original info.yml file was preserved
- Confirmation that component story files were preserved