import { describe, it, expect } from 'vitest';
import { generate, generateMarkdown, generateSVG, generateTextChart } from '../src/generator.js';
import { processData } from '../src/parser.js';
import { getDefaultConfig } from '../src/utils.js';

const sampleRawData = {
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

const sampleData = processData(sampleRawData);
const defaultConfig = getDefaultConfig();

describe('generate', () => {
  it('should return both markdown and svg', () => {
    const result = generate(sampleData, defaultConfig);

    expect(result).toHaveProperty('markdown');
    expect(result).toHaveProperty('svg');
    expect(typeof result.markdown).toBe('string');
    expect(typeof result.svg).toBe('string');
  });

  it('should return null svg for minimal layout', () => {
    const config = { ...defaultConfig, layout: 'minimal' };
    const result = generate(sampleData, config);

    expect(result.markdown).toBeTruthy();
    expect(result.svg).toBeNull();
  });
});

describe('generateMarkdown', () => {
  it('should include title', () => {
    const md = generateMarkdown(sampleData, defaultConfig);
    expect(md).toContain('## 🎸 Vibe Coding Stats');
  });

  it('should include stats table', () => {
    const md = generateMarkdown(sampleData, defaultConfig);
    expect(md).toContain('| Metric | Value |');
    expect(md).toContain('Total Tokens');
    expect(md).toContain('Total Cost');
  });

  it('should include formatted token count', () => {
    const md = generateMarkdown(sampleData, defaultConfig);
    expect(md).toContain('125M'); // 125,000,000 tokens
  });

  it('should include formatted cost', () => {
    const md = generateMarkdown(sampleData, defaultConfig);
    expect(md).toContain('$847.23');
  });

  it('should include weekly chart in details block', () => {
    const md = generateMarkdown(sampleData, defaultConfig);
    expect(md).toContain('<details>');
    expect(md).toContain('Last 7 Days');
    expect(md).toContain('```');
  });

  it('should include footer with update time', () => {
    const md = generateMarkdown(sampleData, defaultConfig);
    expect(md).toContain('Updated:');
    expect(md).toContain('VibeDashboard');
  });

  it('should respect showItems config', () => {
    const config = {
      ...defaultConfig,
      showItems: {
        ...defaultConfig.showItems,
        totalCost: false,
        periodChart: false
      }
    };
    const md = generateMarkdown(sampleData, config);

    expect(md).toContain('Total Tokens');
    expect(md).not.toContain('Total Cost');
    expect(md).not.toContain('Last 7 Days');
  });

  it('should support Korean language', () => {
    const config = { ...defaultConfig, language: 'ko' };
    const md = generateMarkdown(sampleData, config);

    expect(md).toContain('총 토큰');
    expect(md).toContain('총 비용');
  });

  it('should support Japanese language', () => {
    const config = { ...defaultConfig, language: 'ja' };
    const md = generateMarkdown(sampleData, config);

    expect(md).toContain('総トークン');
    expect(md).toContain('総コスト');
  });
});

describe('generateTextChart', () => {
  it('should generate chart lines for each day', () => {
    const dailyData = sampleData.dailyUsage.slice(0, 3);
    const chart = generateTextChart(dailyData);

    const lines = chart.split('\n');
    expect(lines.length).toBe(3);
  });

  it('should include date, bar, tokens, and cost', () => {
    const dailyData = [{ date: '2025-01-14', tokens: 2500000, cost: 45.23 }];
    const chart = generateTextChart(dailyData);

    expect(chart).toContain('01/14');
    expect(chart).toContain('2.5M');
    expect(chart).toContain('$45.23');
    expect(chart).toContain('█');
  });

  it('should handle empty data', () => {
    const chart = generateTextChart([]);
    expect(chart).toBe('');
  });

  it('should use custom currency symbol', () => {
    const dailyData = [{ date: '2025-01-14', tokens: 1000, cost: 10 }];
    const chart = generateTextChart(dailyData, '€');

    expect(chart).toContain('€10.00');
  });
});

describe('generateSVG', () => {
  it('should return valid SVG', () => {
    const svg = generateSVG(sampleData, defaultConfig);

    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('should have correct dimensions for card layout', () => {
    const svg = generateSVG(sampleData, defaultConfig);

    expect(svg).toContain('width="495"');
    expect(svg).toContain('height="195"');
  });

  it('should have larger height for detailed layout', () => {
    const config = { ...defaultConfig, layout: 'detailed' };
    const svg = generateSVG(sampleData, config);

    expect(svg).toContain('height="300"');
  });

  it('should include title', () => {
    const svg = generateSVG(sampleData, defaultConfig);
    expect(svg).toContain('Vibe Coding Dashboard');
  });

  it('should use dark theme colors by default', () => {
    const svg = generateSVG(sampleData, defaultConfig);
    expect(svg).toContain('#0d1117'); // dark background
  });

  it('should use light theme colors when specified', () => {
    const config = { ...defaultConfig, theme: 'light' };
    const svg = generateSVG(sampleData, config);

    expect(svg).toContain('#ffffff'); // light background
  });

  it('should include stats', () => {
    const svg = generateSVG(sampleData, defaultConfig);

    expect(svg).toContain('Total Tokens');
    expect(svg).toContain('125M');
    expect(svg).toContain('$847.23');
  });

  it('should include update timestamp', () => {
    const svg = generateSVG(sampleData, defaultConfig);
    expect(svg).toContain('Updated');
    expect(svg).toContain('UTC');
  });
});
