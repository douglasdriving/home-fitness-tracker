#!/usr/bin/env node

/**
 * Dead Code Scanner
 *
 * Scans the codebase for unused/orphaned code including:
 * - Unused imports
 * - Unused exports (functions, classes, types, constants)
 * - Potentially orphaned files
 *
 * This script is designed to be run as part of a pre-commit hook to enforce
 * clean code practices. It will exit with code 1 if dead code is found,
 * blocking the commit.
 *
 * USAGE:
 *   node scripts/dead-code-scanner.js [options]
 *
 * OPTIONS:
 *   --fix       Automatically fix unused imports (where possible)
 *   --verbose   Show detailed output
 *   --json      Output results as JSON
 *
 * EXCEPTION LIST:
 *   Create a .dead-code-exceptions.json file to exclude specific files or exports.
 *   See the file for documentation on the format.
 *
 *   ⚠️  IMPORTANT: Exceptions should be used SPARINGLY. The default action when
 *   a commit is blocked should be to INVESTIGATE and REMOVE the dead code,
 *   NOT to add an exception.
 */

import { execSync, spawnSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  fix: args.includes('--fix'),
  verbose: args.includes('--verbose'),
  json: args.includes('--json'),
};

// ANSI color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message, color = null) {
  if (options.json) return;
  if (color) {
    console.log(`${colors[color]}${message}${colors.reset}`);
  } else {
    console.log(message);
  }
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

/**
 * Load exceptions from .dead-code-exceptions.json
 */
function loadExceptions() {
  const exceptionsPath = join(projectRoot, '.dead-code-exceptions.json');

  if (!existsSync(exceptionsPath)) {
    return { files: [], exports: [], patterns: [] };
  }

  try {
    const content = readFileSync(exceptionsPath, 'utf-8');
    const exceptions = JSON.parse(content);
    return {
      files: exceptions.files || [],
      exports: exceptions.exports || [],
      patterns: exceptions.patterns || [],
    };
  } catch (error) {
    logWarning(`Failed to parse .dead-code-exceptions.json: ${error.message}`);
    return { files: [], exports: [], patterns: [] };
  }
}

/**
 * Check if an item matches any exception
 * @param {string} item - The item to check (file path or "file:export" format)
 * @param {Object} exceptions - The exceptions object
 * @param {string} [exportName] - Optional export name for more precise matching
 */
function isExcepted(item, exceptions, exportName = null) {
  // Check exact file matches
  if (exceptions.files.some(f => item.includes(f))) {
    return true;
  }

  // Check export-level exceptions (format: "file:exportName")
  for (const exception of exceptions.exports) {
    // Parse the exception format "path/to/file.ts:exportName"
    const parts = exception.split(':');
    if (parts.length === 2) {
      const [exceptedFile, exceptedExport] = parts;
      // Match if file contains the excepted file path and export name matches
      if (item.includes(exceptedFile) && exportName === exceptedExport) {
        return true;
      }
    }
    // Also check if the raw item string includes the exception
    if (item.includes(exception)) {
      return true;
    }
  }

  // Check pattern matches
  for (const pattern of exceptions.patterns) {
    const regex = new RegExp(pattern);
    if (regex.test(item)) {
      return true;
    }
  }

  return false;
}

/**
 * Run ts-prune to find unused exports
 */
