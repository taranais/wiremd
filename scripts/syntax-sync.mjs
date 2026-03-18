#!/usr/bin/env node

import { checkRepo, generateRepo } from './syntax-sync-lib.mjs';

const command = process.argv[2];

if (!command || !['check', 'generate'].includes(command)) {
  console.error('Usage: node scripts/syntax-sync.mjs <check|generate>');
  process.exit(1);
}

if (command === 'generate') {
  generateRepo(process.cwd());
  console.log('syntax-sync: regenerated managed syntax blocks');
  process.exit(0);
}

const { errors } = checkRepo(process.cwd());

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`syntax-sync: ${error}`);
  }
  process.exit(1);
}

console.log('syntax-sync: check passed');
