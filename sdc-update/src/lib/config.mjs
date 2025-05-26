/**
 * @file
 * Configuration module for SDC update tool.
 *
 * Handles loading and saving configuration from .env file.
 */
import fs from 'fs/promises';
import dotenv from 'dotenv';
// Path not currently used but may be needed for future file operations
import _path from 'path';

// Default config file location
const ENV_FILE_PATH = '.env';

/**
 * Load configuration from .env file
 *
 * @returns {Object} Configuration object with key-value pairs from .env file
 */
export async function loadConfig() {
  try {
    await fs.access(ENV_FILE_PATH);
    // Parse .env file
    const envConfig = dotenv.config({ path: ENV_FILE_PATH });

    if (envConfig.error) {
      throw new Error(`Error parsing .env file: ${envConfig.error.message}`);
    }

    return {
      subthemeDirectory: process.env.SUBTHEME_DIRECTORY || '',
      anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
      anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      configExists: true
    };
  } catch (error) {
    // If .env file doesn't exist or can't be accessed, return default values
    if (error.code === 'ENOENT') {
      return {
        subthemeDirectory: '',
        anthropicApiKey: '',
        anthropicModel: 'claude-3-5-sonnet-20241022',
        configExists: false
      };
    }
    throw error;
  }
}

/**
 * Save configuration to .env file
 *
 * @param {Object} config Configuration object with keys to save to .env file
 * @returns {Promise<void>}
 */
export async function saveConfig(config) {
  const { subthemeDirectory, anthropicApiKey, anthropicModel } = config;

  // Prepare .env content
  const envContent = `SUBTHEME_DIRECTORY=${subthemeDirectory || ''}
ANTHROPIC_API_KEY=${anthropicApiKey || ''}
ANTHROPIC_MODEL=${anthropicModel || 'claude-3-5-sonnet-20241022'}`;

  // Write to .env file
  await fs.writeFile(ENV_FILE_PATH, envContent, 'utf8');
}

/**
 * Check if configuration exists and is valid
 *
 * @returns {Promise<{valid: boolean, message: string}>} Validation result and message
 */
export async function validateConfig() {
  const config = await loadConfig();

  if (!config.configExists) {
    return {
      valid: false,
      message: 'Configuration file not found. Please configure the application first.'
    };
  }

  if (!config.subthemeDirectory) {
    return {
      valid: false,
      message: 'Subtheme directory not configured. Please configure the application first.'
    };
  }

  if (!config.anthropicApiKey) {
    return {
      valid: false,
      message: 'Anthropic API key not configured. Please configure the application first.'
    };
  }

  try {
    await fs.access(config.subthemeDirectory);
  } catch (error) {
    return {
      valid: false,
      message: `Cannot access subtheme directory: ${error.message}`
    };
  }

  return { valid: true, message: 'Configuration is valid' };
}

export default {
  loadConfig,
  saveConfig,
  validateConfig
};
