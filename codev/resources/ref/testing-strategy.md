# Testing Strategy Guide

## Overview

This guide outlines Maix's pragmatic approach to testing, focusing on what provides real value while avoiding over-engineering and test theater.

## Testing Philosophy

### Core Principles

1. **Test What Matters**: Focus on business logic that could break user flows
2. **Skip the Boilerplate**: Don't test framework functionality or simple getters/setters
3. **Prefer Unit Tests**: They're fast, reliable, and easy to debug
4. **Extract Complex Logic**: If UI testing gets complex, extract the logic instead

### Testing Priority

1. **Unit Tests** - Primary choice for business logic and utilities
2. **API Route Tests** - Test endpoints with mocked database
3. **Component Tests** - Basic rendering and simple interactions only
4. **E2E Tests** - Reserve for critical user workflows

## When to Use Each Test Type

### Unit Tests - PRIMARY CHOICE

**Perfect for:**
- Business logic functions
- Utility functions
- Data transformations
- Validation logic
- API route handlers
- Pure functions and hooks

**Example:**
```typescript
// Good unit test - tests business logic
describe('ProjectForm validation', () => {
  it('should validate required fields', () => {
    const result = validateProjectData({})
    expect(result.errors).toContain('Name is required')
  })
  
  it('should enforce minimum description length', () => {
    const result = validateProjectData({ 
      name: 'Test',
      description: 'Too short' 
    })
    expect(result.errors).toContain('Description must be at least 50 characters')
  })
})
```

### Component Tests - LIMITED USE

**Use for:**
- Basic rendering ("does it show the title?")
- Simple prop handling
- Error state display

**Avoid testing:**
- Complex form interactions
- Components with many external dependencies
- Radix UI component behavior
- Async state management

**Example:**
```typescript
// Good component test - simple rendering
it('should render project title', () => {
  render(<ProjectCard project={mockProject} />)
  expect(screen.getByText('AI Assistant Project')).toBeInTheDocument()
})

// Bad component test - too complex
it('should handle complete form submission flow', async () => {
  // 100+ lines of mocking Radix UI, fetch, router...
  // Brittle and provides little value
})
```

### API Route Tests

**Use for:**
- Testing request/response contracts
- Authentication and authorization
- Error handling
- Database operations (with mocked Prisma)

**Example:**
```typescript
describe('POST /api/projects', () => {
  it('should require authentication', async () => {
    const response = await POST(request)
    expect(response.status).toBe(401)
  })
  
  it('should validate input data', async () => {
    mockAuth({ user: testUser })
    const response = await POST(invalidRequest)
    expect(response.status).toBe(400)
  })
})
```

### E2E Tests - SELECTIVE USE

**Reserve for:**
- Critical user journeys (signup, create project)
- Complex workflows that span multiple pages
- Integration scenarios that can't be tested otherwise

**Example:**
```typescript
test('user can create and publish project', async ({ page }) => {
  await page.goto('/projects/new')
  await page.fill('[name="name"]', 'Community AI Tool')
  await page.fill('[name="goal"]', 'Help educators with AI')
  await page.click('button[type="submit"]')
  
  await expect(page).toHaveURL(/\/projects\/.*/)
  await expect(page.getByText('Project created')).toBeVisible()
})
```

## Common Testing Anti-Patterns to Avoid

### 1. Over-Mocking UI Libraries

❌ **Don't do this:**
```typescript
jest.mock('@radix-ui/react-select', () => ({
  Select: ({ children, onValueChange }) => {
    // 50+ lines trying to simulate Radix behavior
  }
}))
```

✅ **Do this instead:**
```typescript
// Extract the logic
function getFilteredProjects(projects, filters) {
  return projects.filter(p => matchesFilters(p, filters))
}

// Test the logic directly
it('should filter by status', () => {
  const result = getFilteredProjects(projects, { status: 'active' })
  expect(result).toHaveLength(2)
})
```

### 2. Testing Implementation Details

❌ **Don't test HOW it works:**
```typescript
it('should call setState 3 times during initialization', () => {
  // Testing React internals
})
```

✅ **Test WHAT it does:**
```typescript
it('should display user projects after loading', () => {
  // Testing actual user value
})
```

### 3. Achieving Coverage for Coverage's Sake

❌ **Don't write useless tests:**
```typescript
it('should have a className prop', () => {
  const { container } = render(<Button className="test" />)
  expect(container.firstChild).toHaveClass('test')
})
```

✅ **Test meaningful behavior:**
```typescript
it('should be disabled during form submission', () => {
  const { getByRole } = render(<SubmitButton isSubmitting />)
  expect(getByRole('button')).toBeDisabled()
})
```

## When Testing Gets Too Complex

**Warning signs:**
- Mocking more than 3 dependencies
- Test setup longer than the actual test
- Tests break when implementation changes (not behavior)
- Spending more time fixing tests than writing features

**Solutions:**
1. **Extract business logic** into pure functions
2. **Use integration tests** for complex flows
3. **Consider E2E tests** for UI-heavy features
4. **Question the value** - what bugs will this actually catch?

## Test-First Refactoring

When refactoring existing code:

1. **Write tests for current behavior** (not implementation)
2. **Ensure tests pass** with existing code
3. **Refactor with confidence**
4. **Tests still pass** = successful refactor

## Practical Testing Guidelines

### What to Test
- **Business rules**: Project validation, user permissions
- **Data transformations**: Search filters, formatting
- **Error scenarios**: What happens when things fail?
- **API contracts**: Request/response shapes
- **Critical paths**: User signup, project creation

### What NOT to Test
- **Framework features**: React rendering, Next.js routing
- **Third-party libraries**: Prisma queries, Radix components
- **Simple prop passing**: Unless it involves logic
- **UI pixel perfection**: That's for visual regression tools
- **Generated code**: Prisma client, API route types

## Testing Tools and Setup

### Recommended Stack
- **Jest**: Test runner and assertions
- **React Testing Library**: Component testing
- **MSW**: API mocking for integration tests
- **Playwright**: E2E testing (when needed)

### Key Configuration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Focus on source code, not config files
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/types.ts',
  ],
}
```

## Migration Strategy for Complex Tests

If you have existing complex UI tests:

1. **Identify the core logic** being tested
2. **Extract it to a pure function**
3. **Write simple unit tests** for the logic
4. **Replace complex UI test** with basic rendering test
5. **Add E2E test** if it's a critical user flow

Remember: The goal is confidence in deployments, not 100% coverage. Focus testing effort where it provides the most value with the least maintenance burden.