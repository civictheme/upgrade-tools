import { promises as fs } from 'fs';
import path from 'path';

/**
 *
 */


/**
 * An asynchronous function that performs a task or operation.
 * Typically used to handle asynchronous behavior, such as waiting for a promise
 * to resolve or interacting with asynchronous APIs.
 *
 * This function should be awaited using the `await` keyword inside an `async` function
 * or handled with its returned promise using `.then()` and `.catch()`.
 *
 * @async
 * @function async
 * @returns {Promise<any>} A promise that resolves when the operation is complete
 * or rejects if an error occurs.
 */
export async function getComponentDirectories(directoryPath = 'components') {
    directoryPath = path.join(process.cwd(), directoryPath);
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
        const fullPath = path.join(directoryPath, entry.name);
        if (entry.isDirectory()) {
            // Recursively search subdirectories
            return getAllComponentFiles(fullPath);
        }
        // Check if it's a twig file but not a stories.twig file
        if (entry.isFile()
            && entry.name.endsWith('.twig')
            && !entry.name.endsWith('.stories.twig')) {
            // Get the basename without extension
            const componentName = path.basename(entry.name, '.twig');
            // Get the directory path
            const componentDirectory = path.dirname(fullPath);
            // Return an object with the component name and directory
            return { [componentName]: componentDirectory };
        }
        return {};
    }));

    return files.flat().filter(obj => Object.keys(obj).length > 0)
        .reduce((acc, curr) => ({ ...acc, ...curr }), {});
}

export async function getAllComponentFiles(directoryPath) {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    if (typeof entries === 'undefined' || typeof entries === null || entries.length === 0) {
        return [];
    }
    const files = await Promise.all(entries.map(async (entry) => {
        const fullPath = path.join(directoryPath, entry.name);

        if (entry.isDirectory()) {
            // Recursively search subdirectories
            return getAllComponentFiles(fullPath);
        }

        // Check if it's a twig file but not a stories.twig file
        if (entry.isFile()
            && entry.name.endsWith('.twig')
            && !entry.name.endsWith('.stories.twig')) {
            return fullPath;
        }

        return [];
    }));

    // Flatten the array and remove empty entries
    return files.flat().filter(Boolean);
}



/**
 * Recursively finds JSON schema files to convert to component YML files.
 *
 * @param {string} basePath - Base directory to search from
 * @returns {[{componentName: string, filePath: string, directoryPath: string}]} - Schema files:
 *   - `componentName`: The name of the component (file name without the `.schema.json` extension).
 *   - `filePath`: The absolute path to the schema file.
 *   - `directoryPath`: The directory containing the schema file.
 */
export async function getAllSchemaFiles (basePath = path.join(process.cwd(), 'schema')) {
    const schemaFiles = {};
    const entries = await fs.readdir(basePath, {withFileTypes: true}); // Use `fs.promises` for async operations.

    for (const entry of entries) {
        const entryPath = path.join(basePath, entry.name);

        if (entry.isDirectory()) {
            // Recurse into the directory
            const childSchemaFiles = await getAllSchemaFiles(entryPath);
            Object.assign(schemaFiles, childSchemaFiles);
        } else if (entry.isFile() && entry.name.endsWith('.schema.json')) {
            const componentName = path.basename(entry.name, '.schema.json'); // Get the component name without extension
            schemaFiles[componentName] = {
                componentName,
                filePath: entryPath,
                directoryPath: path.dirname(entryPath)
            };
        }
    }

    return schemaFiles;
}
