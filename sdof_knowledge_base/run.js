#!/usr/bin/env node

/**
 * Helper script to run the SDOF Knowledge Base MCP Server
 * with proper Node.js flags for ESM compatibility
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if we're in development or production mode
const isDev = process.argv.includes('--dev');
const isSetupDb = process.argv.includes('--setup-db');

// Define the command to run
let command = 'node';
let args = [];

if (isDev) {
  // Development mode - use ts-node
  args = [
    '--loader=ts-node/esm',
    '--experimental-specifier-resolution=node',
    join(__dirname, 'src', 'index.ts')
  ];
} else if (isSetupDb) {
  // Setup database
  args = [
    '--loader=ts-node/esm',
    '--experimental-specifier-resolution=node',
    join(__dirname, 'src', 'scripts', 'setup-db.ts')
  ];
} else {
  // Production mode - use compiled JavaScript
  const distPath = join(__dirname, 'build', 'index.js');
  
  // Check if the dist directory exists
  if (!fs.existsSync(distPath)) {
    console.error('Error: Compiled JavaScript not found. Run "npm run build" first.');
    process.exit(1);
  }
  
  args = [
    '--experimental-specifier-resolution=node',
    distPath
  ];
}

// Spawn the process
const child = spawn(command, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: '--experimental-vm-modules'
  }
});

// Handle process events
child.on('close', (code) => {
  process.exit(code);
});

child.on('error', (err) => {
  console.error('Failed to start process:', err);
  process.exit(1);
});

// Handle termination signals
process.on('SIGINT', () => {
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});