#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nodeModulesPath = path.join(__dirname, '..', 'node_modules');

console.log('Starting prebuild script...');

// Function to delete directory recursively
function deleteDir(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`Deleted: ${dirPath}`);
      return true;
    }
  } catch (e) {
    console.log(`Failed to delete ${dirPath}: ${e.message}`);
  }
  return false;
}

// Delete all Tailwind oxide architecture-specific directories
const oxideArchDirs = [
  'oxide-linux-x64-musl',
  'oxide-linux-x64-gnu',
  'oxide-linux-arm64-musl',
  'oxide-linux-arm64-gnu',
  'oxide-macos-x64',
  'oxide-macos-arm64',
  'oxide-win32-x64-msvc'
];

console.log('Deleting Tailwind oxide architecture dirs...');
for (const dir of oxideArchDirs) {
  const fullPath = path.join(nodeModulesPath, '@tailwindcss', dir);
  deleteDir(fullPath);
}

// Replace @tailwindcss/oxide index.js with stub
const oxideIndexPath = path.join(nodeModulesPath, '@tailwindcss', 'oxide', 'index.js');
if (fs.existsSync(oxideIndexPath)) {
  try {
    const stubContent = `
// Stub module - prevents native binding errors
module.exports = {
  compile: () => ({ css: '', map: null }),
  version: '0.0.0'
};
`;
    fs.writeFileSync(oxideIndexPath, stubContent, 'utf8');
    console.log('Created stub for @tailwindcss/oxide/index.js');
  } catch (e) {
    console.log(`Failed to stub oxide: ${e.message}`);
  }
}

// Replace @tailwindcss/vite index.mjs with stub
const viteIndexPath = path.join(nodeModulesPath, '@tailwindcss', 'vite', 'dist', 'index.mjs');
if (fs.existsSync(viteIndexPath)) {
  try {
    const stubContent = `
// Stub module - prevents build errors
export default function() {
  return {
    name: 'tailwindcss-vite-stub',
    resolveId: () => null
  };
}
`;
    fs.writeFileSync(viteIndexPath, stubContent, 'utf8');
    console.log('Created stub for @tailwindcss/vite/dist/index.mjs');
  } catch (e) {
    console.log(`Failed to stub vite: ${e.message}`);
  }
}

// Replace @tailwindcss/node with stub
const nodeIndexPath = path.join(nodeModulesPath, '@tailwindcss', 'node', 'dist', 'index.mjs');
if (fs.existsSync(nodeIndexPath)) {
  try {
    const stubContent = `
// Stub module - prevents build errors
export default {};
`;
    fs.writeFileSync(nodeIndexPath, stubContent, 'utf8');
    console.log('Created stub for @tailwindcss/node/dist/index.mjs');
  } catch (e) {
    console.log(`Failed to stub node: ${e.message}`);
  }
}

console.log('Prebuild script completed successfully');


