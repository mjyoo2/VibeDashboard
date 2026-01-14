import {
  formatTokens,
  formatCost,
  formatDate,
  formatDateTime,
  generateProgressBar,
  generateBar,
  escapeXml,
  getPeriodLabelKey
} from './utils.js';
import { t } from './i18n.js';
import { getTopModel } from './parser.js';

/**
 * Theme definitions for SVG
 */
const themes = {
  dark: {
    background: '#0d1117',
    border: '#30363d',
    title: '#c9d1d9',
    text: '#8b949e',
    accent: '#58a6ff',
    barFilled: '#58a6ff',
    barEmpty: '#21262d',
    chartBg: '#161b22'
  },
  light: {
    background: '#ffffff',
    border: '#d0d7de',
    title: '#24292f',
    text: '#57606a',
    accent: '#0969da',
    barFilled: '#0969da',
    barEmpty: '#eaeef2',
    chartBg: '#f6f8fa'
  }
};

/**
 * Generate complete dashboard output based on layout
 * @param {object} data - Processed usage data
 * @param {object} config - Configuration options
 * @returns {object} Generated content { markdown, svg }
 */
export function generate(data, config) {
  const markdown = generateMarkdown(data, config);
  const svg = config.layout === 'minimal' ? null : generateSVG(data, config);

  return { markdown, svg };
}

/**
 * Generate Markdown output
 * @param {object} data - Processed usage data
 * @param {object} config - Configuration options
 * @returns {string} Markdown string
 */
export function generateMarkdown(data, config) {
  const { summary, models, dailyUsage, sourceCount, period } = data;
  const { language, currencySymbol, showItems, chartDays, layout } = config;
  const configPeriod = config.period || period || 'all';

  const lines = [];
  const topModel = getTopModel(models);

  // Title with period indicator
  const periodLabel = t(getPeriodLabelKey(configPeriod), language);
  const titleSuffix = configPeriod !== 'all' ? ` (${periodLabel})` : '';
  lines.push(`## 🎸 ${t('title', language)}${titleSuffix}`);

  // Show source count if multiple sources merged
  if (sourceCount && sourceCount > 1) {
    lines.push(`> ${t('mergedFrom', language, { n: sourceCount })}`);
  }
  lines.push('');

  // Stats table
  if (showItems.totalTokens || showItems.totalCost || showItems.dailyAverage || showItems.modelBreakdown) {
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');

    if (showItems.totalTokens) {
      lines.push(`| 🎯 ${t('totalTokens', language)} | ${formatTokens(summary.totalTokens)} |`);
    }

    if (showItems.totalCost) {
      lines.push(`| 💰 ${t('totalCost', language)} | ${formatCost(summary.totalCost, currencySymbol)} |`);
    }

    if (showItems.dailyAverage) {
      const avgTokens = formatTokens(summary.dailyAverage.tokens);
      const avgCost = formatCost(summary.dailyAverage.cost, currencySymbol);
      lines.push(`| 📅 ${t('dailyAverage', language)} | ${avgTokens} ${t('tokens', language)} / ${avgCost} |`);
    }

    if (showItems.modelBreakdown && topModel) {
      lines.push(`| 🤖 ${t('topModel', language)} | ${topModel.shortName} (${topModel.percentage}%) |`);
    }

    lines.push('');
  }

  // Period chart in details/summary
  const showChart = showItems.periodChart ?? showItems.weeklyChart;  // backward compat
  if (showChart && dailyUsage.length > 0) {
    const chartData = dailyUsage.slice(0, chartDays);
    const chart = generateTextChart(chartData, currencySymbol);
    const chartTitle = configPeriod === 'all'
      ? t('lastDays', language, { n: chartDays })
      : t('periodUsage', language, { period: periodLabel });

    lines.push('<details>');
    lines.push(`<summary>📊 ${chartTitle}</summary>`);
    lines.push('');
    lines.push('```');
    lines.push(chart);
    lines.push('```');
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }

  // Model breakdown in details (for detailed layout)
  if (layout === 'detailed' && showItems.modelBreakdown && models.length > 0) {
    lines.push('<details>');
    lines.push(`<summary>🤖 ${t('modelBreakdown', language)}</summary>`);
    lines.push('');
    lines.push('| Model | Usage | Cost |');
    lines.push('|-------|-------|------|');
    for (const model of models) {
      const bar = generateProgressBar(model.percentage, 10);
      lines.push(`| ${model.shortName} | ${bar} ${model.percentage}% | ${formatCost(model.cost, currencySymbol)} |`);
    }
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }

  // Footer
  if (showItems.lastUpdated) {
    const updateTime = formatDateTime();
    lines.push(`<sub>${t('updated', language)}: ${updateTime} • ${t('poweredBy', language)} [VibeDashboard](https://github.com/mjyoo2/VibeDashboard)</sub>`);
  }

  return lines.join('\n');
}

