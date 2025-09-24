#!/usr/bin/env node

/**
 * Force Cache Refresh Script
 * 
 * This script adds a timestamp comment to a source file to force 
 * a new build hash and break any cached versions.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetFile = path.join(__dirname, 'src', 'lib', 'context.tsx');

// Read the current file
let content = fs.readFileSync(targetFile, 'utf8');

// Check if there's already a cache bust comment
const cacheRegex = /\/\* Cache bust: \d+ \*\//;
const timestamp = Date.now();

if (cacheRegex.test(content)) {
  // Replace existing cache bust comment
  content = content.replace(cacheRegex, `/* Cache bust: ${timestamp} */`);
} else {
  // Add new cache bust comment at the top
  content = `/* Cache bust: ${timestamp} */\n${content}`;
}

// Write the file back
fs.writeFileSync(targetFile, content);

console.log(`✅ Cache bust added: ${timestamp}`);
console.log(`📝 File updated: ${targetFile}`);
console.log(`🚀 Run 'npm run build' to generate new build files`);