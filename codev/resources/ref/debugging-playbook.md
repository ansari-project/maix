# Debugging Playbook

A systematic approach to debugging complex test failures and CI/CD issues, based on lessons learned from fixing the Maix CI pipeline.

## Core Principles

1. **Reproduce Locally First** - Never debug directly in CI
2. **Pattern Recognition** - Look for common failure patterns across tests
3. **Incremental Fixes** - Fix one category at a time, commit frequently
4. **Document As You Go** - Capture patterns for future reference

## Standard Debug Protocol

### Phase 1: Initial Assessment
```bash
# 1. Run tests locally to reproduce
npm run test:integration

# 2. Capture failure summary
npm run test:integration 2>&1 | grep -E "(PASS|FAIL|Test Suites)"

# 3. Identify patterns (all auth? all RBAC? specific model?)
npm run test:integration 2>&1 | grep "Error:" | head -20
```

### Phase 2: Systematic Investigation
```bash
# 4. Focus on one failing test file
npm run test:integration -- "path/to/specific.test.ts"

# 5. Add debug logging if needed
DEBUG=true npm run test:integration -- "path/to/specific.test.ts"

# 6. Check recent changes that might affect tests
git diff HEAD~5 prisma/schema.prisma
git log --oneline -n 10 -- src/lib/auth-utils.ts
```

### Phase 3: Apply Fixes
```bash
# 7. Fix the most common issue first
# 8. Test the fix locally
# 9. Apply pattern to similar files
# 10. Commit with clear message about what was fixed
```

### Phase 4: Validation
```bash
# 11. Run full test suite locally
npm run test:integration

# 12. Push to CI only after local success
git push origin main

# 13. Monitor CI for any environment-specific issues
gh run watch
```

## Common Failure Patterns & Solutions

### 1. Authorization Failures (403 Errors)

**Symptom**: Tests fail with "Insufficient permissions" or 403 status codes

**Common Causes**:
- Mocking entire auth module instead of specific functions
- Missing user data in mock objects
- Incorrect RBAC setup in test data

**Solution Pattern**:
```typescript
// ❌ BAD - Breaks all auth functions
jest.mock('@/lib/auth-utils')

// ✅ GOOD - Preserves other auth functions
jest.mock('@/lib/auth-utils', () => ({
  ...jest.requireActual('@/lib/auth-utils'),
  requireAuth: jest.fn()
}))

// Mock with complete user object
mockRequireAuth.mockResolvedValue(fullUserObject) // not partial
```

### 2. Schema Drift Issues

**Symptom**: "Unknown field" or "Invalid `prisma.model.create()` invocation"

**Common Causes**:
- Prisma schema changed but tests not updated
- Field renamed or removed
- New required fields added

**Solution Pattern**:
```bash
# Find all occurrences of old field name
grep -r "createdBy" src/**/*.test.ts

# Bulk update field names
sed -i '' 's/createdBy:/ownerId:/g' src/**/*.test.ts

# Verify schema fields
grep "model Product" -A 30 prisma/schema.prisma
```

### 3. Function Signature Mismatches

**Symptom**: Wrong number of arguments or incorrect types

**Common Causes**:
- Function signature changed
- Argument order swapped
- Optional parameters became required

**Solution Pattern**:
```bash
# Find function definition
grep -n "export.*function.*getEffectiveRole" src/lib/*.ts

# Find all calls to function
grep -r "getEffectiveRole(" src/**/*.test.ts

# Fix argument order with sed
sed -i '' 's/getEffectiveRole(\([^,]*\), \([^,]*\), \([^)]*\))/getEffectiveRole(\1, \3, \2)/g' file.ts
```

### 4. Async/Timing Issues

**Symptom**: Tests pass individually but fail when run together

**Common Causes**:
- Missing `await` keywords
- Database cleanup issues
- Shared state between tests