/**
 * Generate text-based chart for daily usage
 * @param {Array<object>} dailyData - Daily usage data
 * @param {string} currencySymbol - Currency symbol
 * @returns {string} Text chart
 */
export function generateTextChart(dailyData, currencySymbol = '$') {
  if (!dailyData || dailyData.length === 0) return '';

  // Reverse to show oldest first (chronological order)
  const data = [...dailyData].reverse();
  const maxTokens = Math.max(...data.map((d) => d.tokens));

  const lines = data.map((day) => {
    const dateStr = formatDate(day.date);
    const bar = generateBar(day.tokens, maxTokens, 20);
    const tokensStr = formatTokens(day.tokens);
    const costStr = formatCost(day.cost, currencySymbol);
    return `${dateStr} ${bar} ${tokensStr} (${costStr})`;
  });

  return lines.join('\n');
}

/**
 * Generate SVG card
 * @param {object} data - Processed usage data
 * @param {object} config - Configuration options
 * @returns {string} SVG string
 */
export function generateSVG(data, config) {
  const { summary, models, dailyUsage, sourceCount, period } = data;
  const { theme: themeName, language, currencySymbol, showItems, chartDays, layout } = config;
  const configPeriod = config.period || period || 'all';

  const theme = themes[themeName] || themes.dark;
  const width = 900;
  const baseHeight = 320;
  const modelCount = Math.min(models.length, 5);
  const height = layout === 'detailed' ? baseHeight + 50 : baseHeight + (modelCount * 18);
  const topModel = getTopModel(models);
  const periodLabel = t(getPeriodLabelKey(configPeriod), language);
  const titleSuffix = configPeriod !== 'all' ? ` (${periodLabel})` : '';

  // Calculate period stats (daily, weekly, monthly)
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  let dailyTokens = 0, dailyCost = 0;
  let weeklyTokens = 0, weeklyCost = 0;
  let monthlyTokens = 0, monthlyCost = 0;

  for (const day of dailyUsage) {
    if (day.date === todayStr) {
      dailyTokens += day.tokens;
      dailyCost += day.cost;
    }
    if (day.date >= weekAgo) {
      weeklyTokens += day.tokens;
      weeklyCost += day.cost;
    }
    if (day.date >= monthAgo) {
      monthlyTokens += day.tokens;
      monthlyCost += day.cost;
    }
  }

  // Build SVG content
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    .title { font: 600 20px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${theme.title}; }
    .stat-label { font: 400 13px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${theme.text}; }
    .stat-value { font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${theme.title}; }
    .stat-value-small { font: 600 14px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${theme.title}; }
    .section-title { font: 600 14px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${theme.text}; }
    .model-label { font: 400 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${theme.text}; }
    .footer { font: 400 11px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${theme.text}; }
  </style>

  <!-- Background -->
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="4.5" fill="${theme.background}" stroke="${theme.border}"/>

  <!-- Title -->
  <text x="25" y="35" class="title">🎸 ${escapeXml(t('dashboardTitle', language))}${escapeXml(titleSuffix)}</text>

  <!-- Stats Row -->
  <g transform="translate(25, 60)">`;

  // Total Tokens
  if (showItems.totalTokens) {
    svg += `
    <g>
      <text class="stat-label">${escapeXml(t('totalTokens', language))}</text>
      <text y="22" class="stat-value">${escapeXml(formatTokens(summary.totalTokens))}</text>
    </g>`;
  }

  // Total Cost
  if (showItems.totalCost) {
    svg += `
    <g transform="translate(150, 0)">
      <text class="stat-label">${escapeXml(t('totalCost', language))}</text>
      <text y="22" class="stat-value">${escapeXml(formatCost(summary.totalCost, currencySymbol))}</text>
    </g>`;
  }

  // Today's Usage
  svg += `
    <g transform="translate(320, 0)">
      <text class="stat-label">📅 Today</text>
      <text y="22" class="stat-value-small">${escapeXml(formatTokens(dailyTokens))} / ${escapeXml(formatCost(dailyCost, currencySymbol))}</text>
    </g>`;

  // Weekly Usage
  svg += `
    <g transform="translate(510, 0)">
      <text class="stat-label">📊 This Week</text>
      <text y="22" class="stat-value-small">${escapeXml(formatTokens(weeklyTokens))} / ${escapeXml(formatCost(weeklyCost, currencySymbol))}</text>
    </g>`;

  // Monthly Usage
  svg += `
    <g transform="translate(710, 0)">
      <text class="stat-label">📈 This Month</text>
      <text y="22" class="stat-value-small">${escapeXml(formatTokens(monthlyTokens))} / ${escapeXml(formatCost(monthlyCost, currencySymbol))}</text>
    </g>`;

  svg += `
  </g>`;

  // Period Usage Chart
  const showChart = showItems.periodChart ?? showItems.weeklyChart;  // backward compat
  if (showChart && dailyUsage.length > 0) {
    const chartData = dailyUsage.slice(0, chartDays).reverse();
    svg += generateSVGChart(chartData, theme, 25, 105, 850, 100);
  }

  // Model Breakdown
  if (showItems.modelBreakdown && models.length > 0) {
    const yOffset = showChart ? 220 : 105;
    svg += generateSVGModelBreakdown(models.slice(0, 5), theme, 25, yOffset, 850, currencySymbol);
  }

  // Footer
  if (showItems.lastUpdated) {
    const updateTime = formatDateTime();
    svg += `
  <text x="25" y="${height - 20}" class="footer">${escapeXml(t('updated', language))}: ${escapeXml(updateTime)} • Powered by <a href="https://github.com/mjyoo2/VibeDashboard" target="_blank">VibeDashboard</a></text>`;
  }

  svg += `
</svg>`;

  return svg;
}

/**
 * Generate SVG bar chart for daily usage
 * @param {Array} data - Daily usage data (chronological order)
 * @param {object} theme - Theme colors
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Chart width
 * @param {number} height - Chart height
 * @returns {string} SVG chart element
 */
function generateSVGChart(data, theme, x, y, width, height) {
  if (!data || data.length === 0) return '';

  const maxTokens = Math.max(...data.map((d) => d.tokens));
  const yAxisWidth = 50;
  const chartWidth = width - yAxisWidth;
  const barWidth = Math.floor((chartWidth - 20) / data.length) - 6;
  const maxBarHeight = height - 25;

  let chart = `
  <!-- Weekly Usage Chart -->
  <g transform="translate(${x}, ${y})">
    <rect x="0" y="0" width="${width}" height="${height}" rx="4" fill="${theme.chartBg}"/>`;

  // Y-axis labels
  const yLabels = [maxTokens, maxTokens / 2, 0];
  yLabels.forEach((val, i) => {
    const labelY = 5 + (i * (maxBarHeight / 2)) + 10;
    chart += `
    <text x="${yAxisWidth - 5}" y="${labelY}" text-anchor="end" class="model-label">${formatTokens(val)}</text>`;
  });

  // Y-axis line
  chart += `
    <line x1="${yAxisWidth}" y1="5" x2="${yAxisWidth}" y2="${maxBarHeight + 5}" stroke="${theme.border}" stroke-width="1"/>`;

  // Bars
  data.forEach((day, i) => {
    const barHeight = maxTokens > 0 ? Math.max((day.tokens / maxTokens) * maxBarHeight, 2) : 2;
    const barX = yAxisWidth + 10 + i * (barWidth + 6);
    const barY = maxBarHeight - barHeight + 5;

    chart += `
    <rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" rx="3" fill="${theme.barFilled}"/>`;

    // Day label (MM/DD format)
    const dayLabel = formatDate(day.date);
    chart += `
    <text x="${barX + barWidth / 2}" y="${height - 5}" text-anchor="middle" class="model-label">${dayLabel}</text>`;
  });

  chart += `
  </g>`;

  return chart;
}

