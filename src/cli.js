#!/usr/bin/env node

import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { generateDashboard } from './index.js';
import { addMarkers, hasMarkers } from './updater.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load package.json for version
async function getVersion() {
  try {
    const pkgPath = join(__dirname, '..', 'package.json');
    const content = await readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(content);
    return pkg.version;
  } catch {
    return '1.0.0';
  }
}

/**
 * Collect multiple input values (for -i flag used multiple times)
 */
function collectInputs(value, previous) {
  // Support comma-separated values
  const values = value.split(',').map((v) => v.trim()).filter(Boolean);
  return previous.concat(values);
}

async function main() {
  const version = await getVersion();

  const program = new Command();

  program
    .name('vibe-dashboard')
    .description('Display your Claude Code (vibe coding) stats on GitHub profile')
    .version(version);

  program
    .command('generate')
    .description('Generate dashboard and update README')
    .option('-c, --config <path>', 'Path to config file', './vibe-config.json')
    .option('-i, --input <paths...>', 'Path(s) to ccusage JSON file(s). Can be used multiple times or comma-separated.', collectInputs, [])
    .option('-o, --output <path>', 'Path to README file', './README.md')
    .option('-s, --svg-output <path>', 'Path to save SVG file')
    .option('--theme <theme>', 'Theme: dark or light')
    .option('--layout <layout>', 'Layout: card, minimal, or detailed')
    .option('--language <lang>', 'Language: en, ko, or ja')
    .option('--period <period>', 'Time period: day, week, month, or all', 'all')
    .action(async (options) => {
      console.log('🎸 VibeDashboard - Generating dashboard...\n');

      // Handle input paths - use default if none provided
      let inputPaths = options.input;
      if (inputPaths.length === 0) {
        inputPaths = ['./cc.json'];
      }

      // Build config overrides from CLI options
      const configOverrides = {};
      if (options.theme) configOverrides.theme = options.theme;
      if (options.layout) configOverrides.layout = options.layout;
      if (options.language) configOverrides.language = options.language;
      if (options.period) configOverrides.period = options.period;

      const result = await generateDashboard({
        configPath: options.config,
        inputPath: inputPaths.length === 1 ? inputPaths[0] : inputPaths,
        outputPath: options.output,
        svgPath: options.svgOutput,
        config: Object.keys(configOverrides).length > 0 ? configOverrides : undefined
      });

      if (result.success) {
        console.log('✅ ' + result.message);
        if (result.details) {
          console.log('   📄 ' + result.details.readme);
          console.log('   🖼️  ' + result.details.svg);
          if (result.details.sources > 1) {
            console.log(`   📦 Merged ${result.details.sources} sources`);
          }
          if (result.details.period !== 'all') {
            console.log(`   📅 Period: ${result.details.period}`);
          }
        }
      } else {
        console.error('❌ Error: ' + result.error);
        process.exit(1);
      }
    });

  program
    .command('init')
    .description('Add dashboard markers to README')
    .option('-o, --output <path>', 'Path to README file', './README.md')
    .action(async (options) => {
      console.log('🎸 VibeDashboard - Initializing...\n');

      const has = await hasMarkers(options.output);
      if (has) {
        console.log('✅ Markers already exist in ' + options.output);
        return;
      }

      const result = await addMarkers(options.output);
      if (result.success) {
        console.log('✅ ' + result.message);
        console.log('\nNext steps:');
        console.log('1. Generate your usage data: ccusage --json > cc.json');
        console.log('2. Run: npx vibe-dashboard generate');
      } else {
        console.error('❌ Error: ' + result.message);
        process.exit(1);
      }
    });

  program
    .command('validate')
    .description('Validate ccusage JSON file')
    .option('-i, --input <path>', 'Path to ccusage JSON file', './cc.json')
    .action(async (options) => {
      console.log('🎸 VibeDashboard - Validating input...\n');

      try {
        const content = await readFile(options.input, 'utf-8');
        const data = JSON.parse(content);

        const { validateData } = await import('./parser.js');
        const result = validateData(data);

        if (result.isValid) {
          console.log('✅ Input file is valid');
          console.log('\nSummary:');
          console.log('   Total Cost: $' + (data.totalCost || 0).toFixed(2));
          console.log('   Models: ' + Object.keys(data.byModel || {}).length);
          console.log('   Days: ' + Object.keys(data.byDay || {}).length);
        } else {
          console.error('❌ Validation errors:');
          result.errors.forEach((err) => console.error('   - ' + err));
          process.exit(1);
        }
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.error('❌ File not found: ' + options.input);
        } else {
          console.error('❌ Error: ' + error.message);
        }
        process.exit(1);
      }
    });

  program
    .command('merge')
    .description('Merge multiple ccusage JSON files into one')
    .option('-i, --input <paths...>', 'Path(s) to ccusage JSON files', collectInputs, [])
    .option('-o, --output <path>', 'Output path for merged JSON', './merged-cc.json')
    .action(async (options) => {
      console.log('🎸 VibeDashboard - Merging data files...\n');

      if (options.input.length < 2) {
        console.error('❌ Error: At least 2 input files required for merging');
        process.exit(1);
      }

      try {
        const { mergeUsageData } = await import('./parser.js');
        const { writeFile } = await import('node:fs/promises');

        const dataArray = await Promise.all(
          options.input.map(async (path) => {
            const content = await readFile(path, 'utf-8');
            return JSON.parse(content);
          })
        );

        const merged = mergeUsageData(dataArray);
        await writeFile(options.output, JSON.stringify(merged, null, 2), 'utf-8');

        console.log(`✅ Merged ${options.input.length} files into ${options.output}`);
        console.log('\nMerged summary:');
        console.log('   Total Cost: $' + (merged.totalCost || 0).toFixed(2));
        console.log('   Models: ' + Object.keys(merged.byModel || {}).length);
        console.log('   Days: ' + Object.keys(merged.byDay || {}).length);
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.error('❌ File not found: ' + error.path);
        } else {
          console.error('❌ Error: ' + error.message);
        }
        process.exit(1);
      }
    });

  await program.parseAsync();
}

main().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
