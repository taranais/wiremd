#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

function parseArgs(argv) {
  const args = { baseRef: null };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--base-ref') {
      args.baseRef = argv[index + 1];
      index += 1;
    }
  }

  if (!args.baseRef) {
    throw new Error('Missing required --base-ref argument.');
  }

  return args;
}

function getChangedFiles(baseRef) {
  const stdout = execFileSync('git', ['diff', '--name-only', `${baseRef}...HEAD`], {
    encoding: 'utf8',
  });

  return stdout.split('\n').map((line) => line.trim()).filter(Boolean);
}

function matchesSyntaxSensitivePath(file) {
  if (
    file === 'src/types.ts'
    || file === 'SYNTAX-SPEC-v0.2.md'
    || file === 'README.md'
    || file === 'QUICK-REFERENCE.md'
    || file === 'FAQ.md'
    || file === 'examples/showcase.md'
    || file === 'docs/guide/syntax.md'
    || file === 'syntax/manifest.json'
  ) {
    return true;
  }

  return file.startsWith('src/parser/')
    || file.startsWith('tests/conformance/')
    || file.startsWith('scripts/syntax-sync')
    || file === 'scripts/check-pr-syntax-declaration.mjs';
}

function parseDeclaration(body) {
  const match = body.match(/syntax-change:\s*(true|false)/i);
  return match ? match[1].toLowerCase() : null;
}

function fail(message) {
  console.error(`syntax-guardrail: ${message}`);
  process.exit(1);
}

const { baseRef } = parseArgs(process.argv.slice(2));
const changedFiles = getChangedFiles(baseRef);
const syntaxSensitiveFiles = changedFiles.filter(matchesSyntaxSensitivePath);

if (syntaxSensitiveFiles.length === 0) {
  console.log('syntax-guardrail: no syntax-sensitive files changed');
  process.exit(0);
}

const declaration = parseDeclaration(process.env.PR_BODY || '');
if (!declaration) {
  fail(`syntax-sensitive files changed (${syntaxSensitiveFiles.join(', ')}) but PR body is missing \`syntax-change: true\` or \`syntax-change: false\`.`);
}

if (declaration === 'false') {
  console.log('syntax-guardrail: syntax-change false declaration accepted');
  process.exit(0);
}

const implementationTouched = changedFiles.some((file) => file === 'src/types.ts' || file.startsWith('src/parser/'));
if (!implementationTouched) {
  console.log('syntax-guardrail: syntax-change true declaration accepted for non-parser syntax surfaces');
  process.exit(0);
}

const requirements = {
  manifest: changedFiles.includes('syntax/manifest.json'),
  spec: changedFiles.includes('SYNTAX-SPEC-v0.2.md'),
  conformance: changedFiles.some((file) => file.startsWith('tests/conformance/')),
  docs: changedFiles.some((file) => ['README.md', 'QUICK-REFERENCE.md', 'docs/guide/syntax.md', 'FAQ.md', 'examples/showcase.md'].includes(file)),
};

const missing = Object.entries(requirements)
  .filter(([, present]) => !present)
  .map(([label]) => label);

if (missing.length > 0) {
  fail(`parser or type changes were declared as syntax changes, but required sync surfaces are missing updates: ${missing.join(', ')}.`);
}

console.log('syntax-guardrail: syntax change declaration is consistent with changed files');
