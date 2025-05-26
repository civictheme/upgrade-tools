I want to convert this update script to be easier to use for users.
The current script is in `scripts` and is controlled via npm to start it.
We want to make it more user friendly but keep the core functionality exactly the same

The application shall ask the user:

1. What they want to do:

```js
   const { choice } = await inquirer.prompt([
   {
   type: 'list',
   name: 'choice',
   message: chalk.white('Please select an option:'),
   choices: [
    ... Run update script
   {
   name: chalk.blue('⚙️  Configure sub-theme location and API key'),
   value: 'configure_application'
   },
   {
   name: chalk.red('👋 Exit'),
   value: 'exit'
   }
   ]
   }
   ]);
```
2. Configure application does the following - use the following snippet to save a config file.

```js
/**
 * Handles the configuration of the application
 *
 * Prompts user for sub-theme directory path and Anthropic API key,
 * then saves these values to a .env file.
 *
 * @async
 * @return {Promise<void>} Resolves when configuration is saved
 */
async function configureApplication() {
    const questions = [
        {
            type: 'autocomplete',
            name: 'subthemeDirectory',
            message: chalk.white('Enter the sub-theme directory path:'),
            default: process.env.SUBTHEME_DIRECTORY || '',
            source: (input) => searchDirectories(input),
            validate: async (input) => {
                try {
                    const fullPath = input.value;
                    await fs.access(fullPath);

                    // Validate that this is a CivicTheme sub-theme
                    const validation = await validateSubThemeDirectory(fullPath);
                    if (!validation.valid) {
                        return chalk.red(`⚠️  ${validation.message}`);
                    }

                    return true;
                } catch (error) {
                    return chalk.red('⚠️  Directory does not exist! Please enter a valid path.');
                }
            }
        },
        {
            type: 'input',
            name: 'anthropicApiKey',
            message: chalk.white('Enter your Anthropic API key:'),
            default: process.env.ANTHROPIC_API_KEY || '',
            validate: (input) => {
                if (input.length === 0) {
                    return chalk.red('⚠️  API key cannot be empty!');
                }
                return true;
            }
        }
    ];

    try {
        const answers = await inquirer.prompt(questions);

        // Prepare .env content
        const envContent = `SUBTHEME_DIRECTORY=${answers.subthemeDirectory}
ANTHROPIC_API_KEY=${answers.anthropicApiKey}`;

        // Write to .env file
        await fs.writeFile('.env', envContent);

        console.log(chalk.green('\n✅ Configuration saved successfully!\n'));
        console.log(chalk.blue('📁 Sub-theme directory:'), chalk.white(answers.subthemeDirectory));
        console.log(chalk.blue('🔑 API key:'), chalk.white(answers.anthropicApiKey));

    } catch (error) {
        console.error(chalk.red('\n❌ Error saving configuration:'), error.message);
    }
}

```

3. If the user is chooses to update to SDC the application checks that:

- sub-theme directory and API key are configured
- sub-theme directory is a sub-theme directory

Use the following to validate the sub-theme:

```js
/**
 * Validates that the provided path is a valid CivicTheme sub-theme directory
 *
 * @module validateSubTheme
 */

const fs = require('fs/promises');
const path = require('path');

/**
 * Validates that the provided path is a valid CivicTheme sub-theme directory
 *
 * Checks that:
 * 1. The info.yml file exists and matches the directory name
 * 2. The YAML file contains required keys (name, type: theme, base theme: civictheme)
 * 3. A components directory exists for Storybook stories
 *
 * @async
 * @param {string} dirPath - The path to validate
 * @return {Promise<{valid: boolean, message: string}>} Validation result and message
 */
async function validateSubThemeDirectory(dirPath) {
    try {
        // Get the directory name from path
        const dirName = path.basename(dirPath);

        // Check for the .info.yml file
        const infoYmlPath = path.join(dirPath, `${dirName}.info.yml`);

        try {
            await fs.access(infoYmlPath);
        } catch {
            return {
                valid: false,
                message: `Could not find ${dirName}.info.yml file in the directory. This doesn't appear to be a valid Drupal theme.`
            };
        }

        // Check for components directory
        const componentsPath = path.join(dirPath, 'components');
        let hasComponentsDir = false;

        try {
            await fs.access(componentsPath);
            const componentsStat = await fs.stat(componentsPath);
            hasComponentsDir = componentsStat.isDirectory();
        } catch {
            hasComponentsDir = false;
        }

        // Read and validate the YAML content
        const ymlContent = await fs.readFile(infoYmlPath, 'utf8');

        // Simple YAML content checks - look for required fields
        const hasName = ymlContent.includes('name:');
        const isThemeType = ymlContent.includes('type: theme');
        const hasCivicThemeBase = ymlContent.includes('base theme: civictheme');

        if (!hasName || !isThemeType || !hasCivicThemeBase || !hasComponentsDir) {
            return {
                valid: false,
                message: `The directory does not appear to be a valid CivicTheme sub-theme:
${!hasName ? '❌ Missing "name:" field in .info.yml' : '✅ Has name field in .info.yml'}
${!isThemeType ? '❌ Missing or incorrect "type: theme" field in .info.yml' : '✅ Has correct type field in .info.yml'}
${!hasCivicThemeBase ? '❌ Missing or incorrect "base theme: civictheme" field in .info.yml' : '✅ Has correct base theme field in .info.yml'}
${!hasComponentsDir ? '❌ Missing components directory (required for Storybook stories)' : '✅ Has components directory'}`
            };
        }

        return {
            valid: true,
            message: `✅ Valid CivicTheme sub-theme directory with components folder`
        };
    } catch (error) {
        return {
            valid: false,
            message: `Error validating directory: ${error.message}`
        };
    }
}

module.exports = { validateSubThemeDirectory };


```


4. Then once these elements are set we run the scripts, we need to log each step we run and log each step the scripts make

## Tech Stack

`@inquirer/prompts`
`@anthropic-ai/sdk`
`glob`
`js-yaml`
`yaml`
`jest`
`eslint`

## Additional Requirements

1. Write Jest tests to validate the script with `npm run test`
2. Add emojis to make it more fun
3. Lint your scripts with eslint and `npm run lint`
4. Need to add logs to `.logs` with each step undertaken by the update script added to this log file
