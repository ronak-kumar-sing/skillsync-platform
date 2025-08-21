#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

// Test runner script for comprehensive testing
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = (message: string, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

const runCommand = (command: string, description: string) => {
  log(`\n${colors.bright}${colors.blue}Running: ${description}${colors.reset}`);
  log(`${colors.cyan}Command: ${command}${colors.reset}`);

  try {
    const output = execSync(command, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    log(`${colors.green}✓ ${description} completed successfully${colors.reset}`);
    return true;
  } catch (error) {
    log(`${colors.red}✗ ${description} failed${colors.reset}`);
    return false;
  }
};

const checkPrerequisites = () => {
  log(`${colors.bright}${colors.magenta}Checking prerequisites...${colors.reset}`);

  const requiredFiles = [
    'vitest.config.ts',
    'src/__tests__/setup.ts',
    'package.json',
  ];

  for (const file of requiredFiles) {
    if (!existsSync(path.join(process.cwd(), file))) {
      log(`${colors.red}✗ Required file missing: ${file}${colors.reset}`);
      return false;
    }
  }

  log(`${colors.green}✓ All prerequisites met${colors.reset}`);
  return true;
};

const main = async () => {
  log(`${colors.bright}${colors.magenta}SkillSync Platform - Comprehensive Test Suite${colors.reset}`);
  log(`${colors.cyan}Starting test execution...${colors.reset}\n`);

  if (!checkPrerequisites()) {
    process.exit(1);
  }

  const testSuites = [
    {
      name: 'Unit Tests - Utilities',
      command: 'npm run test:run -- src/__tests__/utils.test.ts',
      description: 'Testing utility functions',
    },
    {
      name: 'Unit Tests - Authentication',
      command: 'npm run test:run -- src/__tests__/auth.test.ts',
      description: 'Testing authentication library',
    },
    {
      name: 'Unit Tests - Validation',
      command: 'npm run test:run -- src/__tests__/validation.test.ts',
      description: 'Testing validation library',
    },
    {
      name: 'Algorithm Tests - Matching',
      command: 'npm run test:run -- src/__tests__/matching-algorithm.test.ts',
      description: 'Testing AI matching algorithm',
    },
    {
      name: 'Integration Tests - API',
      command: 'npm run test:run -- src/__tests__/api-integration.test.ts',
      description: 'Testing API endpoints',
    },
    {
      name: 'Component Tests',
      command: 'npm run test:run -- src/__tests__/components.test.tsx',
      description: 'Testing React components',
    },
    {
      name: 'End-to-End Tests',
      command: 'npm run test:run -- src/__tests__/e2e-flows.test.ts',
      description: 'Testing critical user flows',
    },
  ];

  const results: Array<{ name: string; success: boolean }> = [];

  for (const suite of testSuites) {
    const success = runCommand(suite.command, suite.description);
    results.push({ name: suite.name, success });
  }

  // Summary
  log(`\n${colors.bright}${colors.magenta}Test Execution Summary${colors.reset}`);
  log('='.repeat(50));

  let totalTests = 0;
  let passedTests = 0;

  results.forEach(({ name, success }) => {
    totalTests++;
    if (success) {
      passedTests++;
      log(`${colors.green}✓ ${name}${colors.reset}`);
    } else {
      log(`${colors.red}✗ ${name}${colors.reset}`);
    }
  });

  log('='.repeat(50));
  log(`${colors.bright}Total: ${totalTests} | Passed: ${colors.green}${passedTests}${colors.reset}${colors.bright} | Failed: ${colors.red}${totalTests - passedTests}${colors.reset}`);

  if (passedTests === totalTests) {
    log(`${colors.green}${colors.bright}🎉 All tests passed!${colors.reset}`);

    // Run coverage report
    log(`\n${colors.bright}${colors.blue}Generating coverage report...${colors.reset}`);
    runCommand('npm run test:coverage', 'Coverage report generation');

    process.exit(0);
  } else {
    log(`${colors.red}${colors.bright}❌ Some tests failed. Please check the output above.${colors.reset}`);
    process.exit(1);
  }
};

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  log(`${colors.bright}SkillSync Test Runner${colors.reset}`);
  log('Usage: npm run test:all [options]');
  log('\nOptions:');
  log('  --help, -h     Show this help message');
  log('  --watch, -w    Run tests in watch mode');
  log('  --coverage     Run with coverage report');
  log('  --verbose      Run with verbose output');
  process.exit(0);
}

if (args.includes('--watch') || args.includes('-w')) {
  log(`${colors.bright}${colors.blue}Running tests in watch mode...${colors.reset}`);
  runCommand('npm run test', 'Watch mode');
  process.exit(0);
}

if (args.includes('--coverage')) {
  log(`${colors.bright}${colors.blue}Running tests with coverage...${colors.reset}`);
  runCommand('npm run test:coverage', 'Coverage mode');
  process.exit(0);
}

// Run main test suite
main().catch((error) => {
  log(`${colors.red}Test runner failed: ${error.message}${colors.reset}`);
  process.exit(1);
});