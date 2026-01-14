/**
 * Format large numbers with K/M/B suffixes
 * @param {number} num - The number to format
 * @returns {string} Formatted string (e.g., "125.3M")
 */
export function formatTokens(num) {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }

  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (absNum >= 1_000_000_000) {
    return sign + (absNum / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (absNum >= 1_000_000) {
    return sign + (absNum / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (absNum >= 1_000) {
    return sign + (absNum / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return sign + absNum.toString();
}

/**
 * Format cost with currency symbol
 * @param {number} num - The cost amount
 * @param {string} symbol - Currency symbol (default: "$")
 * @returns {string} Formatted cost (e.g., "$847.23")
 */
export function formatCost(num, symbol = '$') {
  if (num === null || num === undefined || isNaN(num)) {
    return symbol + '0.00';
  }
  return symbol + num.toFixed(2);
}

/**
 * Format date to MM/DD format
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date (e.g., "01/14")
 */
export function formatDate(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${month}/${day}`;
}

/**
 * Format date to full ISO format with time
 * @param {Date} date - Date to format
 * @returns {string} Formatted date (e.g., "2025-01-14 09:30 UTC")
 */
export function formatDateTime(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes} UTC`;
}

/**
 * Generate ASCII progress bar
 * @param {number} percentage - Percentage (0-100)
 * @param {number} length - Total length of the bar (default: 20)
 * @param {string} filled - Character for filled portion (default: "█")
 * @param {string} empty - Character for empty portion (default: "░")
 * @returns {string} Progress bar string
 */
export function generateProgressBar(percentage, length = 20, filled = '█', empty = '░') {
  const clampedPercent = Math.max(0, Math.min(100, percentage));
  const filledLength = Math.round((clampedPercent / 100) * length);
  const emptyLength = length - filledLength;
  return filled.repeat(filledLength) + empty.repeat(emptyLength);
}

/**
 * Generate text-based bar chart for daily usage
 * @param {number} value - Current value
 * @param {number} maxValue - Maximum value in the dataset
 * @param {number} length - Total length of the bar (default: 20)
 * @returns {string} Bar string
 */
export function generateBar(value, maxValue, length = 20) {
  if (maxValue === 0) return '░'.repeat(length);
  const percentage = (value / maxValue) * 100;
  return generateProgressBar(percentage, length);
}

/**
 * Calculate percentage with optional decimal places
 * @param {number} value - The value
 * @param {number} total - The total
 * @param {number} decimals - Decimal places (default: 0)
 * @returns {number} Percentage
 */
export function calculatePercentage(value, total, decimals = 0) {
  if (total === 0) return 0;
  const percentage = (value / total) * 100;
  return Number(percentage.toFixed(decimals));
}

/**
 * Get default configuration
 * @returns {object} Default config object
 */
export function getDefaultConfig() {
  return {
    theme: 'dark',
    layout: 'card',
    period: 'all',  // 'day', 'week', 'month', 'all'
    showItems: {
      totalTokens: true,
      totalCost: true,
      periodChart: true,
      modelBreakdown: true,
      dailyAverage: true,
      lastUpdated: true
    },
    chartDays: 14,
    language: 'en',
    currencySymbol: '$',
    sources: []  // Array of remote URLs or local paths to merge
  };
}

/**
 * Get date range for a period
 * @param {string} period - 'day', 'week', 'month', 'all'
 * @param {Date} referenceDate - Reference date (default: now)
 * @returns {object} { startDate, endDate, days }
 */
export function getPeriodRange(period, referenceDate = new Date()) {
  const endDate = new Date(referenceDate);
  endDate.setUTCHours(23, 59, 59, 999);

  let startDate = new Date(referenceDate);
  startDate.setUTCHours(0, 0, 0, 0);

  let days;

  switch (period) {
    case 'day':
      days = 1;
      break;
    case 'week':
      startDate.setUTCDate(startDate.getUTCDate() - 6);
      days = 7;
      break;
    case 'month':
      startDate.setUTCDate(startDate.getUTCDate() - 29);
      days = 30;
      break;
    case 'all':
    default:
      startDate = null;  // No start limit
      days = null;
      break;
  }

  return { startDate, endDate, days };
}

/**
 * Check if a date is within a period range
 * @param {string|Date} date - Date to check
 * @param {object} range - { startDate, endDate }
 * @returns {boolean}
 */
export function isDateInRange(date, range) {
  if (!range.startDate) return true;  // 'all' period

  const d = typeof date === 'string' ? new Date(date) : date;
  return d >= range.startDate && d <= range.endDate;
}

/**
 * Format period label for display
 * @param {string} period - 'day', 'week', 'month', 'all'
 * @returns {string} Label key for i18n
 */
export function getPeriodLabelKey(period) {
  const labels = {
    day: 'today',
    week: 'thisWeek',
    month: 'thisMonth',
    all: 'allTime'
  };
  return labels[period] || 'allTime';
}

/**
 * Merge user config with defaults
 * @param {object} userConfig - User provided config
 * @returns {object} Merged config
 */
export function mergeConfig(userConfig = {}) {
  const defaults = getDefaultConfig();
  return {
    ...defaults,
    ...userConfig,
    showItems: {
      ...defaults.showItems,
      ...(userConfig.showItems || {})
    }
  };
}

/**
 * Escape special characters for SVG text content
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeXml(str) {
  if (typeof str !== 'string') return String(str);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Shorten model name for display
 * @param {string} modelName - Full model name (e.g., "claude-opus-4-5-20250514")
 * @returns {string} Shortened name (e.g., "opus-4.5")
 */
export function shortenModelName(modelName) {
  if (!modelName) return 'unknown';

  // Extract the model type and version (handles 4-5 as 4.5)
  const match = modelName.match(/claude-(\w+)-(\d+)(?:-(\d+))?-\d{8}/i);
  if (match) {
    const type = match[1];
    const major = match[2];
    const minor = match[3];
    return minor ? `${type}-${major}.${minor}` : `${type}-${major}`;
  }

  // Fallback: return last part if no match
  const parts = modelName.split('-');
  return parts.slice(-2).join('-');
}
