
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
// import dotenv from 'dotenv';
import { LlmHandler } from './lib/llm-handler.mjs';
import { getAllComponentFiles } from './lib/components.mjs';

const SYSTEM_PROMPT = `
You are a Drupal Single Directory Components (SDC) analyzer. For each Twig template provided:
1. Extract all documented variables/props
2. Return the data in Drupal SDC YAML format with this exact structure:

\`\`\`yaml
$schema: https://git.drupalcode.org/project/drupal/-/raw/10.3.x/core/assets/schemas/v1/metadata.schema.json
name: Component Name
status: stable
description: Component description
replaces: civictheme:component_name # Only include for overridden components
props:
  type: object
  properties:
    # Extract all props here with their types and descriptions
    example_prop:
      type: string
      title: Example Prop
      description: Description of the prop
      default: default value # if applicable
    another_prop:
      type: boolean
      title: Another Prop
      description: Description of this prop
slots:
  # Only include if the original CivicTheme component has slots
  example_slot:
    title: Example Slot
    description: Description of what this slot is for
libraryOverrides:
  # Only include if component has JS/CSS files
  js:
    component-name.js: {}
\`\`\`

Rules:
- Use proper YAML format (not JSON)
- Use valid JSON Schema types in props (string, boolean, number, integer, array, object)
- DO NOT convert Twig blocks to slots - only include slots if they exist in the original CivicTheme schema
- Include all documented properties and their descriptions
- Only return valid YAML, no additional text
- DO NOT wrap the YAML in markdown code blocks (no \`\`\`yaml or \`\`\`)
- Return the raw YAML content directly
- Extract component name from filename or comments if available
- Set status to "stable" by default
- Only include libraryOverrides if you detect that the component has associated JS files
- For arrays, include the items type
- For enums, list all possible values
- When overriding an existing component:
  - Start with the original schema as a base
  - Include replaces property with format: civictheme:component_name (where component_name is the machine name from the filename)
  - Remove props that are not referenced in the custom template
  - Add new props that are used in the custom template
  - Preserve slots ONLY if they exist in the original schema
  - Preserve the structure and naming conventions of the original
  - Update descriptions to reflect customizations
- For new components (not overrides):
  - Only include props, no slots section
  - Focus on extracting all variables used in the template
`;

class JsonSchemaGenerator extends LlmHandler {
  /**
   * Strips markdown code blocks from YAML content
   * @param {string} content - The content that may contain code blocks
   * @return {string} - The content without code blocks
   */
  stripCodeBlocks(content) {
    // Remove ```yaml or ```yml at the start and ``` at the end
    return content.replace(/^```(?:yaml|yml)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  }

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
          // Save component.yml in the same directory as the twig file
          const outputPath = file.replace('.twig', '.component.yml');

          if (await this.isComponentAlreadyProcessed(outputPath)) {
            console.log(`Skipping ${file}... already processed`);
            continue;
          }

          const templateContent = await fs.readFile(file, 'utf8');

          console.log(`Processing ${file}...`);

          // Check if this is an override of a CivicTheme component
          const componentPath = path.relative(directoryPath, file);
          const civicThemeComponentPath = path.join(
            process.cwd(),
            'monorepo-drupal/web/themes/contrib/civictheme/components',
            componentPath.replace('.twig', '.component.yml')
          );

          let existingSchema = null;
          try {
            existingSchema = await fs.readFile(civicThemeComponentPath, 'utf8');
            console.log(`  Found existing CivicTheme schema for ${path.basename(file)}`);
          } catch (e) {
            // No existing schema, this is a new component
          }

          let userContent;
          if (existingSchema) {
            userContent = `This component is overriding an existing CivicTheme component. Here is the original schema:

${existingSchema}

Analyze this custom Twig template and generate an updated Drupal SDC YAML schema:
- Remove any props that are not used in this custom template
- Add any new props that are used in this custom template
- Update descriptions to reflect any changes in functionality
- Keep the same structure and format as the original

Custom Twig template:
${templateContent}`.trim();
          } else {
            userContent = `Extract the props and blocks from this Twig template and generate a Drupal SDC YAML schema:\n\n${templateContent}`.trim();
          }

          const messages = [
            {
              role: 'user',
              content: userContent,
            },
          ];

          let yamlSchema = await this.analyze(messages);

          // Strip any markdown code blocks that might have been added
          yamlSchema = this.stripCodeBlocks(yamlSchema);

          // Validate YAML by parsing it
          const parsedYaml = yaml.load(yamlSchema);

          // If this is an override, ensure replaces property exists and handle slots
          if (existingSchema) {
            const componentName = path.basename(file, '.twig');
            const existingParsedYaml = yaml.load(existingSchema);

            // Ensure replaces property exists
            if (!parsedYaml.replaces) {
              parsedYaml.replaces = `civictheme:${componentName}`;
            }

            // Check if existing schema has slots
            if (existingParsedYaml.slots && Object.keys(existingParsedYaml.slots).length > 0) {
              // Initialize slots if not present
              if (!parsedYaml.slots) {
                parsedYaml.slots = {};
              }

              // Check each slot from the original schema
              for (const [slotName, slotData] of Object.entries(existingParsedYaml.slots)) {
                // If this slot was incorrectly added as a prop, move it to slots
                if (parsedYaml.props?.properties && parsedYaml.props.properties[slotName]) {
                  console.log(`  Moving ${slotName} from props to slots`);

                  // Copy to slots with proper format
                  parsedYaml.slots[slotName] = {
                    title: slotData.title || slotName.charAt(0).toUpperCase() + slotName.slice(1).replace(/_/g, ' '),
                    description: slotData.description || parsedYaml.props.properties[slotName].description || ''
                  };

                  // Remove from props
                  delete parsedYaml.props.properties[slotName];
                }
                // If slot exists in original but not in generated, preserve it
                else if (!parsedYaml.slots[slotName]) {
                  parsedYaml.slots[slotName] = slotData;
                }
              }

              // Clean up empty props object if needed
              if (parsedYaml.props?.properties && Object.keys(parsedYaml.props.properties).length === 0) {
                delete parsedYaml.props;
              }
            }

            // Re-serialize if we made changes
            yamlSchema = yaml.dump(parsedYaml, { lineWidth: -1 });
          }

          // Save YAML directly
          await this.output(yamlSchema, outputPath);

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
}

// Usage example
/**
 * Main function initialising the script.
 */
async function main() {
  // dotenv.config();

  const analyzer = new JsonSchemaGenerator({
    system_prompt: SYSTEM_PROMPT,
    inputDir: path.join(process.env.SUBTHEME_DIRECTORY, 'components'),
    rateLimit: 3,
    rateLimitInterval: 1000,
    processLimit: 100,
    max_tokens: 8192,
    model: process.env.ANTHROPIC_MODEL,
    cache_control: true,
  });
  const componentPath = path.join(process.env.SUBTHEME_DIRECTORY, 'components');
  analyzer.process(componentPath);
  analyzer.report();
}

main().catch(console.error);