**Solution Pattern**:
```typescript
// Ensure proper cleanup
beforeEach(async () => {
  await cleanupTestDatabase()
})

// Run tests serially to identify issues
npm run test:integration -- --runInBand

// Add explicit waits if needed (last resort)
await new Promise(resolve => setTimeout(resolve, 100))
```

### 5. CI-Specific Failures

**Symptom**: Tests pass locally but fail in CI

**Common Causes**:
- Missing environment variables
- Different Node/npm versions
- Database connection issues
- File path case sensitivity

**Solution Pattern**:
```yaml
# Add dummy env vars for tools that require them
- name: Validate Prisma schema
  env:
    DATABASE_URL: "postgresql://user:password@localhost:5432/db"
  run: npx prisma validate

# Check CI logs for specifics
gh run view --log --job=<job-id> | grep -A 10 "Error:"
```

## Bulk Fix Operations

### Common sed Commands
```bash
# Replace field names
sed -i '' 's/oldField:/newField:/g' src/**/*.test.ts

# Fix function calls
sed -i '' 's/\.can(/.hasResourceAccess(/g' src/**/*.ts

# Update import paths
sed -i '' 's|@/old/path|@/new/path|g' src/**/*.ts

# Add missing imports
sed -i '' '1s/^/import { jest } from "@jest\/globals"\n/' src/**/*.test.ts
```

### Using grep Effectively
```bash
# Find tests using specific mocks
grep -l "jest.mock.*auth-utils" src/**/*.test.ts

# Find all error messages
grep -h "Error:" test-output.log | sort | uniq -c | sort -rn

# Find test files not using test database
grep -L "db-test-utils" src/**/*.integration.test.ts
```

## Debug Logging Strategy

### Conditional Debug Logging
```typescript
// In your code
const DEBUG = process.env.DEBUG_TESTS === 'true'

export function debugLog(message: string, data?: any) {
  if (DEBUG) {
    console.log(`[DEBUG ${new Date().toISOString()}] ${message}`, data)
  }
}

// In tests
DEBUG_TESTS=true npm run test:integration
```

### Strategic Logging Points
```typescript
// Before permission checks
debugLog('Checking permissions', { userId, resource, action })

// After database operations
debugLog('Created entity', { id: entity.id, ...entity })

// In mock functions
mockFunction.mockImplementation((args) => {
  debugLog('Mock called', args)
  return mockValue
})
```

## CI Debugging Commands

### Essential GitHub CLI Commands
```bash
# Check recent CI runs
gh run list --workflow=test.yml --limit=5

# Watch current run
gh run watch

# View specific job logs
gh run view --log --job=<job-id>

# Download artifacts
gh run download <run-id>

# Re-run failed jobs
gh run rerun <run-id> --failed
```

### Useful Aliases
```bash
# Add to ~/.zshrc or ~/.bashrc
alias ci="gh run list --workflow=test.yml --limit=5"
alias ciwatch="gh run watch"
alias cilogs="gh run view --log"
alias ciretry="gh run rerun --failed"
```

## Pre-emptive Measures

### Pre-commit Hooks
```bash
#!/bin/sh
# .git/hooks/pre-commit

# Check Prisma schema
npx prisma validate || exit 1

# Check TypeScript
npx tsc --noEmit || exit 1

# Run affected tests
npm run test:quick || exit 1
```

### Test Organization
```typescript
describe('Feature', () => {
  describe('Setup', () => {
    let testData: TestData
    
    beforeEach(async () => {
      testData = await setupCompleteTestData()
    })
    
    afterEach(async () => {
      await cleanupTestData(testData)
    })
  })
  
  describe('Authorization', () => {
    describe.each([
      ['owner', 'OWNER', true],
      ['member', 'MEMBER', false],
      ['viewer', 'VIEWER', false],
    ])('when user is %s', (_, role, shouldSucceed) => {
      // Parameterized tests for different roles
    })
  })
})
```

## Failure Analysis Checklist

When encountering test failures, systematically check:

- [ ] **Schema Changes**: Did Prisma schema change recently?
  ```bash
  git diff HEAD~5 prisma/schema.prisma
  ```

