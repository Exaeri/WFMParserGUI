import { promises as fs } from 'fs';

/**
 * Saves data to a JSON file.
 *
 * @param {Object|Array} dataToSave - Data to save (object or array).
 * @param {string} path - Directory where the file should be saved.
 * @param {string} fileName - File name.
 * @returns {Promise<void>}
 *
 * @throws {Error} If arguments have invalid types.
 */
export async function fileOutput(dataToSave, path, fileName) {
    if (typeof dataToSave !== 'object' || dataToSave === null)
        throw new Error('Data to save must be an object');

    if (typeof path !== 'string')
        throw new Error('Path must be string');

    if (typeof fileName !== 'string')
        throw new Error('File name must be string');

    const jsonString = JSON.stringify(dataToSave, null,2);

    try {
        await fs.mkdir(path, { recursive: true });
        await fs.writeFile(`${path}/${fileName}.json`, jsonString);
        console.log(`Output file created: ${fileName}.json `);
    } catch (err) {
        console.error('Error writing to the file:', err);
    }
}

/**
 * Sorts an object by its values.
 *
 * @param {Record<string, number>} obj - Object with numeric values.
 * @param {boolean} [desc=true] - Sort descending if true.
 * @returns {Record<string, number>} New sorted object.
 */
export function sortByValues(obj, desc = true) {
    return Object.fromEntries(
        Object.entries(obj).sort((a, b) => desc ? b[1] - a[1] : a[1] - b[1])
    );
}


/**
 * Reads and parses a JSON file.
 *
 * @param {string} filePath - Path to the JSON file.
 * @returns {Promise<Object>} Parsed JSON object.
 *
 * @throws {Error} If file cannot be read or JSON is invalid.
 */
export async function readJSON(filePath) {
    if (typeof filePath !== 'string')
        throw new Error('filePath must be a string');

    const data = await fs.readFile(filePath, 'utf-8');

    try {
        return JSON.parse(data);
    } catch (err) {
        throw new Error(`Invalid JSON in file ${filePath}`);
    }
}
