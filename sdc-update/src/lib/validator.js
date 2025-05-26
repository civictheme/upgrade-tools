/**
 * @file
 * Validators for SDC update tool.
 *
 * Provides functions to validate the subtheme directory.
 */
import fs from 'fs/promises';
import path from 'path';
import logger from './logger.js';

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
 * @return {Promise<{valid: boolean, message: string, details: Object}>} Validation result, message and detailed status
 */
export async function validateSubThemeDirectory(dirPath) {
  try {
    // Log validation attempt
    await logger.info(`Validating directory: ${dirPath}`);

    // Get the directory name from path
    const dirName = path.basename(dirPath);

    // Prepare validation results object
    const validationResults = {
      hasInfoYml: false,
      hasComponentsDir: false,
      hasName: false,
      isThemeType: false,
      hasCivicThemeBase: false
    };

    // Check for the .info.yml file
    const infoYmlPath = path.join(dirPath, `${dirName}.info.yml`);

    try {
      await fs.access(infoYmlPath);
      validationResults.hasInfoYml = true;
      await logger.debug(`Found ${dirName}.info.yml file`);
    } catch (error) {
      await logger.warning(`Could not find ${dirName}.info.yml file: ${error.message}`);
      return {
        valid: false,
        message: `Could not find ${dirName}.info.yml file in the directory. This doesn't appear to be a valid Drupal theme.`,
        details: validationResults
      };
    }

    // Check for components directory
    const componentsPath = path.join(dirPath, 'components');
    try {
      await fs.access(componentsPath);
      const componentsStat = await fs.stat(componentsPath);
      validationResults.hasComponentsDir = componentsStat.isDirectory();

      if (validationResults.hasComponentsDir) {
        await logger.debug('Found components directory');
      } else {
        await logger.warning('Components path exists but is not a directory');
      }
    } catch (error) {
      await logger.warning(`Could not access components directory: ${error.message}`);
      validationResults.hasComponentsDir = false;
    }

    // Read and validate the YAML content
    try {
      const ymlContent = await fs.readFile(infoYmlPath, 'utf8');
      await logger.debug('Successfully read .info.yml file');

      // Simple YAML content checks - look for required fields
      validationResults.hasName = ymlContent.includes('name:');
      validationResults.isThemeType = ymlContent.includes('type: theme');
      validationResults.hasCivicThemeBase = ymlContent.includes('base theme: civictheme');

      await logger.debug(`YAML validation - name: ${validationResults.hasName}, type: ${validationResults.isThemeType}, base: ${validationResults.hasCivicThemeBase}`);
    } catch (error) {
      await logger.error(`Failed to read or parse .info.yml file: ${error.message}`);
      return {
        valid: false,
        message: `Failed to read or parse ${dirName}.info.yml file: ${error.message}`,
        details: validationResults
      };
    }

    // Check if all required conditions are met
    const isValid =
      validationResults.hasInfoYml &&
      validationResults.hasName &&
      validationResults.isThemeType &&
      validationResults.hasCivicThemeBase &&
      validationResults.hasComponentsDir;

    if (!isValid) {
      const message = `The directory does not appear to be a valid CivicTheme sub-theme:
${!validationResults.hasName ? '❌ Missing "name:" field in .info.yml' : '✅ Has name field in .info.yml'}
${!validationResults.isThemeType ? '❌ Missing or incorrect "type: theme" field in .info.yml' : '✅ Has correct type field in .info.yml'}
${!validationResults.hasCivicThemeBase ? '❌ Missing or incorrect "base theme: civictheme" field in .info.yml' : '✅ Has correct base theme field in .info.yml'}
${!validationResults.hasComponentsDir ? '❌ Missing components directory (required for Storybook stories)' : '✅ Has components directory'}`;

      await logger.warning(`Validation failed: ${message}`);
      return {
        valid: false,
        message,
        details: validationResults
      };
    }

    await logger.success(`Successfully validated CivicTheme sub-theme directory: ${dirPath}`);
    return {
      valid: true,
      message: `✅ Valid CivicTheme sub-theme directory with components folder`,
      details: validationResults
    };
  } catch (error) {
    await logger.error(`Validation error: ${error.message}`);
    return {
      valid: false,
      message: `Error validating directory: ${error.message}`,
      details: {}
    };
  }
}

/**
 * Searches for directories that match a given input string
 *
 * @param {string} input - String to search for in directory paths
 * @returns Array<{name: string, value: string}>> - Array of matching directories
 */
export async function searchDirectories(input = '') {
  const currentDir = process.cwd();

  // Start with the current directory
  const suggestions = [
    { name: currentDir, value: currentDir }
  ];

  // If there's input, check if it's a valid path
  if (input) {
    const normalizedInput = path.normalize(input);
    try {
      const stats = await fs.stat(normalizedInput);
      if (stats.isDirectory()) {
        suggestions.push({ name: normalizedInput, value: normalizedInput });

        // Try to list subdirectories
        try {
          const entries = await fs.readdir(normalizedInput, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const subDirPath = path.join(normalizedInput, entry.name);
              suggestions.push({ name: subDirPath, value: subDirPath });
            }
          }
        } catch (_error) {
          // Ignore errors when listing subdirectories
        }
      }
    } catch (_error) {
      // Path doesn't exist or can't be accessed
      // Try to suggest based on parent directory
      try {
        const parentDir = path.dirname(normalizedInput);
        const stats = await fs.stat(parentDir);
        if (stats.isDirectory()) {
          const entries = await fs.readdir(parentDir, { withFileTypes: true });
          const basename = path.basename(normalizedInput);
          for (const entry of entries) {
            if (entry.isDirectory() && entry.name.includes(basename)) {
              const subDirPath = path.join(parentDir, entry.name);
              suggestions.push({ name: subDirPath, value: subDirPath });
            }
          }
        }
      } catch (_error) {
        // Ignore errors when working with parent directory
      }
    }
  }

  return suggestions;
}

export default {
  validateSubThemeDirectory,
  searchDirectories
};
