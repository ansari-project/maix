#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 Final syntax fix pass...\n');

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Fix missing comma after closing brace before property
    const patterns = [
      // Fix pattern like: email: 'test@example.com'\n    expires:
      { 
        pattern: /email:\s*['"][^'"]*['"]\s*\n(\s*)expires:/g,
        replacement: "email: '$1',\n$2expires:"
      },
      // Fix pattern like: }\n    createdAt:
      { 
        pattern: /}\s*\n(\s+)(createdAt|updatedAt|isActive|email|password|specialty|bio|availability|portfolioUrl|linkedinUrl|githubUrl|skills|lastActiveAt|lastDigestSentAt):/g,
        replacement: '},\n$1$2:'
      },
      // Fix pattern like: email: 'test'\n    createdAt:
      {
        pattern: /(['"][^'"]*['"])\s*\n(\s+)(createdAt|updatedAt|isActive|email|password|specialty|bio|availability|portfolioUrl|linkedinUrl|githubUrl|skills|lastActiveAt|lastDigestSentAt):/g,
        replacement: '$1,\n$2$3:'
      }
    ];
    
    patterns.forEach(({ pattern, replacement }) => {
      const before = content;
      content = content.replace(pattern, replacement);
      if (before !== content) {
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}: ${error.message}`);
    return false;
  }
}

// Find all test files and fix them
const testFiles = glob.sync('src/**/*.test.{ts,tsx}', {
  cwd: path.join(__dirname, '..'),
  absolute: true
});

let fixedCount = 0;

testFiles.forEach((filePath) => {
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);
  
  if (fixFile(filePath)) {
    console.log(`✅ Fixed ${relativePath}`);
    fixedCount++;
  }
});

console.log(`\n✨ Fixed ${fixedCount} files with missing commas`);