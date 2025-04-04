const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create .husky directory if it doesn't exist
const huskyDir = path.join(__dirname, '..', '.husky');
if (!fs.existsSync(huskyDir)) {
    fs.mkdirSync(huskyDir);
}

// Initialize Husky
try {
    execSync('npx husky install', { stdio: 'inherit' });
    console.log('✅ Husky initialized successfully');
} catch (error) {
    console.error('❌ Failed to initialize Husky:', error);
    process.exit(1);
}

// Create pre-commit hook
const preCommitPath = path.join(huskyDir, 'pre-commit');
const preCommitContent = `#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint
npm test`;

try {
    fs.writeFileSync(preCommitPath, preCommitContent);
    fs.chmodSync(preCommitPath, 0o755); // Make executable
    console.log('✅ Pre-commit hook created successfully');
} catch (error) {
    console.error('❌ Failed to create pre-commit hook:', error);
    process.exit(1);
}

console.log('🎉 Husky setup completed!'); 