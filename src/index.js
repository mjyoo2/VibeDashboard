import { readFile } from 'node:fs/promises';
import { parseUsageData, parseMultipleUsageData, processData, validateData, mergeUsageData, filterByPeriod } from './parser.js';
import { generate } from './generator.js';
import { updateReadme, writeSVG } from './updater.js';
import { mergeConfig } from './utils.js';

/**
 * Main generate function - orchestrates the entire dashboard generation
 * @param {object} options - Generation options
 * @param {string} options.configPath - Path to config file (optional)
 * @param {string|string[]} options.inputPath - Path(s) to cc.json file(s)
 * @param {string} options.outputPath - Path to README.md file
 * @param {string} options.svgPath - Path to save SVG file (optional)
 * @param {object} options.config - Direct config object (optional, overrides configPath)
 * @returns {Promise<object>} Result with success status and details
 */
export async function generateDashboard(options) {
  const { configPath, inputPath, outputPath, svgPath, config: directConfig } = options;

  // Load and merge config
  let config;
  try {
    config = await loadConfig(configPath, directConfig);
  } catch (error) {
    return { success: false, error: `Config error: ${error.message}` };
  }

  // Parse input data (supports single file or multiple files)
  let data;
  try {
    const inputPaths = Array.isArray(inputPath) ? inputPath : [inputPath];

    if (inputPaths.length === 1) {
      data = await parseUsageData(inputPaths[0]);
    } else {
      data = await parseMultipleUsageData(inputPaths);
    }

    // Apply period filter from config
    if (config.period && config.period !== 'all') {
      const filteredRaw = filterByPeriod(data.raw, config.period);
      data = processData(filteredRaw, config.period);
      data.sourceCount = inputPaths.length > 1 ? inputPaths.length : undefined;
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: false, error: `Input file not found: ${error.path || inputPath}` };
    }
    return { success: false, error: `Failed to parse input: ${error.message}` };
  }

  // Validate data
  const validation = validateData(data.raw);
  if (!validation.isValid) {
    return { success: false, error: `Invalid data: ${validation.errors.join(', ')}` };
  }

  // Generate output
  const { markdown, svg } = generate(data, config);

  // Determine what to put in README: image tag if SVG path provided, otherwise markdown
  let readmeContent;
  if (svgPath && svg) {
    // Use relative path for the image
    const svgFileName = svgPath.split('/').pop().split('\\').pop();
    readmeContent = `![Vibe Dashboard](./${svgFileName})`;
  } else {
    readmeContent = markdown;
  }

  // Update README
  const readmeResult = await updateReadme(outputPath, readmeContent);
  if (!readmeResult.success) {
    return { success: false, error: readmeResult.message };
  }

  // Write SVG if path provided and SVG generated
  let svgResult = null;
  if (svgPath && svg) {
    svgResult = await writeSVG(svgPath, svg);
    if (!svgResult.success) {
      console.warn(`Warning: ${svgResult.message}`);
    }
  }

  return {
    success: true,
    message: 'Dashboard generated successfully',
    details: {
      readme: readmeResult.message,
      svg: svgResult?.message || 'SVG not generated',
      sources: Array.isArray(inputPath) ? inputPath.length : 1,
      period: config.period || 'all'
    }
  };
}

/**
 * Load configuration from file and/or merge with defaults
 * @param {string} configPath - Path to config file (optional)
 * @param {object} directConfig - Direct config object (optional)
 * @returns {Promise<object>} Merged configuration
 */
async function loadConfig(configPath, directConfig = {}) {
  let fileConfig = {};

  if (configPath) {
    try {
      const content = await readFile(configPath, 'utf-8');
      fileConfig = JSON.parse(content);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw new Error(`Failed to load config: ${error.message}`);
      }
      // Config file not found - use defaults
    }
  }

  // Direct config overrides file config
  const userConfig = { ...fileConfig, ...directConfig };
  return mergeConfig(userConfig);
}

/**
 * Generate dashboard from raw data object (without file I/O)
 * @param {object} rawData - Raw ccusage data or array of data objects
 * @param {object} config - Configuration options
 * @returns {object} Generated content { markdown, svg }
 */
export function generateFromData(rawData, config = {}) {
  const mergedConfig = mergeConfig(config);

  let mergedData;
  if (Array.isArray(rawData)) {
    mergedData = mergeUsageData(rawData);
  } else {
    mergedData = rawData;
  }

  // Apply period filter
  const filteredData = filterByPeriod(mergedData, mergedConfig.period || 'all');
  const data = processData(filteredData, mergedConfig.period);

  if (Array.isArray(rawData) && rawData.length > 1) {
    data.sourceCount = rawData.length;
  }

  return generate(data, mergedConfig);
}

// Re-export utilities for external use
export { mergeConfig, getDefaultConfig, getPeriodRange } from './utils.js';
export { processData, validateData, mergeUsageData, filterByPeriod, parseMultipleUsageData } from './parser.js';
export { generate, generateMarkdown, generateSVG } from './generator.js';
export { updateReadme, hasMarkers, addMarkers } from './updater.js';

export default {
  generateDashboard,
  generateFromData
};