- [ ] **Mock Configuration**: Are mocks set up correctly?
  ```bash
  grep "jest.mock" failing-test.ts
  ```

- [ ] **Function Signatures**: Do function calls match current signatures?
  ```bash
  grep "export.*function.*functionName" src/lib/**/*.ts
  ```

- [ ] **Async Operations**: Are all async operations properly awaited?
  ```bash
  grep -n "await.*functionName" failing-test.ts
  ```

- [ ] **Test Data Cleanup**: Is test data properly cleaned between tests?
  ```bash
  grep -A 5 "beforeEach\|afterEach" failing-test.ts
  ```

- [ ] **Environment Variables**: Are all required env vars set?
  ```bash
  grep "process.env" src/lib/**/*.ts
  ```

- [ ] **Import Statements**: Are all imports correct?
  ```bash
  npx tsc --noEmit
  ```

## Progressive Test Execution

### Package.json Scripts
```json
{
  "scripts": {
    "test:quick": "jest --maxWorkers=4 --bail",
    "test:focused": "jest --findRelatedTests",
    "test:debug": "DEBUG=true jest --runInBand --detectOpenHandles",
    "test:pattern": "jest -t",
    "test:coverage": "jest --coverage --coveragePathIgnorePatterns='<rootDir>/tests/'",
    "test:integration:safe": "npm run test:db:start && npm run test:integration; npm run test:db:stop"
  }
}
```

### Test Execution Strategy
1. **Quick Validation**: `npm run test:quick` - Fails fast on first error
2. **Focused Testing**: `npm run test:focused src/modified-file.ts` - Tests related files
3. **Debug Mode**: `npm run test:debug -- path/to/test.ts` - Single-threaded with logging
4. **Pattern Matching**: `npm run test:pattern "should handle auth"` - Run specific test descriptions

## Documentation Template

When fixing a complex issue, document it:

```markdown
## Issue: [Brief Description]
**Date**: 2025-08-09
**Affected Tests**: List of test files
**Root Cause**: Specific technical reason
**Solution**: What was changed and why
**Prevention**: How to avoid in future
**Example Commit**: [commit-hash]
```

## Lesson Learned Archive

Document patterns for future reference:

### Mock Leakage (2025-08-09)
- **Issue**: Mocking entire modules breaks dependent functions
- **Solution**: Mock only specific functions, preserve others with `jest.requireActual`
- **Example**: Auth utils mocking in application route tests

### Schema Drift (2025-08-09)
- **Issue**: Product.createdBy renamed to Product.ownerId
- **Solution**: Bulk update with sed, add schema change checklist to PR template
- **Prevention**: Run integration tests before schema changes

### Function Signature Mismatch (2025-08-09)
- **Issue**: getEffectiveRole parameter order incorrect
- **Solution**: Swap arguments with sed pattern matching
- **Prevention**: TypeScript strict mode, better test type coverage

## Quick Reference Card

```bash
# Most useful commands during debugging session
npm run test:integration 2>&1 | grep -E "(PASS|FAIL)"  # Quick status
npm run test:integration -- "specific/test" -t "pattern" # Focused test
grep -r "errorPattern" src/**/*.test.ts                  # Find patterns
sed -i '' 's/old/new/g' $(grep -l "pattern" src/**/*.ts) # Bulk fix
gh run view --log --job=123456 | grep -A 10 "Error:"     # CI logs
git diff HEAD~1 prisma/schema.prisma                     # Recent schema changes
```

## Success Metrics

Track debugging efficiency:
- Time from first failure to all tests passing
- Number of commits needed to fix
- Patterns identified and documented
- Reusable solutions created

## Continuous Improvement

After each debugging session:
1. Update this playbook with new patterns
2. Add new bulk fix commands
3. Create helper functions for common issues
4. Share learnings with team

---

*Last Updated: 2025-08-09*
*Based on: Fixing Maix CI/CD pipeline (16 integration test suites, 47 unit test suites)*