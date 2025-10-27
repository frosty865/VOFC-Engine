// scripts/organize-scripts.js
const fs = require('fs');
const path = require('path');

// This script is intended to run from the scripts/ directory
const targetDir = __dirname;

const GROUPS = {
  checks: /^(check|audit|verify|analyze).*\.js$|^compare-local-vercel\.js$/,
  setup: /^(setup|populate|create|link|direct-populate).*\.js$/,
  fixes: /^(fix|apply|update|patch|clear).*\.js$/,
  test: /^(test|debug).*\.js$/,
  restore: /^restore.*\.js$/,
  sql: /\.sql$/
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Ensure destination folders exist
for (const dir of Object.keys(GROUPS)) {
  ensureDir(path.join(targetDir, dir));
}

const entries = fs.readdirSync(targetDir, { withFileTypes: true });

for (const entry of entries) {
  if (!entry.isFile()) continue; // skip directories

  const file = entry.name;

  for (const [dir, rx] of Object.entries(GROUPS)) {
    if (rx.test(file)) {
      const from = path.join(targetDir, file);
      const to = path.join(targetDir, dir, file);
      fs.renameSync(from, to);
      console.log(`Moved ${file} -> scripts/${dir}/`);
      break;
    }
  }
}

console.log('Organization complete! Review your scripts/ directory.');