/**
 * Generate SVG model breakdown bars
 * @param {Array} models - Model data
 * @param {object} theme - Theme colors
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Total width
 * @param {string} currencySymbol - Currency symbol
 * @returns {string} SVG model breakdown element
 */
function generateSVGModelBreakdown(models, theme, x, y, width, currencySymbol) {
  if (!models || models.length === 0) return '';

  const barWidth = width - 180;
  const rowHeight = 20;

  let breakdown = `
  <!-- Model Breakdown -->
  <g transform="translate(${x}, ${y})">
    <text class="section-title">🤖 Model Usage</text>`;

  models.forEach((model, i) => {
    const rowY = 18 + i * rowHeight;
    const filledWidth = (model.percentage / 100) * barWidth;

    breakdown += `
    <g transform="translate(0, ${rowY})">
      <rect x="0" y="2" width="${barWidth}" height="10" rx="3" fill="${theme.barEmpty}"/>
      <rect x="0" y="2" width="${filledWidth}" height="10" rx="3" fill="${theme.barFilled}"/>
      <text x="${barWidth + 10}" y="11" class="model-label">${escapeXml(model.shortName)} ${model.percentage}% (${escapeXml(formatCost(model.cost, currencySymbol))})</text>
    </g>`;
  });

  breakdown += `
  </g>`;

  return breakdown;
}

export default {
  generate,
  generateMarkdown,
  generateSVG,
  generateTextChart
};
