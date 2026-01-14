import { describe, it, expect } from 'vitest';
import {
  formatTokens,
  formatCost,
  formatDate,
  formatDateTime,
  generateProgressBar,
  generateBar,
  calculatePercentage,
  getDefaultConfig,
  mergeConfig,
  escapeXml,
  shortenModelName,
  getPeriodRange,
  isDateInRange,
  getPeriodLabelKey
} from '../src/utils.js';

describe('formatTokens', () => {
  it('should format billions', () => {
    expect(formatTokens(1_500_000_000)).toBe('1.5B');
    expect(formatTokens(1_000_000_000)).toBe('1B');
  });

  it('should format millions', () => {
    expect(formatTokens(125_300_000)).toBe('125.3M');
    expect(formatTokens(1_000_000)).toBe('1M');
  });

  it('should format thousands', () => {
    expect(formatTokens(45_000)).toBe('45K');
    expect(formatTokens(1_500)).toBe('1.5K');
  });

  it('should format small numbers as-is', () => {
    expect(formatTokens(500)).toBe('500');
    expect(formatTokens(0)).toBe('0');
  });

  it('should handle null/undefined', () => {
    expect(formatTokens(null)).toBe('0');
    expect(formatTokens(undefined)).toBe('0');
    expect(formatTokens(NaN)).toBe('0');
  });

  it('should handle negative numbers', () => {
    expect(formatTokens(-1_000_000)).toBe('-1M');
  });
});

describe('formatCost', () => {
  it('should format with dollar sign by default', () => {
    expect(formatCost(847.23)).toBe('$847.23');
  });

  it('should use custom currency symbol', () => {
    expect(formatCost(100, '€')).toBe('€100.00');
    expect(formatCost(50, '¥')).toBe('¥50.00');
  });

  it('should round to 2 decimal places', () => {
    expect(formatCost(100.999)).toBe('$101.00');
    expect(formatCost(50.001)).toBe('$50.00');
  });

  it('should handle null/undefined', () => {
    expect(formatCost(null)).toBe('$0.00');
    expect(formatCost(undefined)).toBe('$0.00');
  });
});

describe('formatDate', () => {
  it('should format date as MM/DD', () => {
    expect(formatDate('2025-01-14')).toBe('01/14');
    expect(formatDate('2025-12-25')).toBe('12/25');
  });

  it('should handle Date objects', () => {
    const date = new Date('2025-06-01');
    expect(formatDate(date)).toBe('06/01');
  });
});

describe('formatDateTime', () => {
  it('should format with UTC time', () => {
    const date = new Date('2025-01-14T09:30:00Z');
    expect(formatDateTime(date)).toBe('2025-01-14 09:30 UTC');
  });
});

describe('generateProgressBar', () => {
  it('should generate correct bar length', () => {
    const bar = generateProgressBar(50, 20);
    expect(bar.length).toBe(20);
  });

  it('should generate correct filled/empty ratio', () => {
    expect(generateProgressBar(50, 10)).toBe('█████░░░░░');
    expect(generateProgressBar(100, 10)).toBe('██████████');
    expect(generateProgressBar(0, 10)).toBe('░░░░░░░░░░');
  });

  it('should clamp percentage between 0-100', () => {
    expect(generateProgressBar(150, 10)).toBe('██████████');
    expect(generateProgressBar(-50, 10)).toBe('░░░░░░░░░░');
  });

  it('should use custom characters', () => {
    expect(generateProgressBar(50, 4, '#', '-')).toBe('##--');
  });
});

describe('generateBar', () => {
  it('should generate bar relative to max value', () => {
    expect(generateBar(50, 100, 10)).toBe('█████░░░░░');
    expect(generateBar(25, 100, 10)).toBe('███░░░░░░░');
  });

  it('should handle zero max value', () => {
    expect(generateBar(50, 0, 10)).toBe('░░░░░░░░░░');
  });
});

describe('calculatePercentage', () => {
  it('should calculate correct percentage', () => {
    expect(calculatePercentage(50, 100)).toBe(50);
    expect(calculatePercentage(1, 3, 1)).toBe(33.3);
  });

  it('should handle zero total', () => {
    expect(calculatePercentage(50, 0)).toBe(0);
  });
});

describe('getDefaultConfig', () => {
  it('should return default config object', () => {
    const config = getDefaultConfig();
    expect(config.theme).toBe('dark');
    expect(config.layout).toBe('card');
    expect(config.language).toBe('en');
    expect(config.showItems.totalTokens).toBe(true);
  });
});

