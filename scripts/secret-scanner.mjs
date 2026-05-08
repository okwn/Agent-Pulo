#!/usr/bin/env node
// secret-scanner.mjs - Scan codebase for accidentally committed secrets

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { argv, exit } from 'process';

const PROJECT_ROOT = join(argv[1] || '.');
const EXTS_TO_CHECK = ['.ts', '.tsx', '.js', '.jsx', '.json', '.env', '.md', '.yaml', '.yml'];
const DIRS_TO_SKIP = ['node_modules', '.git', '.next', 'dist', 'build', 'coverage', '.pnpm'];
const FILES_TO_SKIP = ['package-lock.json', 'pnpm-lock.yaml'];

// Secret patterns
const PATTERNS = [
  {
    name: 'OpenAI API Key',
    pattern: /sk-[A-Za-z0-9]{20,}/,
    severity: 'critical',
    example: 'sk-abc123...def456',
  },
  {
    name: 'Anthropic API Key',
    pattern: /sk-ant-[A-Za-z0-9]{20,}/,
    severity: 'critical',
    example: 'sk-ant-api03-...',
  },
  {
    name: 'Neynar API Key',
    pattern: /NEYNAR_[A-Z0-9]{20,}/,
    severity: 'critical',
    example: 'NEYNAR_REACT_...',
  },
  {
    name: 'Private Key / Seed Phrase',
    pattern: /0x[a-fA-F0-9]{64}/,
    severity: 'critical',
    example: '0x1234...abcd (do not include)',
  },
  {
    name: 'Base58 Private Key',
    pattern: /[5KL][1-9A-HJ-NP-Za-km-z]{50,52}/,
    severity: 'critical',
    example: 'Labcd...1234',
  },
  {
    name: 'JWT Token',
    pattern: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/,
    severity: 'critical',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  },
  {
    name: 'GitHub Token',
    pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/,
    severity: 'critical',
    example: 'ghp_abc123...xyz789',
  },
  {
    name: 'Slack Token',
    pattern: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*/,
    severity: 'critical',
    example: 'xoxb-1234567890123-...',
  },
  {
    name: 'AWS Access Key',
    pattern: /AKIA[A-Z0-9]{16}/,
    severity: 'critical',
    example: 'AKIAIOSFODNN7EXAMPLE',
  },
  {
    name: 'Generic API Key',
    pattern: /api[_-]?key["\s:=]+['"]?[a-zA-Z0-9]{20,}['"]?/i,
    severity: 'high',
    example: 'api_key = "abc123..."',
  },
  {
    name: 'Generic Secret',
    pattern: /secret[pwd]?["\s:=]+['"]?[a-zA-Z0-9]{16,}['"]?/i,
    severity: 'high',
    example: 'secret = "supersecretvalue123"',
  },
  {
    name: 'Bearer Token',
    pattern: /bearer["\s]+[a-zA-Z0-9_.-]{20,}/i,
    severity: 'high',
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  },
  {
    name: 'Database URL with Password',
    pattern: /(postgresql|mysql|mongodb):\/\/[^@]+:[^@]+@/i,
    severity: 'high',
    example: 'postgresql://user:password@host/...',
  },
  {
    name: 'Discord Token',
    pattern: /[MN][A-Za-z\\d]{23,}\.[\w-]{6}\.[\w-]{27}/,
    severity: 'critical',
    example: 'MTE4...gYIz.token',
  },
  {
    name: 'Telegram Bot Token',
    pattern: /\d{8,}:[A-Za-z0-9_-]{35}/,
    severity: 'critical',
    example: '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ',
  },
  {
    name: 'FarcasterSigner UUID',
    pattern: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    severity: 'high',
    example: 'uuid-v4-format-here',
  },
];

function shouldSkipFile(filepath) {
  const filename = filepath.split('/').pop();
  if (FILES_TO_SKIP.includes(filename)) return true;

  const ext = '.' + filename.split('.').pop();
  if (!EXTS_TO_CHECK.includes(ext)) return false; // Don't skip unknown extensions

  return false;
}

function shouldSkipDir(dirname) {
  return DIRS_TO_SKIP.includes(dirname);
}

function scanFile(filepath) {
  const findings = [];

  try {
    const content = readFileSync(filepath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, lineNum) => {
      PATTERNS.forEach(({ name, pattern, severity, example }) => {
        if (pattern.test(line)) {
          // Get context (line content without actual secret for display)
          const displayLine = line
            .replace(/sk-[A-Za-z0-9]{20,}/, 'sk-***REDACTED***')
            .replace(/sk-ant-[A-Za-z0-9]{20,}/, 'sk-ant-***REDACTED***')
            .replace(/NEYNAR_[A-Z0-9]{20,}/, 'NEYNAR_***REDACTED***')
            .replace(/0x[a-fA-F0-9]{64}/, '0x***REDACTED***')
            .replace(/eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/, '***JWT***')
            .replace(/gh[pousr]_[A-Za-z0-9_]{36,}/, 'gh***REDACTED***')
            .replace(/"[a-zA-Z0-9]{20,}"/g, '"***REDACTED***')
            .replace(/'[a-zA-Z0-9]{20,}'/g, "'***REDACTED***");

          findings.push({
            file: relative(PROJECT_ROOT, filepath),
            line: lineNum + 1,
            name,
            severity,
            preview: displayLine.trim().substring(0, 100),
            example,
          });
        }
      });
    });
  } catch (err) {
    // Skip files that can't be read
  }

  return findings;
}

function walkDir(dir, results = []) {
  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        if (!shouldSkipDir(entry)) {
          walkDir(fullPath, results);
        }
      } else if (stat.isFile()) {
        if (!shouldSkipFile(fullPath)) {
          const findings = scanFile(fullPath);
          if (findings.length > 0) {
            results.push(...findings);
          }
        }
      }
    }
  } catch (err) {
    // Skip directories that can't be read
  }

  return results;
}

