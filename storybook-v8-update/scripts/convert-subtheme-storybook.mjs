/**
 * Script to upgrade Storybook v6 stories to v8 format.
 *
 * This module:
 * 1. Reads a prompt file containing conversion rules
 * 2. Finds all .stories.js files in the target directory
 * 3. Processes each file through Claude AI to convert to v8 format
 * 4. Overwrites the original files with the converted content
 * 
 * @module convert-subtheme-storybook
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

/**
 * The content of the prompt file that contains instructions for the AI
 * @type {string}
 */
const promptData = fs.readFileSync(path.resolve('./scripts/prompt-storybook-v8.md'), 'utf8');

/**
 * The directory containing the component stories to be converted
 * @type {string}
 */
const targetDir = `${process.env.SUBTHEME_DIRECTORY}/components/`;

/**
 * Recursively finds all story files in the given directory
 * 
 * Searches through the directory and its subdirectories for files
 * that end with .stories.js, which are Storybook story files.
 * 
 * @param {string} dir - The directory to search in
 * @return {Array<string>} Array of paths to story files
 */
function findStoriesFiles(dir) {
  const results = [];
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results.push(...findStoriesFiles(filePath));
    } else if (file.endsWith('.stories.js')) {
      results.push(filePath);
    }
  });
  return results;
}

/**
 * Processes story files by sending them to Claude AI for conversion
 * 
 * For each story file, reads its content and sends it to the Claude API
 * along with conversion instructions. The API response is then used to
 * overwrite the original file with the updated format.
 * 
 * @async
 * @param {Array<string>} storiesFiles - Array of paths to story files
 * @return {Promise<void>} Resolves when all files have been processed
 */
async function processStoriesFiles(storiesFiles) {
  for (const filePath of storiesFiles) {
    console.log(`Processing ${filePath}`);
    const fileData = fs.readFileSync(filePath, 'utf8');
    try {
      const postData = {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 8192,
          messages: [
            { role: 'user', content: promptData },
            { role: 'user', content: fileData },
          ]
        })
      };
      
      // Make API request to Claude
      const response = await fetch('https://api.anthropic.com/v1/messages', postData);
      const data = await response.json();
      
      // Validate response before writing to file
      if (data.content && data.content[0] && data.content[0].text) {
        // Got data - let's overwrite the original file
        fs.writeFileSync(filePath, data.content[0].text);
        console.log(chalk.green(`✨ Processed ${filePath}`));
      } else {
        console.error(chalk.red(`❌ Invalid response for ${chalk.yellow(filePath)}: ${JSON.stringify(data)}`));
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error processing ${chalk.yellow(filePath)}: ${chalk.dim(error.message)}`));
    }
  }
}

/**
 * Main entry point for the story conversion process
 * 
 * Finds all story files in the target directory and processes them
 * through the AI for conversion to the new format.
 * 
 * @async
 * @return {Promise<void>} Resolves when all files have been processed
 */
async function convertStories() {
  const storiesFiles = findStoriesFiles(targetDir);
  if (storiesFiles.length === 0) {
    console.log(chalk.yellow(`⚠️ No story files found in ${targetDir}`));
    return;
  }
  
  console.log(chalk.blue(`🔍 Found ${storiesFiles.length} story files to process`));
  await processStoriesFiles(storiesFiles);
  console.log(chalk.green(`✅ Finished processing ${storiesFiles.length} story files`));
}

export default convertStories;
