# CivicTheme Storybook v8 Update Tool

A utility to assist with upgrading CivicTheme sub-themes from Storybook v6 to v8.

## Purpose

This tool automates migrating CivicTheme sub-themes to Storybook v8:

1. **Build System Update**: Replaces package.json dependencies, updates configuration files, and modifies build scripts to be compatible with Storybook v8.

2. **Story File Conversion**: Uses the Claude AI API to convert story files from the deprecated knobs API to the modern controls API.

## Prerequisites

- Node.js 22 or higher
- An Anthropic API key for Claude AI (required for story conversion only)
- A valid CivicTheme sub-theme with Storybook v6 stories
- Git (recommended for version control)

## Installation

Clone the upgrade-tools repository into any local folder on your computer (e.g. `~/documents`).

```bash
git clone git@github.com:civictheme/upgrade-tools.git
cd upgrade-tools/storybook-v8-update
npm install
```

## Usage

Run the interactive update tool:

```bash
npm run update-storybook
```

The tool will guide you through the update process with the following steps:

1. Configure the sub-theme location and Anthropic API key
2. Update the build system files
3. Convert story files from knobs to controls API

## ⚠️ Important Warnings

### Before Running the Tool

- **COMMIT YOUR CHANGES**: Make sure all your work is committed to version control
- **BACKUP YOUR FILES**: Create a backup of your sub-theme directory
- **TEST ENVIRONMENT**: Always run this locally or on a test server.

### File Modifications

This tool will modify or replace:
- `package.json` dependencies and scripts
- `.storybook` configuration files
- Story files (`.stories.js`)

### API Key Security

- The Anthropic API key is stored in a local `.env` file
- Never commit this file to version control
- Ensure you have proper permissions to use the API

## Troubleshooting

### Build System Update Fails

If the build system update fails, check:
- File permissions
- Sub-theme directory path is correct
- Internet connection for downloading dependencies

### Check the logs if any errors in running

Every step of this update script is logged in `.logs`. Review this log for any unexpected results or breaks in the
update script.

### Story Conversion Issues

If story conversion doesn't produce the expected results:
- Check if the story files follow standard patterns
- Verify your API key is valid
- Some complex stories may require manual adjustment after conversion

## Post-Update Steps

After running the tool:

1. Review the converted story files for any issues
2. Run `npm install` in your sub-theme directory
3. Test the updated Storybook with `npm run storybook`
4. Fix any remaining issues manually

### Limitations

- The AI conversion works best with standard story formats
- Custom or complex stories may require additional manual adjustments
- The tool only converts `.stories.js` files, not TypeScript stories
- The tools is a helper not a solution, it is not intended to be an end to end update script
- Support and discussions can be had on the #civictheme-designsystem slack channel 
## Required Manual Update

In the `build.js` added to your sub-theme you need to check the line:
`const DIR_CIVICTHEME            = fullPath('../../contrib/civictheme/')` (line 81) with the relative
path to your civictheme (we plan to automate this step).

## Manual Updates / Updating stories that have not been automatically converted

### SASS compilation issues after upgrade

This error is telling me that we have a civictheme variable in our custom component SASS that no longer exists in CivicTheme.

Three possible options / actions:
1. add the variable to your sub-theme `variables.components.scss` file if you still require
2. bring in the updated component SASS to your sub-theme and add back the required customisations
3. Delete your component and use CivicTheme base component.

```
✅   Saved: Combined folders [ 206 ms ]
❌   Error during SASS compilation: Error: Undefined variable.
   ╷
19 │       content: $ct-label-required-content;
   │                ^^^^^^^^^^^^^^^^^^^^^^^^^^
   ╵
  01-atoms/label/label.scss 19:16  @import
  - 67:9                           root stylesheet
Details: Exception [Error]: Error: Undefined variable.
   ╷
19 │       content: $ct-label-required-content;
   │                ^^^^^^^^^^^^^^^^^^^^^^^^^^
   ╵
  01-atoms/label/label.scss 19:16  @import

```
### JS Bundle issue

`civictheme_old` is my existing subtheme.

```
❌   Error during SASS compilation: require is not defined in ES module scope, you can use import instead
This file is being treated as an ES module because it has a '.js' file extension and '/civictheme/web/themes/custom/civictheme_old/package.json' contains "type": "module". To treat it as a CommonJS script, rename it to use the '.cjs' file extension.
Details: ReferenceError: require is not defined in ES module scope, you can use import instead
This file is being treated as an ES module because it has a '.js' file extension and 'civictheme/web/themes/custom/civictheme_old/package.json' contains "type": "module". To treat it as a CommonJS script, rename it to use the '.cjs' file extension.
```

We are mixing closure JS and module JS - this error is saying that the JS compilation hit an unexpected bit of closure JS (a `require` rather than an `import`). The fix is to change the file extension in this case to `.cjs` to tell the JS build process to expect `require` statements.

### Storybook errors

```
WARN 🚨 Unable to index files:
WARN - ./components_combined/01-atoms/table/table.stories.js: Unterminated string constant. (99:13)
WARN - ./components_combined/02-molecules/attachment/attachment.stories.js: Unterminated string constant. (124:14)
WARN - ./components_combined/02-molecules/field/field.stories.js: CSF: missing default export /home/rgaunt/work/civictheme/web/themes/custom/civictheme_old/components_combined/02-molecules/field/field.stories.js (line 1, col 0)
```


#### Unterminated string

This storybook compilation error is often caused by the story being too long for the LLM to output or the output got cut off halfway.

Note: we have completed stories for all CivicTheme components in the new version so you can compare your story with the new story in CivicTheme to get an idea of what it should have.

Action:
1. Compare to your original story and see what is missing from the original and copy across missing parts.
2. Compare to story in CivicTheme if this component is overriding an existing component

```
WARN - ./components_combined/01-atoms/table/table.stories.js: Unterminated string constant. (99:13
```

#### Missing default export


```
WARN - ./components_combined/02-molecules/field/field.stories.js: CSF: missing default export
```

If it is an override compare against the CivicTheme component if it is an override and add what is missing.

If its a new component, look to other stories and check to see what the exports are for each. Add in what is missing.

### Drupal Theme CSS Issues (but not in Storybook)

If you are finding that your `body` tag has a margin, this indicates that you need to update your Drupal Theme CSS.
These overrides are set in `<sub-theme>/assets/sass` folder. 
Compare the contents of this folder with: `civictheme/civictheme_starter_kit/assets/sass` and add any missing overrides.
In the above example the `assets/sass/page/_page.scss` was added in 1.9 which needs to be added to the 
`<sub-theme>/assets/sass` folder.

### Case Sensitivity of assets folders

If you update and you are finding that sub-theme fonts or other assets are not being found. Be aware that webpack
was resolving directories even when the directories were not matching due to case differences.

Check your SASS references to assets and the directories in your `assets` sub-theme folder for any differences.

### Odd artifacts from LLM
The story file is completely commented out, or in error.
Go to line 1 - it might have some element from the LLM such as the below markdown artifact:

```
```js

```

Should be fairly obvious what is breaking it, remove and recompile.

If it is surrounded by markdown then the last line will probably have a closing tag artifact from LLM as well.

Our prompt asks Claude not to do this three different ways but this seems to something that the LLM really wants to do.


### Larger stories - Organisms

Some larger more complex stories did not get automatically converted. Look to CivicTheme for guidance on what is needed
for these components and manually develop.

## License

GPL2.0
