// import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getAllSchemaFiles, getAllComponentFiles } from './lib/components.js';

/**
 * Converts a JSON Schema object to a Drupal SDC Schema structure
 * @param {string} componentName - The name of the component
 * @param {string} componentDirectory - The path to the component directory
 @param {Object} jsonSchema - The JSON Schema object to convert

 * @returns {Object} - The SDC Schema structure (ready to be converted to YAML)
 */
async function convertJsonSchemaToSDCSchema(componentName, componentDirectory, jsonSchema) {
    const sdcSchema = {
        $schema: 'https://git.drupalcode.org/project/drupal/-/raw/10.3.x/core/assets/schemas/v1/metadata.schema.json'
    };

    // Handle metadata
    if (jsonSchema.properties?.metadata?.properties) {
        const metadata = jsonSchema.properties.metadata.properties;

        if (metadata.name?.description) {
            sdcSchema.name = metadata.name.description;
        }

        // Default to experimental status if not specified
        sdcSchema.status = 'experimental';

        // Add description if available
        if (metadata.description?.description) {
            sdcSchema.description = metadata.description.description;
        }
    }

    // Handle props
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
    }
    catch {
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

// dotenv.config();
const componentPath = path.join(process.env.CIVICTHEME_UIKIT_PATH, 'components');
const schemaFiles = await getAllSchemaFiles();
const components = await getAllComponentFiles(componentPath);
const componentDirectories = {};
components.forEach(component => {
    const componentName = path.basename(component, '.twig');
    componentDirectories[componentName] = path.dirname(component);
});
// Example usage:
for (const [componentName, componentDirectory] of Object.entries(componentDirectories)) {
    if (schemaFiles[componentName]) {
        const schemaFilePath = schemaFiles[componentName].filePath;
        const schemaDirectory = schemaFiles[componentName].directoryPath;
        let schemaFile = await fs.readFile(schemaFilePath, 'utf8');
        try {
            schemaFile = JSON.parse(schemaFile);
            let sdcSchema = await convertJsonSchemaToSDCSchema(componentName, componentDirectory, schemaFile);
            const yml = yaml.dump(sdcSchema);
            const outputPath = path.join(schemaDirectory, `${componentName}.component.yml`);
            await fs.writeFile(outputPath, yml, 'utf8');
            console.log(`Successfully converted ${componentName} to ${outputPath}`);
        }
        catch (e) {
            console.error(e);
        }
    }
}