describe('mergeConfig', () => {
  it('should merge user config with defaults', () => {
    const config = mergeConfig({ theme: 'light' });
    expect(config.theme).toBe('light');
    expect(config.layout).toBe('card'); // default
  });

  it('should deep merge showItems', () => {
    const config = mergeConfig({
      showItems: { totalTokens: false }
    });
    expect(config.showItems.totalTokens).toBe(false);
    expect(config.showItems.totalCost).toBe(true); // default
  });

  it('should handle empty config', () => {
    const config = mergeConfig();
    expect(config).toEqual(getDefaultConfig());
  });
});

describe('escapeXml', () => {
  it('should escape special characters', () => {
    expect(escapeXml('<test>')).toBe('&lt;test&gt;');
    expect(escapeXml('A & B')).toBe('A &amp; B');
    expect(escapeXml('"quoted"')).toBe('&quot;quoted&quot;');
    expect(escapeXml("it's")).toBe('it&#39;s');
  });

  it('should handle non-strings', () => {
    expect(escapeXml(123)).toBe('123');
  });
});

describe('shortenModelName', () => {
  it('should shorten Claude model names', () => {
    expect(shortenModelName('claude-sonnet-4-20250514')).toBe('sonnet-4');
    expect(shortenModelName('claude-opus-4-20250514')).toBe('opus-4');
  });

  it('should handle unknown formats', () => {
    expect(shortenModelName('custom-model-v1')).toBe('model-v1');
    expect(shortenModelName(null)).toBe('unknown');
    expect(shortenModelName('')).toBe('unknown');
  });
});

describe('getPeriodRange', () => {
  const referenceDate = new Date('2025-01-14T12:00:00Z');

  it('should return 1 day for "day" period', () => {
    const range = getPeriodRange('day', referenceDate);
    expect(range.days).toBe(1);
    expect(range.startDate.toISOString().slice(0, 10)).toBe('2025-01-14');
  });

  it('should return 7 days for "week" period', () => {
    const range = getPeriodRange('week', referenceDate);
    expect(range.days).toBe(7);
    expect(range.startDate.toISOString().slice(0, 10)).toBe('2025-01-08');
  });

  it('should return 30 days for "month" period', () => {
    const range = getPeriodRange('month', referenceDate);
    expect(range.days).toBe(30);
    // 2025-01-14 minus 29 days = 2024-12-16 (30 days inclusive)
    expect(range.startDate.toISOString().slice(0, 10)).toBe('2024-12-16');
  });

  it('should return null startDate for "all" period', () => {
    const range = getPeriodRange('all', referenceDate);
    expect(range.startDate).toBeNull();
    expect(range.days).toBeNull();
  });
});

describe('isDateInRange', () => {
  const range = {
    startDate: new Date('2025-01-08T00:00:00Z'),
    endDate: new Date('2025-01-14T23:59:59Z')
  };

  it('should return true for dates in range', () => {
    expect(isDateInRange('2025-01-10', range)).toBe(true);
    expect(isDateInRange('2025-01-08', range)).toBe(true);
    expect(isDateInRange('2025-01-14', range)).toBe(true);
  });

  it('should return false for dates outside range', () => {
    expect(isDateInRange('2025-01-07', range)).toBe(false);
    expect(isDateInRange('2025-01-15', range)).toBe(false);
    expect(isDateInRange('2024-12-01', range)).toBe(false);
  });

  it('should return true for any date when startDate is null', () => {
    const allRange = { startDate: null, endDate: new Date() };
    expect(isDateInRange('2020-01-01', allRange)).toBe(true);
    expect(isDateInRange('2030-01-01', allRange)).toBe(true);
  });
});

describe('getPeriodLabelKey', () => {
  it('should return correct label keys', () => {
    expect(getPeriodLabelKey('day')).toBe('today');
    expect(getPeriodLabelKey('week')).toBe('thisWeek');
    expect(getPeriodLabelKey('month')).toBe('thisMonth');
    expect(getPeriodLabelKey('all')).toBe('allTime');
  });

  it('should default to allTime for unknown periods', () => {
    expect(getPeriodLabelKey('unknown')).toBe('allTime');
    expect(getPeriodLabelKey(null)).toBe('allTime');
  });
});
