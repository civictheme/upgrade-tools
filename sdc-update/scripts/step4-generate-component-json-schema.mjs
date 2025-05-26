
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
// import dotenv from 'dotenv';
import { LlmHandler } from './lib/llm-handler.mjs';
import { getAllComponentFiles } from './lib/components.mjs';

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

class JsonSchemaGenerator extends LlmHandler {
  /**
   * Whether the component has already been processed.
   *
   * @param outputPath
   * @return {Promise<boolean>}
   */

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
      };
      const twigFiles = await getAllComponentFiles(directoryPath);
      let processed = 0;
      for (const file of twigFiles) {
        try {
          const relativePath = path.relative(directoryPath, file);
          const outputPath = path.join(
            this.options.outputDir,
            relativePath.replace('.twig', '.component.yml'),
          );

          if (await this.isComponentAlreadyProcessed(outputPath)) {
            console.log(`Skipping ${file}... already processed`);
            continue;
          }

          const templateContent = await fs.readFile(file, 'utf8');

          console.log(`Processing ${file}...`);


          const messages = [
            {
              role: 'user',
              content: `Extract the props and blocks from this Twig template into JSON:\n\n${templateContent}`.trim(),
            },
          ];

          const jsonSchema = await this.analyze(messages);

          // Validate and parse JSON
          const parsedJsonSchema = JSON.parse(jsonSchema);
          
          // Extract component name and directory
          const componentName = path.basename(file, '.twig');
          const componentDirectory = path.dirname(file);
          
          // Convert to SDC schema
          const sdcSchema = await this.convertJsonSchemaToSDCSchema(componentName, componentDirectory, parsedJsonSchema);
          
          // Save YAML version only
          const yamlOutputPath = outputPath.replace('.schema.json', '.component.yml');
          const yamlContent = yaml.dump(sdcSchema, { lineWidth: -1 });
          await this.output(yamlContent, yamlOutputPath);
          
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

  async output(outputFileContent, outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    await fs.writeFile(outputPath, outputFileContent, 'utf8');
  }


  /**
   * Converts a JSON Schema object to a Drupal SDC Schema structure
   * @param {string} componentName - The name of the component
   * @param {string} componentDirectory - The path to the component directory
   @param {Object} jsonSchema - The JSON Schema object to convert

   * @returns {Object} - The SDC Schema structure (ready to be converted to YAML)
   */
  async convertJsonSchemaToSDCSchema(componentName, componentDirectory, jsonSchema) {
    const sdcSchema = {
      $schema: 'https://git.drupalcode.org/project/drupal/-/raw/10.3.x/core/assets/schemas/v1/metadata.schema.json'
    };

    // Handle metadata
    if (jsonSchema.properties?.metadata?.properties) {
      const metadata = jsonSchema.properties.metadata.properties;

      if (metadata.name?.description) {
        sdcSchema.name = metadata.name.description;
      }

      sdcSchema.status = 'stable';

      if (metadata.description?.description) {
        sdcSchema.description = metadata.description.description;
      }
    }

    if (jsonSchema.properties?.props?.properties) {
      sdcSchema.props = {
        type: 'object',
        properties: {}
      };

      const props = jsonSchema.properties.props.properties;

      // Convert each property
      Object.entries(props).forEach(([key, value]) => {
        sdcSchema.props.properties[key] = {
          type: value.type,
          title: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize first letter
          description: value.description
        };

        // Handle enums
        if (value.enum) {
          sdcSchema.props.properties[key].enum = value.enum;
        }

        // Handle default values
        if (value.default !== undefined) {
          sdcSchema.props.properties[key].default = value.default;
        }

        // Handle arrays
        if (value.type === 'array' && value.items) {
          sdcSchema.props.properties[key].items = {
            type: value.items.type
          };

          // If array items have properties (for objects)
          if (value.items.properties) {
            sdcSchema.props.properties[key].items.properties = value.items.properties;
          }
        }
      });
    }

    // Handle slots
    if (jsonSchema.properties?.slots?.properties) {
      sdcSchema.slots = {};

      Object.entries(jsonSchema.properties.slots.properties).forEach(([key, value]) => {
        sdcSchema.slots[key] = {
          title: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '), // Capitalize and format slot name
          description: value.description,
        };
      });
    }

    // Check for component JS file and add to library overrides if it exists
    const jsFilePath = path.join(componentDirectory, `${componentName}.js`);
    try {
      await fs.access(jsFilePath);
      sdcSchema.libraryOverrides = {
        js: {
          [`${componentName}.js`]: {}
        }
      };
    } catch {
      // no JS library
    }

    // Merge with existing library overrides if present in the JSON schema
    if (jsonSchema.properties?.libraryOverrides?.properties) {
      sdcSchema.libraryOverrides = {
        ...sdcSchema.libraryOverrides,
        ...jsonSchema.properties.libraryOverrides.properties
      };
    }

    return sdcSchema;
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