function runTsPrune(exceptions) {
  if (options.verbose) {
    logInfo('Running ts-prune to detect unused exports...');
  }

  try {
    const result = spawnSync('npx', ['ts-prune', '--project', 'tsconfig.json'], {
      cwd: projectRoot,
      encoding: 'utf-8',
      shell: true,
    });

    const output = result.stdout || '';
    const lines = output.split('\n').filter(line => line.trim());

    // Filter out excepted items and false positives
    const issues = [];

    for (const line of lines) {
      // Skip empty lines
      if (!line.trim()) continue;

      // Skip lines that are just informational
      if (line.includes('(used in module)')) continue;

      // Check if this is excepted
      if (isExcepted(line, exceptions)) {
        if (options.verbose) {
          logInfo(`  Skipping excepted: ${line}`);
        }
        continue;
      }

      // Parse the line to get file and export info
      // Format: "src/file.ts:10 - exportName"
      const match = line.match(/^(.+?):(\d+) - (.+)$/);
      if (match) {
        const [, file, lineNum, exportName] = match;

        // Check if this specific export is excepted
        if (isExcepted(file, exceptions, exportName)) {
          if (options.verbose) {
            logInfo(`  Skipping excepted export: ${file}:${exportName}`);
          }
          continue;
        }

        // Skip common false positives
        // - default exports that are used via dynamic imports
        // - type exports (handled separately by TypeScript)
        if (exportName === 'default') {
          // Check if this might be a page component or lazy-loaded module
          if (file.includes('/pages/') || file.includes('/components/')) {
            // These are often dynamically imported, skip them
            if (options.verbose) {
              logInfo(`  Skipping potential dynamic import: ${file}`);
            }
            continue;
          }
        }

        issues.push({
          file: file,
          line: parseInt(lineNum, 10),
          export: exportName,
          raw: line,
        });
      } else if (line.trim() && !line.startsWith('npm') && !line.startsWith('>')) {
        // Capture any other relevant output
        issues.push({
          file: 'unknown',
          line: 0,
          export: 'unknown',
          raw: line,
        });
      }
    }

    return issues;
  } catch (error) {
    logWarning(`ts-prune failed: ${error.message}`);
    return [];
  }
}

/**
 * Run ESLint to find unused imports
 */
function runEslintUnusedImports(exceptions, fix = false) {
  if (options.verbose) {
    logInfo('Running ESLint to detect unused imports...');
  }

  try {
    // Build command args
    const args = [
      'eslint',
      'src',
      '--ext', 'ts,tsx',
      '--format', 'json',
    ];

    if (fix) {
      args.push('--fix');
    }

    const result = spawnSync('npx', args, {
      cwd: projectRoot,
      encoding: 'utf-8',
      shell: true,
    });

    const output = result.stdout || '';

    // Try to parse JSON output
    try {
      const results = JSON.parse(output);
      const issues = [];

      for (const fileResult of results) {
        if (!fileResult.messages || fileResult.messages.length === 0) continue;

        const filePath = fileResult.filePath.replace(projectRoot + '/', '');

        // Check if file is excepted
        if (isExcepted(filePath, exceptions)) {
          if (options.verbose) {
            logInfo(`  Skipping excepted file: ${filePath}`);
          }
          continue;
        }

        for (const message of fileResult.messages) {
          // Only capture unused-imports related messages
          if (message.ruleId && message.ruleId.startsWith('unused-imports/')) {
            const issueKey = `${filePath}:${message.message}`;
            if (isExcepted(issueKey, exceptions)) {
              continue;
            }

            issues.push({
              file: filePath,
              line: message.line,
              column: message.column,
              message: message.message,
              ruleId: message.ruleId,
              fixable: message.fix !== undefined,
            });
          }
        }
      }

      return issues;
    } catch {
      // If JSON parsing fails, return empty (likely no issues)
      return [];
    }
  } catch (error) {
    logWarning(`ESLint check failed: ${error.message}`);
    return [];
  }
}

/**
 * Check for orphaned files (files not imported anywhere)
 */
function findOrphanedFiles(exceptions) {
  if (options.verbose) {
    logInfo('Checking for orphaned files...');
  }

  try {
    // Get all source files
    const result = spawnSync(
      'find',
      ['src', '-name', '*.ts', '-o', '-name', '*.tsx'],
      {
        cwd: projectRoot,
        encoding: 'utf-8',
      }
    );

    const allFiles = (result.stdout || '').split('\n').filter(f => f.trim());
    const orphaned = [];

    // Entry points that are allowed to not be imported
    const entryPoints = [
      'src/main.tsx',
      'src/App.tsx',
      'src/vite-env.d.ts',
      'src/index.css', // Not a TS file but let's be safe
    ];

    for (const file of allFiles) {
      // Skip entry points
      if (entryPoints.some(e => file.endsWith(e.replace('src/', '')))) {
        continue;
      }

      // Skip if excepted
      if (isExcepted(file, exceptions)) {
        if (options.verbose) {
          logInfo(`  Skipping excepted file: ${file}`);
        }
        continue;
      }

      // Check if this file is imported anywhere
      const basename = file.split('/').pop().replace(/\.(ts|tsx)$/, '');
      const searchResult = spawnSync(
        'grep',
        ['-r', '-l', `from.*['"].*${basename}['"]`, 'src', '--include=*.ts', '--include=*.tsx'],
        {
          cwd: projectRoot,
          encoding: 'utf-8',
        }
      );

      const importingFiles = (searchResult.stdout || '').split('\n').filter(f => f.trim() && f !== file);

      if (importingFiles.length === 0) {
        // Double check with different import patterns
        const altSearchResult = spawnSync(
          'grep',
          ['-r', '-l', `import.*${basename}`, 'src', '--include=*.ts', '--include=*.tsx'],
          {
            cwd: projectRoot,
            encoding: 'utf-8',
          }
        );

        const altImportingFiles = (altSearchResult.stdout || '').split('\n').filter(f => f.trim() && f !== file);

        if (altImportingFiles.length === 0) {
          orphaned.push(file);
        }
      }
    }

    return orphaned;
  } catch (error) {
    logWarning(`Orphaned file check failed: ${error.message}`);
    return [];
  }
}

