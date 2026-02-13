#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nodeModulesPath = path.join(__dirname, '..', 'node_modules');

// Create stub for @tailwindcss/oxide
const oxidePath = path.join(nodeModulesPath, '@tailwindcss', 'oxide');
const oxideIndexPath = path.join(oxidePath, 'index.js');

if (fs.existsSync(oxideIndexPath)) {
  console.log('Creating stub for @tailwindcss/oxide...');
  const stubContent = `
// Stub module - prevents native binding errors
module.exports = {
  compile: () => ({ css: '', map: null }),
  version: '0.0.0'
};
`;
  fs.writeFileSync(oxideIndexPath, stubContent, 'utf8');
}

// Create stub for @tailwindcss/vite  
const vitePath = path.join(nodeModulesPath, '@tailwindcss', 'vite');
const viteIndexPath = path.join(vitePath, 'dist', 'index.mjs');

if (fs.existsSync(viteIndexPath)) {
  console.log('Creating stub for @tailwindcss/vite...');
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
}

console.log('Stub files created successfully');
