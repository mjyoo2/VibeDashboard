import { describe, it, expect } from 'vitest';
import {
  processData,
  calculateSummary,
  getModelBreakdown,
  getDailyUsage,
  getTopModel,
  validateData,
  mergeUsageData,
  filterByPeriod
} from '../src/parser.js';

const sampleData = {
  totalCost: 847.23,
  totalInputTokens: 45000000,
  totalOutputTokens: 12000000,
  totalCacheCreationInputTokens: 5000000,
  totalCacheReadInputTokens: 63000000,
  byModel: {
    'claude-sonnet-4-20250514': {
      cost: 520.15,
      inputTokens: 30000000,
      outputTokens: 8000000
    },
    'claude-opus-4-20250514': {
      cost: 327.08,
      inputTokens: 15000000,
      outputTokens: 4000000
    }
  },
  byDay: {
    '2025-01-14': { cost: 45.23, tokens: 2500000 },
    '2025-01-13': { cost: 38.12, tokens: 2100000 },
    '2025-01-12': { cost: 52.87, tokens: 2900000 }
  }
};

describe('processData', () => {
  it('should process data and return structured result', () => {
    const result = processData(sampleData);

    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('models');
    expect(result).toHaveProperty('dailyUsage');
    expect(result).toHaveProperty('raw');
  });
});

describe('calculateSummary', () => {
  it('should calculate total tokens correctly', () => {
    const summary = calculateSummary(sampleData);

    const expectedTotal =
      sampleData.totalInputTokens +
      sampleData.totalOutputTokens +
      sampleData.totalCacheCreationInputTokens +
      sampleData.totalCacheReadInputTokens;

    expect(summary.totalTokens).toBe(expectedTotal);
    expect(summary.totalTokens).toBe(125000000);
  });

  it('should calculate total cost', () => {
    const summary = calculateSummary(sampleData);
    expect(summary.totalCost).toBe(847.23);
  });

  it('should calculate daily average', () => {
    const summary = calculateSummary(sampleData);

    expect(summary.periodDays).toBe(3);
    expect(summary.dailyAverage.tokens).toBeCloseTo(125000000 / 3, 0);
    expect(summary.dailyAverage.cost).toBeCloseTo(847.23 / 3, 2);
  });

  it('should handle empty data', () => {
    const summary = calculateSummary({});

    expect(summary.totalTokens).toBe(0);
    expect(summary.totalCost).toBe(0);
    expect(summary.periodDays).toBe(1);
  });
});

describe('getModelBreakdown', () => {
  it('should return models sorted by cost', () => {
    const models = getModelBreakdown(sampleData);

    expect(models.length).toBe(2);
    expect(models[0].name).toBe('claude-sonnet-4-20250514');
    expect(models[0].cost).toBe(520.15);
    expect(models[1].name).toBe('claude-opus-4-20250514');
  });

  it('should include shortened names', () => {
    const models = getModelBreakdown(sampleData);

    expect(models[0].shortName).toBe('sonnet-4');
    expect(models[1].shortName).toBe('opus-4');
  });

  it('should calculate percentages', () => {
    const models = getModelBreakdown(sampleData);

    expect(models[0].percentage).toBe(61); // 520.15 / 847.23 ≈ 61%
    expect(models[1].percentage).toBe(39); // 327.08 / 847.23 ≈ 39%
  });

  it('should handle empty model data', () => {
    const models = getModelBreakdown({});
    expect(models).toEqual([]);
  });
});

describe('getDailyUsage', () => {
  it('should return daily usage sorted by date descending', () => {
    const daily = getDailyUsage(sampleData);

    expect(daily.length).toBe(3);
    expect(daily[0].date).toBe('2025-01-14');
    expect(daily[1].date).toBe('2025-01-13');
    expect(daily[2].date).toBe('2025-01-12');
  });

  it('should include tokens and cost', () => {
    const daily = getDailyUsage(sampleData);

    expect(daily[0].tokens).toBe(2500000);
    expect(daily[0].cost).toBe(45.23);
  });

  it('should limit to specified days', () => {
    const daily = getDailyUsage(sampleData, 2);
    expect(daily.length).toBe(2);
    expect(daily[0].date).toBe('2025-01-14');
    expect(daily[1].date).toBe('2025-01-13');
  });

  it('should handle empty data', () => {
    const daily = getDailyUsage({});
    expect(daily).toEqual([]);
  });
});

describe('getTopModel', () => {
  it('should return the top model by cost', () => {
    const models = getModelBreakdown(sampleData);
    const top = getTopModel(models);

    expect(top.name).toBe('claude-sonnet-4-20250514');
    expect(top.cost).toBe(520.15);
  });

  it('should return null for empty models', () => {
    expect(getTopModel([])).toBeNull();
    expect(getTopModel(null)).toBeNull();
  });
});

