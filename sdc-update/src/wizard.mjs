/**
 * @file
 * Configuration wizard for SDC update tool.
 *
 * Provides an interactive interface for configuring the application.
 */
import { input, confirm, search } from '@inquirer/prompts';
import { promises as fs } from 'fs';
import chalk from 'chalk';
import { saveConfig, loadConfig } from './lib/config.mjs';
import { validateSubThemeDirectory, searchDirectories } from './lib/validator.mjs';
import logger from './lib/logger.mjs';

/**
 * Handles the configuration of the application
 *
 * Prompts user for sub-theme directory path and Anthropic API key,
 * then saves these values to a .env file.
 *
 * @async
 * @return {Promise<Object>} Configuration object with user's inputs
 */
export async function configureApplication() {
  // Initialize logger if not already initialized
  await logger.initLogger();
  await logger.info('Starting configuration wizard');

  console.log(chalk.blue('\n📝 SDC Update Tool Configuration\n'));
  console.log(chalk.yellow('ℹ️  This wizard will help you configure your CivicTheme subtheme for the SDC update process.'));
  console.log(chalk.yellow('ℹ️  You will need a valid CivicTheme subtheme directory and an Anthropic API key.\n'));

  // Load existing configuration if available
  const existingConfig = await loadConfig();

  // Get subtheme directory using search with directory search
  const subthemeDirectory = await search({
    message: chalk.white('🔍 Enter the sub-theme directory path:'),
    default: existingConfig.subthemeDirectory || '',
    source: async (input = '') => searchDirectories(input),
    validate: async (input) => {
      try {
        const fullPath = input.value || input;
        await fs.access(fullPath);

        // Validate that this is a CivicTheme sub-theme
        const validation = await validateSubThemeDirectory(fullPath);
        if (!validation.valid) {
          return chalk.red(`⚠️  ${validation.message}`);
        }

        return true;
      } catch {
        return chalk.red('⚠️  Directory does not exist! Please enter a valid path.');
      }
    }
  });

  // Get Anthropic API key
  const anthropicApiKey = await input({
    message: chalk.white('🔑 Enter your Anthropic API key:'),
    default: existingConfig.anthropicApiKey || '',
    validate: (value) => {
      if (!value || value.trim() === '') {
        return chalk.red('⚠️  API key cannot be empty!');
      }
      // Basic validation for API key format
      return true;
    }
  });

  // Get Anthropic model (optional)
  const useDefaultModel = await confirm({
    message: chalk.white(`🤖 Use default model (${existingConfig.anthropicModel || 'claude-3-5-sonnet-20241022'})?`),
    default: true
  });

  let anthropicModel = existingConfig.anthropicModel || 'claude-3-5-sonnet-20241022';

  if (!useDefaultModel) {
    anthropicModel = await input({
      message: chalk.white('🤖 Enter the Anthropic model to use:'),
      default: anthropicModel,
      validate: (value) => {
        if (!value || value.trim() === '') {
          return chalk.red('⚠️  Model name cannot be empty!');
        }
        return true;
      }
    });
  }

  // Save configuration
  const config = {
    subthemeDirectory,
    anthropicApiKey,
    anthropicModel
  };

  try {
    await saveConfig(config);

    console.log(chalk.green('\n✅ Configuration saved successfully!\n'));
    console.log(chalk.blue('📁 Sub-theme directory:'), chalk.white(subthemeDirectory));
    console.log(chalk.blue('🔑 API key:'), chalk.white('*'.repeat(Math.min(10, anthropicApiKey.length)) + (anthropicApiKey.length > 10 ? '...' : '')));
    console.log(chalk.blue('🤖 Model:'), chalk.white(anthropicModel));
    console.log(chalk.green('\n🚀 You can now run the SDC update from the main menu!\n'));

    await logger.success('Configuration saved successfully');
    return config;
  } catch (error) {
    console.error(chalk.red(`\n❌ Error saving configuration: ${error.message}\n`));
    await logger.error(`Failed to save configuration: ${error.message}`);
    throw error;
  }
}

export default {
  configureApplication
};
