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