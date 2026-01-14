import { readFile } from 'node:fs/promises';
import { calculatePercentage, shortenModelName, getPeriodRange, isDateInRange } from './utils.js';

/**
 * Transform ccusage raw format to internal format
 * @param {object} rawData - Raw ccusage data with daily[] and totals{}
 * @returns {object} Transformed data for internal use
 */
export function transformCcusageFormat(rawData) {
  // If already in internal format, return as-is
  if (rawData.totalCost !== undefined && !rawData.daily) {
    return rawData;
  }

  // Transform from ccusage format (daily[], totals{}) to internal format
  const daily = rawData.daily || [];
  const totals = rawData.totals || {};

  const byDay = {};
  const byModel = {};

  for (const day of daily) {
    byDay[day.date] = {
      cost: day.totalCost || 0,
      tokens: day.totalTokens || 0
    };

    // Aggregate model breakdowns
    if (day.modelBreakdowns) {
      for (const model of day.modelBreakdowns) {
        const modelName = model.modelName;
        if (!byModel[modelName]) {
          byModel[modelName] = {
            cost: 0,
            inputTokens: 0,
            outputTokens: 0
          };
        }
        byModel[modelName].cost += model.cost || 0;
        byModel[modelName].inputTokens += model.inputTokens || 0;
        byModel[modelName].outputTokens += model.outputTokens || 0;
      }
    }
  }

  return {
    totalCost: totals.totalCost || 0,
    totalInputTokens: totals.inputTokens || 0,
    totalOutputTokens: totals.outputTokens || 0,
    totalCacheCreationInputTokens: totals.cacheCreationTokens || 0,
    totalCacheReadInputTokens: totals.cacheReadTokens || 0,
    byModel,
    byDay
  };
}

/**
 * Parse ccusage JSON data from file
 * @param {string} jsonPath - Path to the cc.json file
 * @returns {Promise<object>} Parsed usage data
 */
export async function parseUsageData(jsonPath) {
  const content = await readFile(jsonPath, 'utf-8');
  const rawData = JSON.parse(content);
  const data = transformCcusageFormat(rawData);
  return processData(data);
}

/**
 * Parse and merge multiple ccusage JSON files
 * @param {string[]} jsonPaths - Array of paths to cc.json files
 * @returns {Promise<object>} Merged and processed usage data
 */
export async function parseMultipleUsageData(jsonPaths) {
  const dataArray = await Promise.all(
    jsonPaths.map(async (path) => {
      const content = await readFile(path, 'utf-8');
      const rawData = JSON.parse(content);
      return transformCcusageFormat(rawData);
    })
  );

  const merged = mergeUsageData(dataArray);
  const processed = processData(merged);
  processed.sourceCount = dataArray.length;
  return processed;
}

/**
 * Merge multiple ccusage data objects into one
 * @param {object[]} dataArray - Array of raw ccusage data objects
 * @returns {object} Merged raw data
 */
export function mergeUsageData(dataArray) {
  if (!dataArray || dataArray.length === 0) {
    return {
      totalCost: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCacheCreationInputTokens: 0,
      totalCacheReadInputTokens: 0,
      byModel: {},
      byDay: {}
    };
  }

  if (dataArray.length === 1) {
    return dataArray[0];
  }

  const merged = {
    totalCost: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheCreationInputTokens: 0,
    totalCacheReadInputTokens: 0,
    byModel: {},
    byDay: {}
  };

  for (const data of dataArray) {
    // Sum totals
    merged.totalCost += data.totalCost || 0;
    merged.totalInputTokens += data.totalInputTokens || 0;
    merged.totalOutputTokens += data.totalOutputTokens || 0;
    merged.totalCacheCreationInputTokens += data.totalCacheCreationInputTokens || 0;
    merged.totalCacheReadInputTokens += data.totalCacheReadInputTokens || 0;

    // Merge byModel
    if (data.byModel) {
      for (const [model, stats] of Object.entries(data.byModel)) {
        if (!merged.byModel[model]) {
          merged.byModel[model] = { cost: 0, inputTokens: 0, outputTokens: 0 };
        }
        merged.byModel[model].cost += stats.cost || 0;
        merged.byModel[model].inputTokens += stats.inputTokens || 0;
        merged.byModel[model].outputTokens += stats.outputTokens || 0;
      }
    }

    // Merge byDay
    if (data.byDay) {
      for (const [date, stats] of Object.entries(data.byDay)) {
        if (!merged.byDay[date]) {
          merged.byDay[date] = { cost: 0, tokens: 0 };
        }
        merged.byDay[date].cost += stats.cost || 0;
        merged.byDay[date].tokens += stats.tokens || 0;
      }
    }
  }

  return merged;
}

/**
 * Filter data by period
 * @param {object} data - Raw ccusage data
 * @param {string} period - 'day', 'week', 'month', 'all'
 * @returns {object} Filtered data
 */
