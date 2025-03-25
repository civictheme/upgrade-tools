#!/usr/bin/env node

/**
 * CivicTheme Storybook Version 8 Update Script
 *
 * This script guides users through updating their CivicTheme sub-theme from Storybook v6 to v8.
 * It provides an interactive interface to update build system files and convert Storybook stories
 * from knobs to controls API format.
 *
 * @module update-storybook
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import dotenv from 'dotenv';
import {glob} from 'glob';
import path from 'path';
import fs from 'fs/promises';
import { spawn } from 'child_process';
import convertSubthemeStorybook from './scripts/convert-subtheme-storybook.mjs';
import { validateSubThemeDirectory } from './src/validateSubTheme.js';

import inquirerAutocomplete from "inquirer-autocomplete-prompt";

// Load environment variables once at startup
dotenv.config();

inquirer.registerPrompt('autocomplete', inquirerAutocomplete);

/**
 * Welcome message displayed when the application starts
 */
const WELCOME_MESSAGE = `
${chalk.cyan.bold('🚀 CivicTheme Storybook Version 8 update script')}

${chalk.white('Script is to guide you through updating your sub-theme front-end build processes to the latest CivicTheme system.')}

${chalk.yellow('This update includes two separate processes:')}
${chalk.yellow('1.')} ${chalk.green('🔧 Updating the build system')} including updating package.json, build script files, storybook configuration.
${chalk.yellow('2.')} ${chalk.green('🤖 Providing an AI integration')} to update your existing custom component or component override stories from using deprecated storybook knobs to using storybook controls.
${chalk.magenta('ℹ️  This process guides you through the most of the update but then there will be manual intervention needed to complete the process.')}
${chalk.magenta('📝 We have provided notes on this in the README.md file')}
`;

/**
 * Displays and handles the main application menu
 *
 * Presents user with options to update build system, update storybook stories,
 * configure settings or exit the application.
 *
 * @async
 * @returns {Promise<void>}
 */
async function mainMenu() {
  while (true) {
    console.log('\n' + chalk.blue.bold('📋 Main Menu') + '\n');

    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: chalk.white('Please select an option:'),
        choices: [
          {
            name: chalk.green('🔧 Update build system'),
            value: 'update_build_system'
          },
          {
            name: chalk.yellow('🤖 Update storybook stories (AI API Key required)'),
            value: 'update_stories'
          },
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

    switch (choice) {
      case 'update_build_system':
        if (!await hasValidSubThemeDirectory()) {
          console.log(chalk.yellow(`\n⚠️ The configured directory is not a valid CivicTheme sub-theme. Please configure a valid directory.\n`));
          await configureApplication();

          // Recheck after configuration
          if (!await hasValidSubThemeDirectory()) {
            console.log(chalk.red(`\n❌ Cannot proceed with invalid sub-theme directory.\n`));
            break;
          }
        }
        await updateBuildAndStoryBook();
        break;
      case 'update_stories':
        // Check both directory and API key
        let needsConfig = false;

        if (!await hasValidSubThemeDirectory()) {
          console.log(chalk.yellow(`\n⚠️ The configured directory is not a valid CivicTheme sub-theme. Please configure a valid directory.\n`));
          needsConfig = true;
        }

        if (!hasApiKey()) {
          console.log(chalk.yellow(`\n⚠️ No API key configured. You need to provide an Anthropic API key.\n`));
          needsConfig = true;
        }

        if (needsConfig) {
          await configureApplication();

          // Recheck after configuration
          if (!await hasValidSubThemeDirectory() || !hasApiKey()) {
            console.log(chalk.red(`\n❌ Cannot proceed without valid sub-theme directory and API key.\n`));
            break;
          }
        }

        console.log(chalk.blue('\n🔄 Starting Storybook stories update...\n'));
        try {
          await convertSubthemeStorybook();
          console.log(chalk.green('\n✅ Successfully updated Storybook stories\n'));
        } catch (error) {
          console.error(chalk.red(`\n❌ Error updating Storybook stories: ${error.message}\n`));
        }

        break;
      case 'configure_application':
        await configureApplication();
        break;
      case 'exit':
      default:
        console.log(chalk.red.bold('\n👋 Exiting application...\n'));
        process.exit(0);
    }

  }
}

/**
 * Updates build and storybook configuration files in the sub-theme
 *
 * Executes a shell script that performs the actual file modifications,
 * after warning the user and obtaining confirmation.
 *
 * @async
 * @return {Promise<void>} Resolves when update is complete or rejected on error
 */
async function updateBuildAndStoryBook() {

  // Warning and confirmation prompt
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: chalk.yellow.bold('⚠️  WARNING: This will modify your build system. Please ensure you:') +
          '\n' + chalk.white('1. Have committed all your changes to version control') +
          '\n' + chalk.white('2. Can roll back changes if needed') +
          '\n' + chalk.white(`3. Understand this will modify files in: ${process.env.SUBTHEME_DIRECTORY}`) +
          '\n\n' + chalk.yellow('Do you want to proceed?'),
      default: false
    }
  ]);

  if (!confirmed) {
    console.log(chalk.yellow('\n⚪ Update cancelled by user\n'));
    return;
  }

  console.log(chalk.blue('\n🔄 Starting build system update...\n'));

  // Replace the execFileAsync code with:
  const scriptPath = path.resolve('./scripts/update-build-and-storybook.sh');
  await fs.chmod(scriptPath, '755');

  const subprocess = spawn(scriptPath, [], {
    env: { ...process.env, SUBTHEME_DIRECTORY: process.env.SUBTHEME_DIRECTORY },
    stdio: ['inherit', 'pipe', 'pipe']
  });

  // Stream stdout in real-time
  subprocess.stdout.on('data', (data) => {
    process.stdout.write(chalk.blue(data.toString()));
  });

  // Stream stderr in real-time
  subprocess.stderr.on('data', (data) => {
    process.stderr.write(chalk.red(data.toString()));
  });

  // Handle completion
  return new Promise((resolve, reject) => {
    subprocess.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.green('\n✨ Script completed successfully'));
        resolve();
      } else {
        console.error(chalk.red(`\n❌ Script failed with code ${code}`));
        reject(new Error(`Process exited with code ${code}`));
      }
    });

    subprocess.on('error', (error) => {
      console.error(chalk.red(`\n❌ Failed to start script: ${error.message}`));
      reject(error);
    });
  });
}

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
      source: async (_, input) => searchDirectories(input),
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


