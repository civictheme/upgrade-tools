/* eslint-disable no-console */
import { promises as fs } from 'fs';
import path from 'path';
// import dotenv from 'dotenv';
// eslint-disable-next-line import/extensions
import { LLMHandler } from './lib/llm-handler.js';
// eslint-disable-next-line import/extensions
import { getAllComponentFiles } from './lib/components.js';

const SYSTEM_PROMPT = `
You are a Twig template analyzer. For each Twig template provided:
1. Extract all documented variables/props and blocks
2. Return the data in JSON Schema format with this exact structure:
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ComponentName",
  "type": "object",
  "properties": {
    "metadata": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "description": "Component name"
        },
        "description": {
          "type": "string",
          "description": "Component description"
        },
        "version": {
          "type": "string",
          "default": "1.9.0"
        },
        "framework": {
          "type": "string",
          "enum": ["twig"]
        }
      }
    },
    "props": {
      "type": "object",
      "properties": {
        // Extract all props here with their types and descriptions
      }
    },
    "slots": {
      "type": "object",
      "properties": {
        // Extract all Twig blocks here as slots
      }
    }
  }
}

Rules:
- Use proper JSON Schema types (string, boolean, number, array, object)
- Use "unknown" for types that cannot be determined
- Convert Twig blocks to slots in the schema
- Include all documented properties and their descriptions
- Only return valid JSON Schema, no additional text
- Extract component name from filename or comments if available
`;

class JsonSchemaGenerator extends LLMHandler {

  /**
   * Whether the component has already been processed.
   *
   * @param outputPath
   * @return {Promise<boolean>}
   */
  // eslint-disable-next-line class-methods-use-this
  async isComponentAlreadyProcessed(outputPath) {
    try {
      await fs.access(outputPath, fs.constants.F_OK);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Create JSON schema from component files.
   *
   * @param {string} directoryPath - Directory to component directory.
   * @return {Promise<Object>} Report on success / failures of process.
   */
  async process(directoryPath) {
    try {
      this.results = {
        successful: [],
        failed: [],
      }
      const twigFiles = await getAllComponentFiles(directoryPath);
      let processed = 0;
      for (const file of twigFiles) {
        try {
          const relativePath = path.relative(directoryPath, file);
          const outputPath = path.join(
            this.options.outputDir,
            relativePath.replace('.twig', '.schema.json'),
          );
          // eslint-disable-next-line no-await-in-loop
          if (await this.isComponentAlreadyProcessed(outputPath)) {
            console.log(`Skipping ${file}... already processed`);
            continue;
          }
          // eslint-disable-next-line no-await-in-loop
          const templateContent = await fs.readFile(file, 'utf8');

          console.log(`Processing ${file}...`);

          // eslint-disable-next-line no-await-in-loop
          const messages = [
            {
              role: 'user',
              content: `Extract the props and blocks from this Twig template into JSON:\n\n${templateContent}`.trim(),
            },
          ];
          // eslint-disable-next-line no-await-in-loop
          const jsonSchema = await this.analyze(messages);

          // Validate JSON
          JSON.parse(jsonSchema); // Will throw if invalid JSON
          // eslint-disable-next-line no-await-in-loop
          await this.output(jsonSchema, outputPath);
          this.results.successful.push(file);
          console.log(`✓ Successfully processed ${file}`);
        } catch (error) {
          this.results.failed.push({ file, error: error.message });
          console.error(`✗ Failed to process ${file}: ${error.message}`);
        }
        processed += 1;
        if (this.options.processLimit <= processed) {
          return this.results;
        }
      }
    } catch (error) {
      console.error('Directory processing error:', error);
    }

    return this.results;
  }

  /**
   * Output the file.
   *
   * @param outputFileContent - content to be saved to file.
   * @param outputPath - path to save the file.
   * @return {Promise<void>}
   */
  // eslint-disable-next-line class-methods-use-this
  async output(outputFileContent, outputPath) {
    // eslint-disable-next-line no-await-in-loop
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    // eslint-disable-next-line no-await-in-loop
    await fs.writeFile(outputPath, outputFileContent, 'utf8');
  }
}

// Usage example
/**
 * Main function initialising the script.
 */
async function main() {
  // dotenv.config();

  const analyzer = new JsonSchemaGenerator({
    system_prompt: SYSTEM_PROMPT,
    outputDir: path.join(process.cwd(), 'schema'),
    inputDir: path.join(process.env.CIVICTHEME_UIKIT_PATH, 'components'),
    rateLimit: 3,
    rateLimitInterval: 1000,
    processLimit: 100,
    max_tokens: 8192,
    model: process.env.ANTHROPIC_MODEL,
    cache_control: true,
  });

  analyzer.process('components');
  analyzer.report();
}

main().catch(console.error);