/**
 * Main scanner function
 */
async function scan() {
  log('\n' + '='.repeat(60), 'blue');
  log('  DEAD CODE SCANNER', 'bold');
  log('='.repeat(60) + '\n', 'blue');

  const exceptions = loadExceptions();

  if (options.verbose && (exceptions.files.length > 0 || exceptions.exports.length > 0 || exceptions.patterns.length > 0)) {
    logInfo(`Loaded ${exceptions.files.length} file exceptions, ${exceptions.exports.length} export exceptions, ${exceptions.patterns.length} patterns`);
  }

  const results = {
    unusedExports: [],
    unusedImports: [],
    orphanedFiles: [],
  };

  // Run all checks
  results.unusedExports = runTsPrune(exceptions);
  results.unusedImports = runEslintUnusedImports(exceptions, options.fix);
  results.orphanedFiles = findOrphanedFiles(exceptions);

  const totalIssues =
    results.unusedExports.length +
    results.unusedImports.length +
    results.orphanedFiles.length;

  // Output results
  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
    process.exit(totalIssues > 0 ? 1 : 0);
  }

  // Report unused exports
  if (results.unusedExports.length > 0) {
    log('\n📦 UNUSED EXPORTS:', 'yellow');
    log('-'.repeat(40));
    for (const issue of results.unusedExports) {
      log(`  ${issue.file}:${issue.line} - ${issue.export}`, 'red');
    }
  }

  // Report unused imports
  if (results.unusedImports.length > 0) {
    log('\n📥 UNUSED IMPORTS:', 'yellow');
    log('-'.repeat(40));
    for (const issue of results.unusedImports) {
      log(`  ${issue.file}:${issue.line} - ${issue.message}`, 'red');
      if (issue.fixable && !options.fix) {
        log(`    (run with --fix to auto-remove)`, 'cyan');
      }
    }
  }

  // Report orphaned files
  if (results.orphanedFiles.length > 0) {
    log('\n📄 POTENTIALLY ORPHANED FILES:', 'yellow');
    log('-'.repeat(40));
    for (const file of results.orphanedFiles) {
      log(`  ${file}`, 'red');
    }
  }

  // Summary
  log('\n' + '='.repeat(60), 'blue');

  if (totalIssues === 0) {
    logSuccess('No dead code detected! Codebase is clean.');
    log('='.repeat(60) + '\n', 'blue');
    process.exit(0);
  } else {
    logError(`Found ${totalIssues} dead code issue(s):`);
    log(`  - Unused exports: ${results.unusedExports.length}`);
    log(`  - Unused imports: ${results.unusedImports.length}`);
    log(`  - Orphaned files: ${results.orphanedFiles.length}`);
    log('');
    log('='.repeat(60), 'blue');
    log('\n⛔ COMMIT BLOCKED', 'red');
    log('\nTo resolve this:', 'yellow');
    log('  1. INVESTIGATE and REMOVE the dead code (preferred)', 'green');
    log('  2. If truly needed, add to .dead-code-exceptions.json (use sparingly!)', 'yellow');
    log('\nRun with --fix to auto-remove unused imports.\n');
    process.exit(1);
  }
}

// Run the scanner
scan().catch(error => {
  logError(`Scanner failed: ${error.message}`);
  process.exit(1);
});
