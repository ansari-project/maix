#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 Fixing syntax errors from previous script...\n');

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Fix the pattern where we have },\n    createdAt (extra comma after closing brace)
    const pattern = /\},\s*,\s*\n/g;
    if (pattern.test(content)) {
      content = content.replace(pattern, '},\n');
      modified = true;
    }
    
    // Also fix double commas
    const doubleCommaPattern = /,\s*,/g;
    if (doubleCommaPattern.test(content)) {
      content = content.replace(doubleCommaPattern, ',');
      modified = true;
    }
    
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

// Files identified with syntax errors
const errorFiles = [
  'src/lib/mcp/middleware/__tests__/withAuthentication.test.ts',
  'src/lib/mcp/services/__tests__/pat.service.test.ts',
  'src/lib/mcp/services/__tests__/token.service.test.ts',
  'src/lib/__tests__/rbac-system.test.ts',
  'src/app/projects/[id]/__tests__/page.test.tsx',
  'src/app/my-projects/components/__tests__/MyProjectsClient.test.tsx',
  'src/app/api/questions/[id]/resolve/__tests__/route.test.ts',
  'src/app/api/projects/[id]/apply/__tests__/route.test.ts',
  'src/app/api/posts/[id]/comments/__tests__/route.test.ts',
  'src/app/api/posts/[id]/__tests__/route.test.ts',
  'src/app/api/feed/__tests__/route.test.ts',
  'src/app/api/auth/tokens/__tests__/route.test.ts',
  'src/app/api/auth/tokens/[id]/__tests__/route.test.ts',
  'src/app/api/auth/signup/__tests__/route.test.ts'
];

let fixedCount = 0;

errorFiles.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    if (fixFile(fullPath)) {
      console.log(`✅ Fixed ${file}`);
      fixedCount++;
    }
  }
});

console.log(`\n✨ Fixed ${fixedCount} files with syntax errors`);