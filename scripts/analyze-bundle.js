/**
 * Bundle Size Analyzer Script
 * Phase 6.5.3: Analyze and optimize bundle size
 * 
 * Usage: node scripts/analyze-bundle.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function analyzeDirectory(dir) {
  let totalSize = 0;
  const files = [];

  if (!fs.existsSync(dir)) {
    return { totalSize, files };
  }

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stats = fs.statSync(fullPath);

    if (stats.isFile()) {
      totalSize += stats.size;
      files.push({
        name: item,
        size: stats.size,
        path: fullPath,
      });
    } else if (stats.isDirectory()) {
      const subResult = analyzeDirectory(fullPath);
      totalSize += subResult.totalSize;
      files.push(...subResult.files);
    }
  }

  return { totalSize, files };
}

function main() {
  log('\n🔍 CreditMaster Pro - Bundle Size Analysis\n', colors.bright + colors.cyan);

  // Check if .next directory exists
  const nextDir = path.join(process.cwd(), '.next');
  if (!fs.existsSync(nextDir)) {
    log('❌ .next directory not found. Please run "npm run build" first.', colors.red);
    process.exit(1);
  }

  // Analyze static directory
  log('📦 Analyzing static assets...', colors.cyan);
  const staticDir = path.join(nextDir, 'static');
  const { totalSize: staticSize, files: staticFiles } = analyzeDirectory(staticDir);

  // Sort files by size
  staticFiles.sort((a, b) => b.size - a.size);

  // Display top 10 largest files
  log('\n📊 Top 10 Largest Static Files:', colors.bright);
  staticFiles.slice(0, 10).forEach((file, index) => {
    const color = file.size > 500000 ? colors.red : file.size > 200000 ? colors.yellow : colors.green;
    log(`${index + 1}. ${file.name} - ${formatBytes(file.size)}`, color);
  });

  log(`\n📦 Total Static Size: ${formatBytes(staticSize)}`, colors.bright);

  // Analyze chunks
  log('\n📦 Analyzing JavaScript chunks...', colors.cyan);
  const chunksDir = path.join(staticDir, 'chunks');
  const { totalSize: chunksSize, files: chunkFiles } = analyzeDirectory(chunksDir);

  // Sort chunks by size
  chunkFiles.sort((a, b) => b.size - a.size);

  log('\n📊 Top 10 Largest JavaScript Chunks:', colors.bright);
  chunkFiles.slice(0, 10).forEach((file, index) => {
    const color = file.size > 500000 ? colors.red : file.size > 200000 ? colors.yellow : colors.green;
    log(`${index + 1}. ${file.name} - ${formatBytes(file.size)}`, color);
  });

  log(`\n📦 Total Chunks Size: ${formatBytes(chunksSize)}`, colors.bright);

  // Recommendations
  log('\n💡 Optimization Recommendations:', colors.bright + colors.yellow);

  const largeChunks = chunkFiles.filter(f => f.size > 500000);
  if (largeChunks.length > 0) {
    log(`\n⚠️  Found ${largeChunks.length} chunks larger than 500KB:`, colors.yellow);
    largeChunks.forEach(chunk => {
      log(`   - ${chunk.name} (${formatBytes(chunk.size)})`, colors.yellow);
    });
    log('   Consider code splitting or lazy loading for these modules.', colors.yellow);
  }

  const totalBundleSize = staticSize;
  if (totalBundleSize > 5000000) {
    log('\n⚠️  Total bundle size exceeds 5MB. Consider:', colors.yellow);
    log('   - Implementing dynamic imports for large components', colors.yellow);
    log('   - Using next/dynamic for code splitting', colors.yellow);
    log('   - Removing unused dependencies', colors.yellow);
    log('   - Enabling compression (gzip/brotli)', colors.yellow);
  } else if (totalBundleSize > 3000000) {
    log('\n✅ Bundle size is acceptable but could be optimized further.', colors.green);
  } else {
    log('\n✅ Bundle size is excellent!', colors.green);
  }

  // Summary
  log('\n📈 Summary:', colors.bright + colors.cyan);
  log(`   Total Static Assets: ${formatBytes(staticSize)}`, colors.cyan);
  log(`   Total JS Chunks: ${formatBytes(chunksSize)}`, colors.cyan);
  log(`   Number of Chunks: ${chunkFiles.length}`, colors.cyan);
  log(`   Largest Chunk: ${chunkFiles[0] ? formatBytes(chunkFiles[0].size) : 'N/A'}`, colors.cyan);

  log('\n✨ Analysis complete!\n', colors.bright + colors.green);
}

main();