function main() {
  console.log('\n🔒 PULO Secret Scanner\n' + '─'.repeat(50));
  console.log(`Scanning: ${PROJECT_ROOT}\n`);

  const findings = walkDir(PROJECT_ROOT);

  if (findings.length === 0) {
    console.log('✅ No secrets detected!');
    console.log('\nFiles scanned include .ts, .js, .json, .env, .md, .yaml files');
    console.log('Excluded: node_modules, .git, dist, build, coverage\n');
    exit(0);
  }

  // Group by severity
  const bySeverity = {
    critical: findings.filter(f => f.severity === 'critical'),
    high: findings.filter(f => f.severity === 'high'),
    medium: findings.filter(f => f.severity === 'medium'),
  };

  console.log(`⚠️  Found ${findings.length} potential secret(s)\n`);

  if (bySeverity.critical.length > 0) {
    console.log('🔴 CRITICAL (rotate immediately):');
    bySeverity.critical.forEach(f => {
      console.log(`   ${f.file}:${f.line}`);
      console.log(`   Type: ${f.name}`);
      console.log(`   Preview: ${f.preview}\n`);
    });
  }

  if (bySeverity.high.length > 0) {
    console.log('🟠 HIGH (review and remove):');
    bySeverity.high.forEach(f => {
      console.log(`   ${f.file}:${f.line}`);
      console.log(`   Type: ${f.name}`);
      console.log(`   Preview: ${f.preview}\n`);
    });
  }

  console.log('─'.repeat(50));
  console.log('\n📋 Recommended Actions:');
  console.log('1. Rotate any exposed API keys/secrets immediately');
  console.log('2. Remove secrets from code and history (git filter-branch or BFG)');
  console.log('3. Add secrets to .gitignore if accidentally tracked');
  console.log('4. Use environment variables or a secret manager instead');
  console.log('\n💡 For pre-commit hooks, consider: https://gitguardian.com\n');

  exit(1);
}

main();