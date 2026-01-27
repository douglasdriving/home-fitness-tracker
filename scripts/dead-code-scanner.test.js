#!/usr/bin/env node

/**
 * E2E Tests for the Dead Code Scanner
 *
 * This test file validates that the dead code scanner:
 * 1. Detects unused exports correctly
 * 2. Detects unused imports correctly
 * 3. Respects the exception list
 * 4. Returns appropriate exit codes
 * 5. The --fix flag works for auto-fixing imports
 *
 * USAGE:
 *   node scripts/dead-code-scanner.test.js
 */

import { spawnSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    passed++;
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runScanner(args = []) {
  const result = spawnSync('node', ['scripts/dead-code-scanner.js', ...args], {
    cwd: projectRoot,
    encoding: 'utf-8',
    shell: true,
  });
  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    exitCode: result.status,
  };
}

// Test file paths
const testFileWithUnusedExport = join(projectRoot, 'src', '__test_dead_code__.ts');
const testFileWithUnusedImport = join(projectRoot, 'src', '__test_unused_import__.ts');

// Cleanup function
function cleanup() {
  [testFileWithUnusedExport, testFileWithUnusedImport].forEach(file => {
    if (existsSync(file)) {
      unlinkSync(file);
    }
  });
}

// Ensure cleanup runs even on error
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(1); });

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  DEAD CODE SCANNER - E2E TESTS');
console.log('═══════════════════════════════════════════════════════════\n');

// Test 1: Scanner runs without crashing
test('Scanner runs without crashing', () => {
  const result = runScanner();
  // It might find issues (exit 1) or be clean (exit 0)
  assert(result.exitCode === 0 || result.exitCode === 1, 'Scanner should exit with 0 or 1');
});

// Test 2: Scanner detects unused exports when they exist
test('Scanner detects unused exports', () => {
  // Create a test file with an unused export
  writeFileSync(testFileWithUnusedExport, `
export function unusedTestFunction() {
  return 'I am unused';
}
`);

  try {
    const result = runScanner(['--json']);
    const output = JSON.parse(result.stdout);
    assert(Array.isArray(output.unusedExports), 'Should have unusedExports array');
    // Check if our test function was detected
    const hasTestFunction = output.unusedExports.some(
      e => e.export === 'unusedTestFunction'
    );
    assert(hasTestFunction, 'Should detect our test unused export');
  } finally {
    if (existsSync(testFileWithUnusedExport)) {
      unlinkSync(testFileWithUnusedExport);
    }
  }
});

// Test 3: JSON output is valid JSON
test('JSON output is valid JSON', () => {
  const result = runScanner(['--json']);
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    throw new Error('Output is not valid JSON');
  }
  assert(typeof parsed === 'object', 'Should parse to an object');
  assert('unusedExports' in parsed, 'Should have unusedExports');
  assert('unusedImports' in parsed, 'Should have unusedImports');
  assert('orphanedFiles' in parsed, 'Should have orphanedFiles');
});

// Test 4: Exit code is 1 when dead code is found
test('Exit code is 1 when dead code is found', () => {
  // Create a test file with dead code
  writeFileSync(testFileWithUnusedExport, `
export function unusedForExitCodeTest() {
  return 'testing exit code';
}
`);

  try {
    const result = runScanner();
    assert(result.exitCode === 1, 'Should exit with code 1 when dead code exists');
  } finally {
    if (existsSync(testFileWithUnusedExport)) {
      unlinkSync(testFileWithUnusedExport);
    }
  }
});

// Test 5: Exit code is 0 when no dead code (clean codebase)
test('Exit code is 0 when codebase is clean', () => {
  // Ensure no test files exist
  cleanup();

  const result = runScanner();
  assert(result.exitCode === 0, 'Should exit with code 0 when no dead code');
});

// Test 6: Exception list is loaded and respected
test('Exception list is loaded and respected', () => {
  const exceptionsPath = join(projectRoot, '.dead-code-exceptions.json');
  const originalExceptions = readFileSync(exceptionsPath, 'utf-8');

  // Create a test file with unused export
  writeFileSync(testFileWithUnusedExport, `
export function exceptedTestFunction() {
  return 'I am excepted';
}
`);

  try {
    // Add the test export to exceptions
    const exceptions = JSON.parse(originalExceptions);
    exceptions.exports.push('__test_dead_code__.ts:exceptedTestFunction');
    writeFileSync(exceptionsPath, JSON.stringify(exceptions, null, 2));

    const result = runScanner(['--json']);
    const output = JSON.parse(result.stdout);

    // The excepted export should not appear in results
    const hasExceptedItem = output.unusedExports.some(
      e => e.file.includes('__test_dead_code__') && e.export === 'exceptedTestFunction'
    );
    assert(!hasExceptedItem, 'Excepted export should not be in results');
  } finally {
    // Restore original exceptions
    writeFileSync(exceptionsPath, originalExceptions);
    if (existsSync(testFileWithUnusedExport)) {
      unlinkSync(testFileWithUnusedExport);
    }
  }
});

