#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 Starting systematic TypeScript test fixes...\n');

const fixes = {
  // Fix 1: Replace string literals with enum imports
  enumFixes: [
    { pattern: /status:\s*['"]NOT_STARTED['"]/g, replacement: 'status: TodoStatus.NOT_STARTED' },
    { pattern: /status:\s*['"]IN_PROGRESS['"]/g, replacement: 'status: TodoStatus.IN_PROGRESS' },
    { pattern: /status:\s*['"]WAITING_FOR['"]/g, replacement: 'status: TodoStatus.WAITING_FOR' },
    { pattern: /status:\s*['"]COMPLETED['"]/g, replacement: 'status: TodoStatus.COMPLETED' },
    // Legacy values that might still exist
    { pattern: /status:\s*['"]OPEN['"]/g, replacement: 'status: TodoStatus.NOT_STARTED' },
    { pattern: /status:\s*['"]DONE['"]/g, replacement: 'status: TodoStatus.COMPLETED' }
  ],
  
  // Fix 2: Prisma mock casting patterns
  prismaMocks: [
    // Fix mockPrisma patterns
    { 
      pattern: /mockPrisma\.(\w+)\.(\w+)\.(mock\w+)\(/g,
      replacement: ';(prisma.$1.$2 as jest.Mock).$3('
    },
    // Fix direct .mock access
    {
      pattern: /prisma\.(\w+)\.(\w+)\.mock([^a-zA-Z])/g,
      replacement: '(prisma.$1.$2 as jest.Mock).mock$3'
    },
    // Fix Promise-wrapped params in route tests
    {
      pattern: /{ params: mockParams }/g,
      replacement: '{ params: Promise.resolve(mockParams) }'
    }
  ],
  
  // Fix 3: Complete mock objects with required fields
  userMockFixes: [
    {
      // Find user mocks that are missing required fields
      pattern: /const\s+(mock(?:User|Creator|Assignee))\s*=\s*{([^}]+)}/g,
      process: (match, varName, content) => {
        const requiredFields = [
          'createdAt: new Date()',
          'updatedAt: new Date()',
          'isActive: true',
          'email: \'test@example.com\'',
          'password: null',
          'specialty: null',
          'bio: null',
          'availability: null',
          'portfolioUrl: null',
          'linkedinUrl: null',
          'githubUrl: null',
          'skills: []',
          'lastActiveAt: new Date()',
          'lastDigestSentAt: null'
        ];
        
        // Check which fields are missing
        const missingFields = requiredFields.filter(field => {
          const fieldName = field.split(':')[0].trim();
          return !content.includes(fieldName);
        });
        
        if (missingFields.length > 0) {
          // Add missing fields
          return `const ${varName} = {${content},\n    ${missingFields.join(',\n    ')}\n  }`;
        }
        return match;
      }
    }
  ],
  
  // Fix 4: Session mock fixes
  sessionFixes: [
    {
      pattern: /const\s+mockSession\s*=\s*{([^}]+)}/g,
      process: (match, content) => {
        if (!content.includes('expires')) {
          const expiresDate = 'new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()';
          return `const mockSession = {${content},\n    expires: ${expiresDate}\n  }`;
        }
        return match;
      }
    }
  ],
  
  // Fix 5: Add missing imports
  importFixes: {
    todoStatus: "import { TodoStatus } from '@prisma/client'",
    session: "import type { Session } from 'next-auth'"
  }
};

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    const changes = [];
    
    // Skip if file is already fixed (has a marker comment)
    if (content.includes('// TypeScript test fixes applied')) {
      return { fixed: false, skipped: true };
    }
    
    // Apply enum fixes and add TodoStatus import if needed
    fixes.enumFixes.forEach(fix => {
      if (fix.pattern.test(content)) {
        content = content.replace(fix.pattern, fix.replacement);
        modified = true;
        changes.push('Fixed enum string literals');
        
        // Add TodoStatus import if not present
        if (!content.includes("import { TodoStatus") && 
            !content.includes("import { TodoStatus,") &&
            !content.includes("TodoStatus }") &&
            !content.includes("TodoStatus,")) {
          // Find the first import statement
          const firstImportIndex = content.indexOf('import ');
          if (firstImportIndex !== -1) {
            content = content.slice(0, firstImportIndex) + 
                     fixes.importFixes.todoStatus + '\n' + 
                     content.slice(firstImportIndex);
            changes.push('Added TodoStatus import');
          }
        }
      }
    });
    
    // Apply Prisma mock fixes
    fixes.prismaMocks.forEach(fix => {
      const before = content;
      content = content.replace(fix.pattern, fix.replacement);
      if (before !== content) {
        modified = true;
        changes.push('Fixed Prisma mock patterns');
      }
    });
    
    // Apply user mock fixes
    fixes.userMockFixes.forEach(fix => {
      const matches = [...content.matchAll(fix.pattern)];
      matches.forEach(match => {
        const replacement = fix.process(...match);
        if (replacement !== match[0]) {
          content = content.replace(match[0], replacement);
          modified = true;
          changes.push('Completed user mock objects');
        }
      });
    });
    
    // Apply session fixes
    fixes.sessionFixes.forEach(fix => {
      const matches = [...content.matchAll(fix.pattern)];
      matches.forEach(match => {
        const replacement = fix.process(...match);
        if (replacement !== match[0]) {
          content = content.replace(match[0], replacement);
          modified = true;
          changes.push('Fixed session mock');
        }
      });
    });
    
    // Special case: Fix role property issues in Sidebar tests
    if (filePath.includes('Sidebar.test')) {
      content = content.replace(/role:\s*['"]ADMIN['"]/g, '// role removed - not in User type');
      content = content.replace(/role:\s*['"]USER['"]/g, '// role removed - not in User type');
      if (content.includes('// role removed')) {
        modified = true;
        changes.push('Removed invalid role property');
      }
    }
    
    if (modified) {
      // Add marker comment
      if (!content.includes('// TypeScript test fixes applied')) {
        content = '// TypeScript test fixes applied\n' + content;
      }
      
      fs.writeFileSync(filePath, content);
      return { fixed: true, changes };
    }
    
    return { fixed: false };
  } catch (error) {
    return { error: error.message };
  }
}

// Find all test files
const testFiles = glob.sync('src/**/*.test.{ts,tsx}', {
  cwd: path.join(__dirname, '..'),
  absolute: true
});

console.log(`Found ${testFiles.length} test files to process\n`);

let fixedCount = 0;
let skippedCount = 0;
let errorCount = 0;

testFiles.forEach((filePath) => {
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);
  const result = processFile(filePath);
  
  if (result.error) {
    console.log(`❌ Error in ${relativePath}: ${result.error}`);
    errorCount++;
  } else if (result.skipped) {
    console.log(`⏭️  Skipped ${relativePath} (already fixed)`);
    skippedCount++;
  } else if (result.fixed) {
    console.log(`✅ Fixed ${relativePath}`);
    result.changes.forEach(change => console.log(`   - ${change}`));
    fixedCount++;
  }
});

console.log('\n📊 Summary:');
console.log(`   Fixed: ${fixedCount} files`);
console.log(`   Skipped: ${skippedCount} files`);
console.log(`   Errors: ${errorCount} files`);
console.log(`   Total: ${testFiles.length} files`);

if (fixedCount > 0) {
  console.log('\n✨ TypeScript test fixes applied successfully!');
  console.log('Next steps:');
  console.log('1. Run: npm run build');
  console.log('2. Run: npm test');
  console.log('3. Commit the changes');
} else if (skippedCount === testFiles.length) {
  console.log('\n✅ All test files have already been fixed!');
} else {
  console.log('\n⚠️  No fixes were applied. Files may already be correct.');
}