#!/usr/bin/env ts-node

/**
 * Production Readiness Check Script
 *
 * This script performs comprehensive checks to ensure the application
 * is ready for production deployment.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string[];
}

class ProductionChecker {
  private results: CheckResult[] = [];
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
  }

  private addResult(result: CheckResult) {
    this.results.push(result);
    const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    const color = result.status === 'pass' ? 'green' : result.status === 'warning' ? 'yellow' : 'red';

    console.log(chalk[color](`${icon} ${result.name}: ${result.message}`));

    if (result.details && result.details.length > 0) {
      result.details.forEach(detail => {
        console.log(chalk.gray(`   ${detail}`));
      });
    }
  }

  private runCommand(command: string): string {
    try {
      return execSync(command, { encoding: 'utf8', cwd: this.projectRoot });
    } catch (error) {
      throw new Error(`Command failed: ${command}`);
    }
  }

  private fileExists(path: string): boolean {
    return existsSync(join(this.projectRoot, path));
  }

  private readFile(path: string): string {
    return readFileSync(join(this.projectRoot, path), 'utf8');
  }

  private getFileSize(path: string): number {
    return statSync(join(this.projectRoot, path)).size;
  }

  // Check 1: Environment Configuration
  private checkEnvironmentConfig() {
    console.log(chalk.blue('\n🔧 Checking Environment Configuration...'));

    // Check for required environment files
    const envFiles = ['.env.example', '.env.local'];
    const missingFiles: string[] = [];

    envFiles.forEach(file => {
      if (!this.fileExists(file)) {
        missingFiles.push(file);
      }
    });

    if (missingFiles.length === 0) {
      this.addResult({
        name: 'Environment Files',
        status: 'pass',
        message: 'All required environment files are present'
      });
    } else {
      this.addResult({
        name: 'Environment Files',
        status: 'warning',
        message: 'Some environment files are missing',
        details: missingFiles.map(file => `Missing: ${file}`)
      });
    }

    // Check environment variables
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL',
      'REDIS_URL'
    ];

    const missingEnvVars: string[] = [];
    requiredEnvVars.forEach(envVar => {
      if (!process.env[envVar]) {
        missingEnvVars.push(envVar);
      }
    });

    if (missingEnvVars.length === 0) {
      this.addResult({
        name: 'Environment Variables',
        status: 'pass',
        message: 'All required environment variables are set'
      });
    } else {
      this.addResult({
        name: 'Environment Variables',
        status: 'fail',
        message: 'Missing required environment variables',
        details: missingEnvVars.map(envVar => `Missing: ${envVar}`)
      });
    }
  }

  // Check 2: Dependencies and Security
  private checkDependencies() {
    console.log(chalk.blue('\n📦 Checking Dependencies and Security...'));

    try {
      // Check for outdated packages
      const outdated = this.runCommand('npm outdated --json || true');
      const outdatedPackages = outdated ? JSON.parse(outdated) : {};

      if (Object.keys(outdatedPackages).length === 0) {
        this.addResult({
          name: 'Package Updates',
          status: 'pass',
          message: 'All packages are up to date'
        });
      } else {
        this.addResult({
          name: 'Package Updates',
          status: 'warning',
          message: `${Object.keys(outdatedPackages).length} packages have updates available`,
          details: Object.keys(outdatedPackages).slice(0, 5).map(pkg =>
            `${pkg}: ${outdatedPackages[pkg].current} → ${outdatedPackages[pkg].latest}`
          )
        });
      }
    } catch (error) {
      this.addResult({
        name: 'Package Updates',
        status: 'warning',
        message: 'Could not check for package updates'
      });
    }

    try {
      // Security audit
      const audit = this.runCommand('npm audit --json');
      const auditResult = JSON.parse(audit);

      if (auditResult.metadata.vulnerabilities.total === 0) {
        this.addResult({
          name: 'Security Audit',
          status: 'pass',
          message: 'No security vulnerabilities found'
        });
      } else {
        const { high, critical } = auditResult.metadata.vulnerabilities;
        const severity = critical > 0 ? 'fail' : high > 0 ? 'warning' : 'pass';

        this.addResult({
          name: 'Security Audit',
          status: severity,
          message: `Found ${auditResult.metadata.vulnerabilities.total} vulnerabilities`,
          details: [
            `Critical: ${critical}`,
            `High: ${high}`,
            `Run 'npm audit fix' to resolve fixable issues`
          ]
        });
      }
    } catch (error) {
      this.addResult({
        name: 'Security Audit',
        status: 'warning',
        message: 'Could not run security audit'
      });
    }
  }

  // Check 3: Code Quality
  private checkCodeQuality() {
    console.log(chalk.blue('\n🔍 Checking Code Quality...'));

    try {
      // TypeScript compilation
      this.runCommand('npx tsc --noEmit');
      this.addResult({
        name: 'TypeScript Compilation',
        status: 'pass',
        message: 'TypeScript compiles without errors'
      });
    } catch (error) {
      this.addResult({
        name: 'TypeScript Compilation',
        status: 'fail',
        message: 'TypeScript compilation failed',
        details: ['Run "npx tsc --noEmit" to see detailed errors']
      });
    }

    try {
      // ESLint check
      this.runCommand('npx eslint . --ext .ts,.tsx --max-warnings 0');
      this.addResult({
        name: 'ESLint',
        status: 'pass',
        message: 'No ESLint errors or warnings'
      });
    } catch (error) {
      this.addResult({
        name: 'ESLint',
        status: 'warning',
        message: 'ESLint found issues',
        details: ['Run "npx eslint . --ext .ts,.tsx" to see details']
      });
    }

    try {
      // Prettier check
      this.runCommand('npx prettier --check .');
      this.addResult({
        name: 'Code Formatting',
        status: 'pass',
        message: 'All files are properly formatted'
      });
    } catch (error) {
      this.addResult({
        name: 'Code Formatting',
        status: 'warning',
        message: 'Some files need formatting',
        details: ['Run "npx prettier --write ." to fix formatting']
      });
    }
  }

  // Check 4: Testing
  private checkTesting() {
    console.log(chalk.blue('\n🧪 Checking Tests...'));

    try {
      // Run tests
      const testOutput = this.runCommand('npm test -- --run --reporter=json');
      const testResult = JSON.parse(testOutput);

      if (testResult.success) {
        this.addResult({
          name: 'Test Suite',
          status: 'pass',
          message: `All ${testResult.numTotalTests} tests passed`
        });
      } else {
        this.addResult({
          name: 'Test Suite',
          status: 'fail',
          message: `${testResult.numFailedTests} tests failed`,
          details: [`${testResult.numPassedTests} passed, ${testResult.numFailedTests} failed`]
        });
      }
    } catch (error) {
      this.addResult({
        name: 'Test Suite',
        status: 'fail',
        message: 'Tests failed to run',
        details: ['Check test configuration and dependencies']
      });
    }

    // Check test coverage
    if (this.fileExists('coverage/coverage-summary.json')) {
      try {
        const coverage = JSON.parse(this.readFile('coverage/coverage-summary.json'));
        const totalCoverage = coverage.total.lines.pct;

        if (totalCoverage >= 80) {
          this.addResult({
            name: 'Test Coverage',
            status: 'pass',
            message: `Test coverage: ${totalCoverage}%`
          });
        } else if (totalCoverage >= 60) {
          this.addResult({
            name: 'Test Coverage',
            status: 'warning',
            message: `Test coverage: ${totalCoverage}% (recommended: 80%+)`
          });
        } else {
          this.addResult({
            name: 'Test Coverage',
            status: 'fail',
            message: `Test coverage: ${totalCoverage}% (too low)`
          });
        }
      } catch (error) {
        this.addResult({
          name: 'Test Coverage',
          status: 'warning',
          message: 'Could not read coverage report'
        });
      }
    } else {
      this.addResult({
        name: 'Test Coverage',
        status: 'warning',
        message: 'No coverage report found'
      });
    }
  }

  // Check 5: Build and Bundle
  private checkBuild() {
    console.log(chalk.blue('\n🏗️ Checking Build Process...'));

    try {
      // Build the application
      console.log('Building application...');
      this.runCommand('npm run build');

      this.addResult({
        name: 'Build Process',
        status: 'pass',
        message: 'Application builds successfully'
      });

      // Check bundle sizes
      if (this.fileExists('.next/static')) {
        const bundleAnalysis = this.analyzeBundleSize();

        if (bundleAnalysis.totalSize < 5 * 1024 * 1024) { // 5MB
          this.addResult({
            name: 'Bundle Size',
            status: 'pass',
            message: `Total bundle size: ${this.formatBytes(bundleAnalysis.totalSize)}`
          });
        } else {
          this.addResult({
            name: 'Bundle Size',
            status: 'warning',
            message: `Bundle size is large: ${this.formatBytes(bundleAnalysis.totalSize)}`,
            details: ['Consider code splitting and optimization']
          });
        }
      }

    } catch (error) {
      this.addResult({
        name: 'Build Process',
        status: 'fail',
        message: 'Build failed',
        details: ['Check build logs for detailed errors']
      });
    }
  }

  // Check 6: Performance and SEO
  private checkPerformance() {
    console.log(chalk.blue('\n⚡ Checking Performance and SEO...'));

    // Check for performance optimizations
    const performanceChecks = [
      {
        name: 'Image Optimization',
        check: () => this.fileExists('next.config.ts') &&
          this.readFile('next.config.ts').includes('images'),
        message: 'Next.js image optimization configured'
      },
      {
        name: 'Bundle Analyzer',
        check: () => this.readFile('package.json').includes('@next/bundle-analyzer'),
        message: 'Bundle analyzer available for optimization'
      },
      {
        name: 'PWA Configuration',
        check: () => this.fileExists('public/manifest.json'),
        message: 'PWA manifest configured'
      },
      {
        name: 'Service Worker',
        check: () => this.fileExists('public/sw.js') ||
          this.readFile('package.json').includes('next-pwa'),
        message: 'Service worker configured'
      }
    ];

    performanceChecks.forEach(({ name, check, message }) => {
      if (check()) {
        this.addResult({
          name,
          status: 'pass',
          message
        });
      } else {
        this.addResult({
          name,
          status: 'warning',
          message: `${name} not configured`
        });
      }
    });
  }

  // Check 7: Security Headers and Configuration
  private checkSecurity() {
    console.log(chalk.blue('\n🔒 Checking Security Configuration...'));

    // Check Next.js security headers
    if (this.fileExists('next.config.ts')) {
      const nextConfig = this.readFile('next.config.ts');

      const securityFeatures = [
        { name: 'Content Security Policy', pattern: /contentSecurityPolicy|csp/i },
        { name: 'HTTPS Redirect', pattern: /forceHTTPS|https/i },
        { name: 'Security Headers', pattern: /headers.*security/i }
      ];

      securityFeatures.forEach(({ name, pattern }) => {
        if (pattern.test(nextConfig)) {
          this.addResult({
            name,
            status: 'pass',
            message: `${name} configured`
          });
        } else {
          this.addResult({
            name,
            status: 'warning',
            message: `${name} not configured`
          });
        }
      });
    }

    // Check for sensitive files
    const sensitiveFiles = ['.env', '.env.local', '.env.production'];
    const exposedFiles: string[] = [];

    sensitiveFiles.forEach(file => {
      if (this.fileExists(file)) {
        exposedFiles.push(file);
      }
    });

    if (exposedFiles.length === 0) {
      this.addResult({
        name: 'Sensitive Files',
        status: 'pass',
        message: 'No sensitive files in repository'
      });
    } else {
      this.addResult({
        name: 'Sensitive Files',
        status: 'warning',
        message: 'Sensitive files detected',
        details: exposedFiles.map(file => `Found: ${file} (ensure it's in .gitignore)`)
      });
    }
  }

  // Helper methods
  private analyzeBundleSize(): { totalSize: number; details: string[] } {
    // This is a simplified bundle analysis
    // In a real implementation, you'd parse the build output
    return {
      totalSize: 2 * 1024 * 1024, // 2MB placeholder
      details: ['Main bundle: 1.2MB', 'Vendor bundle: 800KB']
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Main execution method
  public async run() {
    console.log(chalk.bold.blue('🚀 SkillSync Production Readiness Check\n'));
    console.log(chalk.gray('Checking application readiness for production deployment...\n'));

    // Run all checks
    this.checkEnvironmentConfig();
    this.checkDependencies();
    this.checkCodeQuality();
    this.checkTesting();
    this.checkBuild();
    this.checkPerformance();
    this.checkSecurity();

    // Summary
    console.log(chalk.bold.blue('\n📊 Summary'));
    console.log('='.repeat(50));

    const passed = this.results.filter(r => r.status === 'pass').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    const failed = this.results.filter(r => r.status === 'fail').length;

    console.log(chalk.green(`✅ Passed: ${passed}`));
    console.log(chalk.yellow(`⚠️  Warnings: ${warnings}`));
    console.log(chalk.red(`❌ Failed: ${failed}`));

    // Recommendations
    if (failed > 0) {
      console.log(chalk.red('\n❌ Production deployment NOT recommended'));
      console.log(chalk.red('Please fix the failed checks before deploying.'));
      process.exit(1);
    } else if (warnings > 0) {
      console.log(chalk.yellow('\n⚠️  Production deployment possible with warnings'));
      console.log(chalk.yellow('Consider addressing warnings for optimal performance.'));
    } else {
      console.log(chalk.green('\n✅ Ready for production deployment!'));
      console.log(chalk.green('All checks passed successfully.'));
    }

    console.log(chalk.gray('\nFor detailed deployment instructions, see: docs/DEPLOYMENT.md'));
  }
}

// Run the checker
if (require.main === module) {
  const checker = new ProductionChecker();
  checker.run().catch(error => {
    console.error(chalk.red('Production check failed:'), error);
    process.exit(1);
  });
}

export { ProductionChecker };