export function filterByPeriod(data, period) {
  if (period === 'all') {
    return data;
  }

  const range = getPeriodRange(period);
  const filtered = {
    totalCost: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheCreationInputTokens: 0,
    totalCacheReadInputTokens: 0,
    byModel: {},
    byDay: {}
  };

  // Filter byDay and recalculate totals
  if (data.byDay) {
    for (const [date, stats] of Object.entries(data.byDay)) {
      if (isDateInRange(date, range)) {
        filtered.byDay[date] = { ...stats };
        filtered.totalCost += stats.cost || 0;
      }
    }
  }

  // For period filtering, we need to recalculate model stats from daily data
  // Since ccusage doesn't provide daily model breakdown, we'll estimate proportionally
  const totalOriginalCost = data.totalCost || 1;
  const filteredCostRatio = filtered.totalCost / totalOriginalCost;

  // Estimate token counts based on cost ratio
  filtered.totalInputTokens = Math.round((data.totalInputTokens || 0) * filteredCostRatio);
  filtered.totalOutputTokens = Math.round((data.totalOutputTokens || 0) * filteredCostRatio);
  filtered.totalCacheCreationInputTokens = Math.round((data.totalCacheCreationInputTokens || 0) * filteredCostRatio);
  filtered.totalCacheReadInputTokens = Math.round((data.totalCacheReadInputTokens || 0) * filteredCostRatio);

  // Estimate model breakdown proportionally
  if (data.byModel) {
    for (const [model, stats] of Object.entries(data.byModel)) {
      filtered.byModel[model] = {
        cost: (stats.cost || 0) * filteredCostRatio,
        inputTokens: Math.round((stats.inputTokens || 0) * filteredCostRatio),
        outputTokens: Math.round((stats.outputTokens || 0) * filteredCostRatio)
      };
    }
  }

  return filtered;
}

/**
 * Parse ccusage data from a raw object
 * @param {object} data - Raw ccusage data object
 * @param {string} period - Optional period filter ('day', 'week', 'month', 'all')
 * @returns {object} Processed usage data
 */
export function processData(data, period = 'all') {
  const filteredData = filterByPeriod(data, period);
  const summary = calculateSummary(filteredData);
  const models = getModelBreakdown(filteredData);
  const dailyUsage = getDailyUsage(filteredData);

  return {
    summary,
    models,
    dailyUsage,
    raw: filteredData,
    period
  };
}

/**
 * Calculate summary statistics from raw data
 * @param {object} data - Raw ccusage data
 * @returns {object} Summary statistics
 */
export function calculateSummary(data) {
  const totalInputTokens = data.totalInputTokens || 0;
  const totalOutputTokens = data.totalOutputTokens || 0;
  const totalCacheCreation = data.totalCacheCreationInputTokens || 0;
  const totalCacheRead = data.totalCacheReadInputTokens || 0;

  const totalTokens = totalInputTokens + totalOutputTokens + totalCacheCreation + totalCacheRead;
  const totalCost = data.totalCost || 0;

  // Calculate period days from byDay data
  const byDay = data.byDay || {};
  const days = Object.keys(byDay);
  const periodDays = days.length || 1;

  const dailyAverage = {
    tokens: Math.round(totalTokens / periodDays),
    cost: totalCost / periodDays
  };

  return {
    totalTokens,
    totalInputTokens,
    totalOutputTokens,
    totalCacheCreation,
    totalCacheRead,
    totalCost,
    dailyAverage,
    periodDays
  };
}

/**
 * Get model usage breakdown with percentages
 * @param {object} data - Raw ccusage data
 * @returns {Array<object>} Model breakdown array sorted by cost
 */
export function getModelBreakdown(data) {
  const byModel = data.byModel || {};
  const totalCost = data.totalCost || 0;

  const models = Object.entries(byModel).map(([name, stats]) => ({
    name,
    shortName: shortenModelName(name),
    cost: stats.cost || 0,
    inputTokens: stats.inputTokens || 0,
    outputTokens: stats.outputTokens || 0,
    percentage: calculatePercentage(stats.cost || 0, totalCost, 0)
  }));

  // Sort by cost descending
  models.sort((a, b) => b.cost - a.cost);

  return models;
}

/**
 * Get daily usage data for charts
 * @param {object} data - Raw ccusage data
 * @param {number} days - Number of days to include (default: all)
 * @returns {Array<object>} Daily usage array sorted by date descending
 */
export function getDailyUsage(data, days = null) {
  const byDay = data.byDay || {};

  let dailyUsage = Object.entries(byDay).map(([date, stats]) => ({
    date,
    tokens: stats.tokens || 0,
    cost: stats.cost || 0
  }));

  // Sort by date descending (most recent first)
  dailyUsage.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Limit to specified number of days
  if (days && days > 0) {
    dailyUsage = dailyUsage.slice(0, days);
  }

  return dailyUsage;
}

/**
 * Get the top model by cost
 * @param {Array<object>} models - Model breakdown array
 * @returns {object|null} Top model or null if no models
 */
export function getTopModel(models) {
  if (!models || models.length === 0) return null;
  return models[0];
}

/**
 * Validate ccusage data structure
 * @param {object} data - Data to validate (supports both ccusage and internal formats)
 * @returns {object} Validation result with isValid and errors
 */
export function validateData(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    errors.push('Data must be an object');
    return { isValid: false, errors };
  }

  // Check for ccusage format (daily[] and totals{})
  const isCcusageFormat = Array.isArray(data.daily) || data.totals;

  if (isCcusageFormat) {
    // Validate ccusage format
    if (data.daily && !Array.isArray(data.daily)) {
      errors.push('daily must be an array');
    }
    if (data.totals && typeof data.totals !== 'object') {
      errors.push('totals must be an object');
    }
  } else {
    // Validate internal format
    if (typeof data.totalCost !== 'number') {
      errors.push('totalCost must be a number');
    }

    if (data.byModel && typeof data.byModel !== 'object') {
      errors.push('byModel must be an object');
    }

    if (data.byDay && typeof data.byDay !== 'object') {
      errors.push('byDay must be an object');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export default {
  parseUsageData,
  parseMultipleUsageData,
  mergeUsageData,
  filterByPeriod,
  processData,
  calculateSummary,
  getModelBreakdown,
  getDailyUsage,
  getTopModel,
  validateData,
  transformCcusageFormat
};