/**
 * Checks whether the sub-theme directory has been set and exists
 *
 * Verifies that:
 * 1. The environment variable is defined
 * 2. The directory exists in the filesystem
 * 3. The directory is a valid CivicTheme sub-theme
 *
 * @async
 * @return {Promise<boolean>} True if the directory is set, exists and is valid, false otherwise
 */
async function hasValidSubThemeDirectory() {
  const subthemeDirectory = process.env.SUBTHEME_DIRECTORY;

  if (!subthemeDirectory) return false;

  try {
    const fullPath = path.resolve(process.cwd(), subthemeDirectory);
    await fs.access(fullPath);

    // Additional validation for sub-theme structure
    const validation = await validateSubThemeDirectory(fullPath);
    if (!validation.valid) {
      console.error(chalk.yellow(`\n⚠️ ${validation.message}\n`));
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Checks whether the Anthropic API key has been set
 *
 * Simply verifies that the environment variable exists and is not empty.
 *
 * @return {boolean} True if the API key is set, false otherwise
 */
function hasApiKey() {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Gets directory suggestions based on user input
 *
 * Used by the autocomplete prompt to suggest directory paths.
 * Searches for directories matching the input and returns them formatted for display.
 *
 * @async
 * @param {string|null} input - The user's input to filter directories by, or null
 * @return {Promise<Array<Object>>} Array of directory objects with name and value properties
 */
async function searchDirectories(input = null) {
  try {
    input = input || process.env.SUBTHEME_DIRECTORY || process.cwd();
    // Get all directories from current location
    const directories = await glob(`${input}*/`);
    directories.sort();
    // Filter directories based on input
    return directories
        .filter(dir => dir.toLowerCase().includes(input.toLowerCase()))
        .map((dir) => {
          dir = path.resolve(dir);
          return {
            name: chalk.blue('📁 ') + dir,
            value: dir
          }
        });
  } catch (error) {
    return [];
  }
}

/**
 * Entry point of the application
 *
 * Loads environment variables, displays welcome message, and starts the main menu.
 */
function main() {
  console.log(WELCOME_MESSAGE);
  mainMenu();
}

main();