describe('validateData', () => {
  it('should validate correct data', () => {
    const result = validateData(sampleData);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should reject null/undefined', () => {
    expect(validateData(null).isValid).toBe(false);
    expect(validateData(undefined).isValid).toBe(false);
  });

  it('should validate totalCost type', () => {
    const result = validateData({ totalCost: 'not a number' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('totalCost must be a number');
  });

  it('should validate byModel type', () => {
    const result = validateData({ totalCost: 100, byModel: 'invalid' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('byModel must be an object');
  });

  it('should validate byDay type', () => {
    const result = validateData({ totalCost: 100, byDay: 'invalid' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('byDay must be an object');
  });
});

describe('mergeUsageData', () => {
  const dataSource1 = {
    totalCost: 100,
    totalInputTokens: 1000000,
    totalOutputTokens: 500000,
    totalCacheCreationInputTokens: 0,
    totalCacheReadInputTokens: 0,
    byModel: {
      'claude-sonnet-4-20250514': { cost: 100, inputTokens: 1000000, outputTokens: 500000 }
    },
    byDay: {
      '2025-01-14': { cost: 50, tokens: 750000 },
      '2025-01-13': { cost: 50, tokens: 750000 }
    }
  };

  const dataSource2 = {
    totalCost: 200,
    totalInputTokens: 2000000,
    totalOutputTokens: 1000000,
    totalCacheCreationInputTokens: 100000,
    totalCacheReadInputTokens: 0,
    byModel: {
      'claude-sonnet-4-20250514': { cost: 150, inputTokens: 1500000, outputTokens: 750000 },
      'claude-opus-4-20250514': { cost: 50, inputTokens: 500000, outputTokens: 250000 }
    },
    byDay: {
      '2025-01-14': { cost: 100, tokens: 1500000 },
      '2025-01-12': { cost: 100, tokens: 1600000 }
    }
  };

  it('should merge totals correctly', () => {
    const merged = mergeUsageData([dataSource1, dataSource2]);

    expect(merged.totalCost).toBe(300);
    expect(merged.totalInputTokens).toBe(3000000);
    expect(merged.totalOutputTokens).toBe(1500000);
    expect(merged.totalCacheCreationInputTokens).toBe(100000);
  });

  it('should merge byModel correctly', () => {
    const merged = mergeUsageData([dataSource1, dataSource2]);

    expect(merged.byModel['claude-sonnet-4-20250514'].cost).toBe(250);
    expect(merged.byModel['claude-sonnet-4-20250514'].inputTokens).toBe(2500000);
    expect(merged.byModel['claude-opus-4-20250514'].cost).toBe(50);
  });

  it('should merge byDay correctly', () => {
    const merged = mergeUsageData([dataSource1, dataSource2]);

    // 2025-01-14 appears in both sources
    expect(merged.byDay['2025-01-14'].cost).toBe(150);
    expect(merged.byDay['2025-01-14'].tokens).toBe(2250000);

    // 2025-01-13 only in source1
    expect(merged.byDay['2025-01-13'].cost).toBe(50);

    // 2025-01-12 only in source2
    expect(merged.byDay['2025-01-12'].cost).toBe(100);
  });

  it('should handle single source', () => {
    const merged = mergeUsageData([dataSource1]);
    expect(merged).toBe(dataSource1);
  });

  it('should handle empty array', () => {
    const merged = mergeUsageData([]);
    expect(merged.totalCost).toBe(0);
    expect(merged.byModel).toEqual({});
    expect(merged.byDay).toEqual({});
  });
});

describe('filterByPeriod', () => {
  // Generate dates relative to today for reliable testing
  const today = new Date();
  const formatDateStr = (daysAgo) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };

  const testData = {
    totalCost: 300,
    totalInputTokens: 3000000,
    totalOutputTokens: 1500000,
    totalCacheCreationInputTokens: 0,
    totalCacheReadInputTokens: 0,
    byModel: {
      'claude-sonnet-4-20250514': { cost: 300, inputTokens: 3000000, outputTokens: 1500000 }
    },
    byDay: {
      [formatDateStr(0)]: { cost: 50, tokens: 500000 },  // today
      [formatDateStr(1)]: { cost: 50, tokens: 500000 },  // yesterday
      [formatDateStr(2)]: { cost: 50, tokens: 500000 },  // 2 days ago
      [formatDateStr(4)]: { cost: 50, tokens: 500000 },  // 4 days ago
      [formatDateStr(10)]: { cost: 50, tokens: 500000 }, // 10 days ago (outside week)
      [formatDateStr(40)]: { cost: 50, tokens: 500000 }  // 40 days ago (outside month)
    }
  };

  it('should return data unchanged for "all" period', () => {
    const filtered = filterByPeriod(testData, 'all');
    expect(filtered).toBe(testData);
  });

  it('should filter by week period', () => {
    const filtered = filterByPeriod(testData, 'week');

    // Should include dates from last 7 days
    expect(Object.keys(filtered.byDay)).toContain(formatDateStr(0));
    expect(Object.keys(filtered.byDay)).toContain(formatDateStr(1));
    expect(Object.keys(filtered.byDay)).toContain(formatDateStr(2));
    expect(Object.keys(filtered.byDay)).toContain(formatDateStr(4));
    expect(Object.keys(filtered.byDay)).not.toContain(formatDateStr(10));
    expect(Object.keys(filtered.byDay)).not.toContain(formatDateStr(40));
  });

  it('should recalculate cost based on filtered days', () => {
    const filtered = filterByPeriod(testData, 'week');

    // 4 days in range at $50 each = $200
    expect(filtered.totalCost).toBe(200);
  });

  it('should estimate model breakdown proportionally', () => {
    const filtered = filterByPeriod(testData, 'week');

    // Original: $300 total, filtered: $200 total
    // Ratio: 200/300 = 2/3
    const expectedModelCost = 300 * (200 / 300);
    expect(filtered.byModel['claude-sonnet-4-20250514'].cost).toBeCloseTo(expectedModelCost, 2);
  });
});