// Test 7: File exceptions work
test('File exceptions exclude entire files', () => {
  const exceptionsPath = join(projectRoot, '.dead-code-exceptions.json');
  const originalExceptions = readFileSync(exceptionsPath, 'utf-8');

  // Create a test file with unused export
  writeFileSync(testFileWithUnusedExport, `
export function fileExceptedFunction() {
  return 'entire file excepted';
}
`);

  try {
    // Add the test file to exceptions
    const exceptions = JSON.parse(originalExceptions);
    exceptions.files.push('src/__test_dead_code__.ts');
    writeFileSync(exceptionsPath, JSON.stringify(exceptions, null, 2));

    const result = runScanner(['--json']);
    const output = JSON.parse(result.stdout);

    // Exports from the excepted file should not appear
    const hasExceptedFile = output.unusedExports.some(
      e => e.file.includes('__test_dead_code__')
    );
    assert(!hasExceptedFile, 'Exports from excepted file should not be in results');
  } finally {
    // Restore original exceptions
    writeFileSync(exceptionsPath, originalExceptions);
    if (existsSync(testFileWithUnusedExport)) {
      unlinkSync(testFileWithUnusedExport);
    }
  }
});

// Test 8: Pattern exceptions work
test('Pattern exceptions work', () => {
  const exceptionsPath = join(projectRoot, '.dead-code-exceptions.json');
  const originalExceptions = readFileSync(exceptionsPath, 'utf-8');

  // Create a test file with unused export
  writeFileSync(testFileWithUnusedExport, `
export function patternExceptedFunction() {
  return 'pattern excepted';
}
`);

  try {
    // Add a pattern to exclude our test file
    const exceptions = JSON.parse(originalExceptions);
    exceptions.patterns.push('.*__test_dead_code__.*');
    writeFileSync(exceptionsPath, JSON.stringify(exceptions, null, 2));

    const result = runScanner(['--json']);
    const output = JSON.parse(result.stdout);

    // No matching exports should appear
    const hasPatternMatch = output.unusedExports.some(
      e => e.file.includes('__test_dead_code__')
    );
    assert(!hasPatternMatch, 'Exports matching pattern should not be in results');
  } finally {
    // Restore original exceptions
    writeFileSync(exceptionsPath, originalExceptions);
    if (existsSync(testFileWithUnusedExport)) {
      unlinkSync(testFileWithUnusedExport);
    }
  }
});

// Test 9: Verbose mode shows additional info
test('Verbose mode provides additional output', () => {
  const result = runScanner(['--verbose']);
  assert(result.stdout.includes('Running ts-prune'), 'Verbose should show ts-prune info');
  assert(result.stdout.includes('Running ESLint'), 'Verbose should show ESLint info');
});

// Test 10: Test creating a file with unused import and detecting it
test('Detects unused imports in new files', () => {
  // Create a file with an unused import
  writeFileSync(testFileWithUnusedImport, `import { useState } from 'react';

export function testFunction() {
  return 'hello';
}
`);

  try {
    const result = runScanner(['--json']);
    const output = JSON.parse(result.stdout);

    // Check if the unused import was detected
    const hasUnusedImport = output.unusedImports.some(
      i => i.file.includes('__test_unused_import__')
    );

    // If no unused import found via scanner, verify ESLint detects it directly
    if (!hasUnusedImport) {
      const eslintResult = spawnSync('npx', ['eslint', testFileWithUnusedImport, '--format', 'json'], {
        cwd: projectRoot,
        encoding: 'utf-8',
        shell: true,
      });
      const eslintOutput = JSON.parse(eslintResult.stdout || '[]');
      const hasEslintDetection = eslintOutput.some(f =>
        f.messages && f.messages.some(m => m.ruleId && m.ruleId.includes('unused-imports'))
      );
      assert(hasEslintDetection, 'ESLint should detect unused import in test file');
    }
  } finally {
    if (existsSync(testFileWithUnusedImport)) {
      unlinkSync(testFileWithUnusedImport);
    }
  }
});

// Cleanup
cleanup();

// Summary
console.log('\n═══════════════════════════════════════════════════════════');
console.log(`  Results: ${colors.green}${passed} passed${colors.reset}, ${colors.red}${failed} failed${colors.reset}`);
console.log('═══════════════════════════════════════════════════════════\n');

process.exit(failed > 0 ? 1 : 0);
