/**
 * @file
 * Main entry point for the SDC update tool.
 *
 * Provides a CLI interface for upgrading CivicTheme subthemes to use SDC.
 */
import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { validateConfig, loadConfig } from './lib/config.js';
import { configureApplication } from './wizard.js';
import { runUpdate } from './update-runner.js';
import logger from './lib/logger.js';

/**
 * Show configuration status with emojis
 *
 * @param {Object} configStatus - Configuration validation status
 * @returns {Promise<void>}
 */
async function showConfigStatus(configStatus) {
  const config = await loadConfig();

  console.log(chalk.white('\n📋 Current Configuration Status:'));

  if (configStatus.valid) {
    console.log(chalk.green('✅ Configuration is valid and ready for SDC update'));
    console.log(chalk.blue(`📁 Subtheme: ${config.subthemeDirectory}`));
    console.log(chalk.blue(`🔑 API Key: ${'*'.repeat(4)}...${config.anthropicApiKey.slice(-4)}`));
    console.log(chalk.blue(`🤖 Model: ${config.anthropicModel}`));
  } else {
    console.log(chalk.yellow(`⚠️  ${configStatus.message}`));
    console.log(chalk.yellow('Please configure the application before running the update.'));
  }

  // Show log file location
  const logFile = logger.getCurrentLogFilePath();
  if (logFile) {
    console.log(chalk.gray(`\n📝 Logs: ${logFile}`));
  }

  console.log(''); // Empty line for spacing
}

/**
 * Show application version from package.json
 *
 * @returns {Promise<void>}
 */
async function showVersion() {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    return packageJson.version || '0.0.0';
  } catch (error) {
    await logger.warning(`Could not read package.json: ${error.message}`);
    return '0.0.0';
  }
}

/**
 * Main application function
 *
 * @returns {Promise<void>}
 */
async function main() {
  try {
    // Initialize logger
    await logger.initLogger();
    await logger.info('Starting SDC Update Tool');

    // Display welcome banner with version
    const version = await showVersion();
    console.log(chalk.blue(`🧩 CivicTheme SDC Update Tool v${version}\n`));
    console.log(chalk.yellow('🔄 Convert your CivicTheme Drupal subtheme to use Single Directory Components'));
    // Main application loop
    let exitApp = false;

    while (!exitApp) {
      // Check if configuration is valid
      const configStatus = await validateConfig();

      // Show current configuration status
      await showConfigStatus(configStatus);

      // Prepare menu choices
      const choices = [];

      // Add update option if configuration is valid
      if (configStatus.valid) {
        choices.push({
          name: chalk.green('🚀 Run SDC update on configured subtheme'),
          value: 'run_update',
          description: 'Start the update process for the configured subtheme'
        });
      }

      // Always add configuration option
      choices.push({
        name: chalk.blue('⚙️  Configure sub-theme location and API key'),
        value: 'configure_application',
        description: 'Set up or update your subtheme path and API credentials'
      });

      // Always add exit option
      choices.push({
        name: chalk.red('👋 Exit'),
        value: 'exit',
        description: 'Exit the application'
      });

      // Show the menu
      const choice = await select({
        message: chalk.white('Please select an option:'),
        choices
      });

      // Handle user choice
      switch (choice) {
        case 'run_update':
          await logger.info('User selected: Run SDC update');
          try {
            await runUpdate();
            // Show a prompt to return to main menu after update
            console.log(chalk.green('\n✅ Update completed! Press Enter to return to the main menu...'));
            await new Promise(resolve => {
              process.stdin.once('data', () => {
                resolve();
              });
            });
          } catch (updateError) {
            console.error(chalk.red(`\n❌ Update process failed: ${updateError.message}\n`));
            console.log(chalk.yellow(`Please check the logs at: ${logger.getCurrentLogFilePath()}`));
            await logger.error(`Update process failed: ${updateError.message}`);
            console.log(chalk.yellow('\nPress Enter to return to the main menu...'));
            await new Promise(resolve => {
              process.stdin.once('data', () => {
                resolve();
              });
            });
          }
          break;

        case 'configure_application':
          await logger.info('User selected: Configure application');
          await configureApplication();
          break;

        case 'exit':
          await logger.info('User selected: Exit application');
          console.log(chalk.blue('\n👋 Thank you for using CivicTheme SDC Update Tool!\n'));
          exitApp = true;
          break;

        default:
          await logger.warning(`Unknown option selected: ${choice}`);
          console.log(chalk.yellow(`\n⚠️ Unknown option: ${choice}\n`));
      }
    }
  } catch (error) {
    await logger.error(`Application error: ${error.message}`);
    console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
    process.exit(1);
  }
}

// Run the application
main().catch((error) => {
  console.error(chalk.red(`\n❌ Fatal error: ${error.message}\n`));
  process.exit(1);
});
