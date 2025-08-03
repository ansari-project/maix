# CLAUDE.md - Maix Project Instructions

## ⚠️ CRITICAL REMINDERS - READ BEFORE EVERY GIT OPERATION ⚠️

1. **NEVER FORCE PUSH** - This can permanently delete other people's work
2. **ALWAYS CHECK FOR REMOTE CHANGES** before pushing: `git fetch origin && git log HEAD..origin/main --oneline`
3. **IF PUSH FAILS** - STOP and ask the user how to proceed. DO NOT make decisions independently.
4. **This is a COLLABORATIVE repository** - Other developers' work must be protected

## ⚠️ CRITICAL DATABASE SAFETY - READ BEFORE ANY PRISMA OPERATION ⚠️

### Migration Best Practices (Updated August 3, 2025)

1. **NEVER use `npx prisma db push`** - This command is destructive and will drop/recreate tables
   - ❌ `npx prisma db push` - NEVER USE THIS
   - ✅ `npx prisma migrate dev` - Use for development
   - ✅ `npx prisma migrate deploy` - Use for production

2. **After Database Restore or Clone**:
   - DO NOT run any schema commands immediately
   - First check migration status: `npx prisma migrate status`
   - If there are migration conflicts, create a new baseline migration
   - See "Creating a Baseline Migration" section below

3. **Migration Workflow**:
   - Development: `npx prisma migrate dev --name descriptive_name`
   - Production: `npx prisma migrate deploy`
   - Always commit migration files to git
   - Never edit or delete migration files after they're applied

4. **Creating a Baseline Migration** (when starting fresh or after conflicts):
   ```bash
   # 1. Remove old migrations (if any)
   rm -rf prisma/migrations
   
   # 2. Create new migration without applying
   npx prisma migrate dev --name initial_baseline --create-only
   
   # 3. Deploy the migration
   npx prisma migrate deploy
   ```
   
   **Note**: Baseline migrations are typically used with empty databases or after dropping all data.
   No backup is needed for true baseline scenarios since there's no data to preserve.

5. **Data Backup Guidelines**:
   - **Before regular migrations in production**: ALWAYS backup
     ```bash
     # Use matching PostgreSQL version for pg_dump
     pg_dump $DATABASE_URL --data-only --no-owner > backup_$(date +%Y%m%d_%H%M%S).sql
     ```
   - **Before baseline migrations**: Usually NOT needed (baseline implies starting fresh)
   - **Special case**: If preserving data while resetting migrations (like we just did), backup first

This warning exists because `db push` destroyed production data multiple times in July 2025.

## Project Overview

Maix (Meaningful AI Exchange) is a Next.js 15 application that connects skilled volunteers with meaningful AI/tech projects. The platform uses modern web technologies to advance communities through collaborative innovation.

## Technology Stack

### Core Technologies
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **Database**: Neon (PostgreSQL with pgvector extension)
- **Authentication**: NextAuth.js with Google OAuth
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: shadcn/ui (Radix UI + Tailwind primitives)
- **Deployment**: Vercel

### Key Libraries
- **Database ORM**: Prisma
- **Form Handling**: React Hook Form + Zod validation
- **State Management**: React Query/TanStack Query
- **Real-time**: Pusher or Ably (when implemented)
- **AI/ML**: 
  - Claude Sonnet 4 API for embeddings and natural language processing
  - **IMPORTANT**: For Google Gemini integration, ALWAYS use `@google/genai` package. This is the CANONICAL and ONLY library to use UNDER ALL CIRCUMSTANCES. Do NOT use `@google/generative-ai` or any other package.
  - **See the guide**: Always refer to `/docs/guides/google-genai-sdk-usage.md` for proper usage of the Google Generative AI SDK, including model selection, search grounding configuration, and API patterns.
- **Icons**: Lucide React
- **Animations**: Framer Motion

## Project Structure

```
maix/
├── src/
│   ├── app/              # Next.js 14 app router
│   │   ├── api/          # API routes
│   │   ├── auth/         # Authentication pages
│   │   ├── dashboard/    # User dashboard
│   │   ├── projects/     # Project management
│   │   └── search/       # Search functionality
│   ├── components/       # Reusable UI components
│   │   ├── ui/           # Basic UI components (Radix + Tailwind)
│   │   ├── forms/        # Form components
│   │   ├── layout/       # Layout components
│   │   └── themed/       # Themed components
│   ├── lib/              # Utilities and configurations
│   │   ├── auth.ts       # NextAuth configuration
│   │   ├── db.ts         # Prisma client
│   │   ├── claude.ts     # Claude API client setup
│   │   └── utils.ts      # Utility functions
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript type definitions
│   └── styles/           # Global styles and themes
├── prisma/               # Database schema and seeds
├── public/               # Static assets
├── tests/                # Test files
└── docs/                 # Documentation
    ├── plans/            # Execution plans and roadmaps
    ├── guides/           # Extracted wisdom on how to use tools and features
    ├── howtos/           # Step-by-step instructions for users
    ├── faqs/             # Frequently asked questions
    ├── ideas/            # Feature ideas and proposals
    │   ├── done/         # Completed features
    │   ├── inprogress-*  # Currently being worked on
    │   └── todo-*        # Future features to implement
    └── ref/              # Reference material and API documentation
```

## Development Guidelines

### Feature Development Workflow (DRSITR)

**DRSITR** - Our standard development workflow: Design, Review, Simplify, Implement, Test, Review

**To follow DRSITR:**

1. **Design** - Work out the overall design and architecture
   - Consider all components, data flow, and user interactions
   - Document the approach clearly

2. **Review** - Use `mcp__zen__thinkdeep` for comprehensive design analysis
   - Ask specifically about potential issues, improvements, or alternative approaches
   - Consider the systematic investigation and expert validation

3. **Simplify** - Review the design to ensure it's as simple as possible
   - Apply our principle: "bias towards simple solutions for current problems"
   - Remove unnecessary complexity or premature optimizations
   - Ensure we're solving actual problems, not hypothetical ones

4. **Implement** - Build the feature following the agreed design
   - Follow our coding standards and conventions
   - Use the TodoWrite tool to track implementation progress

5. **Test** - Write comprehensive tests and run quality checks
   - Write unit tests, integration tests as appropriate
   - Test edge cases and error conditions
   - Run existing test suite to ensure no regressions
   - Run pre-commit hooks (build + tests) to ensure quality

6. **Review** - Final code review with `mcp__zen__codereview` tool
   - Use for comprehensive code quality, security, and design analysis
   - Address critical issues (bugs, security, major design flaws)
   - Focus on essential improvements, avoid overcomplication suggestions
   - Create descriptive commit messages and push to GitHub

**Enforcement**: Follow DRSITR for all non-trivial features. For simple changes (like text updates), Review steps may be simplified.

### Project Management
- **Phase-Based Development**: We organize work into phases, not time-based estimates
- **Phases represent logical completion points**: Each phase delivers working functionality
- **No week/time estimates**: Focus on completion criteria rather than duration
- **Sequential phases**: Complete one phase before moving to the next

### Code Style
- Use TypeScript strict mode
- Follow meaningful naming conventions that reflect positive impact
- Use descriptive, meaningful variable names
- Prefer functional components with hooks
- Use proper TypeScript types (avoid `any`)

### Git Commit Guidelines
- **NEVER include "Generated with Claude Code" or "Co-Authored-By: Claude" in commit messages**
- Use descriptive commit messages that explain the purpose of changes
- Keep commit messages concise and focused on the changes made
- Group related changes into a single commit
- **NEVER use `git add .` or `git add --all`** - Always specify individual files

#### Git Push Guidelines - CRITICAL - READ THIS EVERY TIME BEFORE PUSHING
- **NEVER force push (`git push --force` or `git push --force-with-lease`)** without explicit user permission
- **ALWAYS run `git fetch origin && git status` before pushing** to check for remote changes
- **If push is rejected**, STOP and inform the user:
  - Say: "Push was rejected because remote has changes. How would you like me to proceed?"
  - Option 1: Pull and merge changes
  - Option 2: Pull with rebase  
  - Option 3: Review conflicts together
  - **WAIT FOR USER RESPONSE** - Do not proceed without explicit instructions
- **NEVER make unilateral decisions** about resolving divergent branches
- **NEVER use --force or --force-with-lease** even if it seems like the "easy" solution
- **Remember**: This is a collaborative repository - force pushing can permanently lose other people's work

##### Git Push Pre-Check (MANDATORY)
Before EVERY push, you MUST:
1. Run `git fetch origin`
2. Run `git log HEAD..origin/main --oneline` to see remote commits you don't have
3. If there are remote commits, inform the user BEFORE attempting to push
4. Only proceed with push after confirming approach with user

#### Pre-Commit Mental Checklist
Before every commit, Claude Code MUST verify:
1. ✅ **Check CLAUDE.md**: Review commit guidelines (especially line 116 about Claude suffixes)
2. ✅ **Descriptive message**: Commit message explains the purpose and impact of changes
3. ✅ **No Claude suffixes**: Absolutely no "Generated with Claude Code" or "Co-Authored-By: Claude"
4. ✅ **Specific staging**: Used `git add [specific-files]` not `git add .`
5. ✅ **Build/test passed**: Pre-commit hooks validated the changes successfully

#### Why `git add .` is Dangerous
**NEVER use `git add .` or `git add --all`** as it can accidentally commit:
- **Sensitive files**: `.env` files containing API keys, database credentials, secrets
- **System files**: `.DS_Store`, `Thumbs.db`, temporary files
- **Build artifacts**: `node_modules/`, `dist/`, `.next/` that should be in `.gitignore`
- **Personal files**: Local configuration, debug logs, test data
- **Large files**: Images, videos, datasets that bloat the repository

**Always use specific file paths:**
```bash
# CORRECT: Specify exact files
git add src/app/api/posts/route.ts
git add prisma/schema.prisma
git add docs/plans/new-feature.md

# DANGEROUS: Never do this
git add .
git add --all
```

**Best Practice**: Review what you're adding with `git status` and `git diff --cached` before committing.

### Pre-Commit Checklist

To ensure code quality and prevent deployment failures, always perform the following steps before committing changes:

1. **Check for Dependency Changes:**
   - **ALWAYS run `git status` before committing** to check for modified files
   - **If you installed new packages**, ensure both `package.json` AND `package-lock.json` are staged
   - **Never commit code that uses packages without committing the dependency files**
   - Example: If you run `npm install resend`, you MUST `git add package.json package-lock.json`

2. **Local Validation:**
   - Run `npm run build` to ensure no TypeScript or build errors
   - Run `npm run test` to ensure all unit tests pass
   - Run `npm run test:e2e` to ensure E2E tests pass (requires dev server running)
   - Fix any errors found during build or test

3. **Code Review (for non-trivial changes):**
   - For significant features or complex changes, use the `mcp__zen__codereview` tool
   - For simpler changes, use the `mcp__zen__chat` tool to request a code review
   - This provides an additional layer of scrutiny for logic, design, and best practices
   - **Note**: AI assistants tend to suggest overcomplication and optimizations that aren't important at our MVP stage
   - Focus on addressing critical issues (bugs, security, major design flaws) rather than all suggestions
   - Remember our principle: bias towards simple solutions for current problems

4. **Never push code that fails to build or has failing tests**
   - **NEVER use `git commit --no-verify` or `git push --no-verify`** to bypass pre-commit hooks
   - **NEVER delete test files to make failing tests pass** - this defeats the purpose of testing
   - If tests are failing, fix the test implementation to work correctly
   - Only remove tests if the functionality being tested is being removed entirely
   - Pre-commit hooks exist to maintain code quality and prevent regressions

**Enforcement**: 
- A git pre-commit hook (`.husky/pre-commit`) automatically runs build and unit tests
- Build failures and unit test failures will block commits
- E2E tests are disabled by default to avoid database pollution
- E2E tests can be enabled with `RUN_E2E=1 git commit ...` if needed (requires dev server running)
- This ensures the checklist is followed reliably and prevents manual oversight
- **NOTE**: Pre-commit hooks only check staged files, so missing dependencies won't be caught unless package files are staged

### Simplicity and Pragmatism
- **Bias towards simple solutions**: Address problems we currently have, not hypothetical future scaling issues
- **Avoid premature optimization**: Don't implement complex patterns for problems that don't exist yet
- **Use straightforward Prisma queries**: Query existing models directly rather than complex abstraction layers
- **Focus on current scale**: Design for the data and usage patterns we have today
- **Iterative complexity**: Add architectural complexity only when simple solutions prove insufficient

#### Real Examples of Keeping Things Simple
**Avatar Photos**: Instead of implementing complex avatar components with image handling, fallbacks, and Radix UI primitives, we simply display user names. This eliminates image storage, upload handling, and UI complexity while providing the essential user identification we need.

**Logging Middleware**: Rather than building comprehensive request logging middleware with performance monitoring and complex event types, we implemented basic structured logging for only essential events (auth, moderation, errors). This provides the debugging capability we need without premature infrastructure complexity.

**Performance Optimization**: Rather than implementing complex Prisma query optimization, database indexing strategies, N+1 query prevention, and caching layers upfront, we use straightforward Prisma queries and will only optimize if we observe actual performance problems. This avoids spending time on hypothetical scaling issues when we should focus on user value and core functionality.

**Content Moderation**: Rather than implementing a complex content moderation system with status fields, review workflows, admin interfaces, and approval processes upfront, we start with simple content posting and will only add moderation if we experience actual abuse problems. This allows us to focus on core functionality and user value rather than building defensive infrastructure for hypothetical issues.

### Performance and Security Priorities

#### Threat Model Context
- **What we are**: A community platform for volunteer matching
- **What we're NOT**: A financial service, healthcare system, or sensitive data processor
- **No money exchanged**: No payment processing, no financial transactions
- **Low-value target**: Not attractive to sophisticated attackers
- **Data sensitivity**: Public profiles and project information (not PII-heavy)

#### Security Approach
- **Focus on basics**: Input validation (already implemented with Zod)
- **Skip security theater**: No complex CSRF tokens, rate limiting, or audit logs
- **Pragmatic protection**: Prevent SQL injection (Prisma handles this), XSS (React handles this)
- **Authentication**: Basic session management with NextAuth is sufficient
- **Priority**: User experience and functionality over restrictive controls

#### What NOT to Implement
- Rate limiting (not worth the complexity)
- Complex security headers (nice-to-have, not critical)
- Audit logging (unless legally required)
- CSRF protection beyond basic session validation
- Penetration testing or security audits
- Any security measure that adds complexity without addressing a real threat

### Database Operations
- Always use Prisma for database operations
- Use transactions for multi-table operations
- Implement proper error handling
- Use connection pooling for performance

### Authentication
- All protected routes must use NextAuth.js
- Implement role-based access control
- Validate user sessions on API routes
- Use proper CSRF protection

### API Routes
- Follow RESTful conventions
- Use proper HTTP status codes
- Validate all input with Zod schemas
- Handle errors gracefully

### UI/UX Guidelines
- Follow clean design principles
- Use the defined color palette
- Implement RTL support for Arabic content
- Ensure accessibility (WCAG 2.1 AA)
- Use semantic HTML elements
- **All textarea fields must support Markdown**: Use the `<Markdown>` component from `@/components/ui/markdown` to render user-generated content. This ensures consistent formatting across Q&A answers, project descriptions, product descriptions, and all other long-form text content.

## Design System

### Color Palette
```typescript
const islamicColors = {
  primary: '#1E3A8A',    // Deep blue - knowledge and wisdom
  secondary: '#D97706',  // Gold - prosperity and success
  accent: '#059669',     // Green - growth and harmony
  neutral: '#374151',    // Dark gray - stability
  background: '#F9FAFB', // Light gray - purity
  surface: '#FFFFFF'     // White - simplicity
};
```

### Typography
- Use Noto Sans Arabic for Arabic text
- Use Inter for English text
- Implement proper RTL support
- Use appropriate font weights

### Components
- Create reusable themed components
- Use geometric patterns respectfully
- Avoid religious symbols
- Maintain cultural sensitivity

## Database Schema

### Key Tables
- `users`: User profiles with expertise and availability
- `projects`: Project details with lifecycle status tracking
- `organizations`: Non-profit organizations
- `applications`: Volunteer applications to projects
- `reviews`: User ratings and feedback

### Important Fields
- `projects.status`: ProjectStatus enum for lifecycle tracking
- `projects.isActive`: Boolean for recruitment control
- `projects.embedding`: Vector(1536) for semantic search
- `users.expertise`: JSONB array of skills
- `projects.helpType`: Enum (advice, prototype, mvp, full_product)

## Project Lifecycle Management

Maix projects follow a structured lifecycle with clear states and transitions to help coordinate volunteer efforts effectively.

### Project Status States

1. **AWAITING_VOLUNTEERS**: Project is defined and ready, waiting for volunteers to join
2. **PLANNING**: Team is assembled and working on detailed planning and architecture
3. **IN_PROGRESS**: Active development work is happening
4. **ON_HOLD**: Work has temporarily stopped due to external factors
5. **COMPLETED**: Project has successfully delivered its goals (terminal state)
6. **CANCELLED**: Project has been permanently discontinued (terminal state)

### Dual Status System

Projects use two complementary fields:
- **`status`**: Tracks the project's lifecycle phase
- **`isActive`**: Controls whether the project is actively seeking volunteers

This allows for nuanced project management:
- A project can be `IN_PROGRESS` but still `isActive: true` if additional skills are needed
- A project can be `ON_HOLD` with `isActive: true` to find volunteers to restart work
- `COMPLETED` and `CANCELLED` projects are always `isActive: false`

### Status Transitions

```
AWAITING_VOLUNTEERS → PLANNING → IN_PROGRESS → COMPLETED
                                     ↓
                                  ON_HOLD ←→ IN_PROGRESS
                                     ↓
                                 CANCELLED

Any state → CANCELLED (projects can be cancelled at any time)
```

### Implementation Guidelines

- **Update status regularly** to keep the community informed
- **Use meaningful transitions** - explain why status changed
- **Consider recruitment needs** when changing status
- **Never transition from COMPLETED or CANCELLED** - create new projects instead

For detailed guidance, see `docs/guides/maix-data-model.md`

## API Endpoints

### Authentication
- `/api/auth/[...nextauth]`: NextAuth.js endpoints
- `/api/auth/session`: Get current session

### Users
- `/api/users/profile`: User profile management
- `/api/users/[id]`: User details
- `/api/users/skills`: Skills management

### Projects
- `/api/projects`: List and create projects
- `/api/projects/[id]`: Project details
- `/api/projects/search`: Search projects
- `/api/projects/[id]/applications`: Project applications

### Matching
- `/api/matching/recommendations`: Get project recommendations
- `/api/matching/similar`: Find similar projects

## Environment Variables

### Required Variables
```env
DATABASE_URL="postgresql://username:password@ep-xxx.neon.tech/neondb"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
ANTHROPIC_API_KEY="your-anthropic-api-key"
```

### Optional Variables
```env
PUSHER_APP_ID="your-pusher-app-id"
PUSHER_KEY="your-pusher-key"
PUSHER_SECRET="your-pusher-secret"
SENTRY_DSN="your-sentry-dsn"
```

## Common Tasks

### Adding New API Route
1. Create file in `src/app/api/`
2. Implement proper authentication
3. Add Zod validation schemas
4. Handle errors appropriately
5. Add TypeScript types

### Creating New Component
1. Place in appropriate `components/` subdirectory
2. Use TypeScript with proper props interface
3. Follow clean design principles
4. Add proper accessibility attributes
5. Include JSDoc comments

### Database Changes
1. Update Prisma schema
2. Generate migration: `npx prisma migrate dev`
3. Update TypeScript types
4. Update seed data if needed

### Adding New Search Feature
1. Update project embeddings if needed
2. Modify search API endpoint
3. Update search UI components
4. Test with various query types

## Testing Strategy

### Pragmatic Testing Approach

**Testing Pyramid (Inverted for React Apps):**
1. **E2E Tests** (Primary) - Use Playwright for complete user workflows
2. **Unit Tests** (Secondary) - Focus on business logic and utilities
3. **Integration Tests** (Minimal) - Only for complex component interactions

### When to Use Each Test Type

#### E2E Tests (Playwright) - PRIMARY CHOICE
**Use for:**
- Complete user workflows (form submissions, navigation flows)
- Complex component interactions (modals, dropdowns, multi-step forms)
- Authentication flows
- Critical business paths
- Cross-browser compatibility

**Why E2E is preferred:**
- Tests real user experience
- No complex mocking required
- Catches integration issues
- Works with real browsers and components

#### Unit Tests (Jest + RTL) - SECONDARY CHOICE
**Use for:**
- Business logic functions (utilities, calculators, validators)
- Simple component rendering (basic props, text display)
- Error states and edge cases
- Pure functions and hooks

**Avoid unit tests for:**
- Complex UI component interactions
- Components with heavy external dependencies (Radix UI, etc.)
- Form submission workflows
- API integration scenarios

#### Integration Tests - MINIMAL USE
**Use sparingly for:**
- Database operations (Prisma)
- API route testing
- Authentication middleware

### Modern UI Component Testing Challenges

**Why unit testing complex UI components is problematic:**
- **Component Library Mocking**: Radix UI, Material-UI require extensive mocking
- **JSDOM Limitations**: Doesn't support many browser APIs
- **State Management Complexity**: Multiple async API calls, React state updates
- **Mock Coordination**: Fetch mocks, router mocks, context mocks become brittle

**Solution**: Use E2E tests for complex UI workflows instead of fighting mocking complexity.

### E2E Testing Implementation

#### Playwright Configuration
- **Single Browser Testing**: Use Chromium only for faster feedback during development
- **Parallel Execution**: Tests run in parallel by default for speed
- **Fixtures**: Use custom fixtures for auth helpers and database setup
- **Global Setup/Teardown**: Clean database before and after test runs

#### Writing E2E Tests
```typescript
// Use page objects and helpers for common workflows
await authHelper.signUp(userData)
await authHelper.signIn(email, password)

// Test actual user behavior, not implementation details
await page.fill('input#email', 'user@example.com')
await page.click('button[type="submit"]')
await expect(page).toHaveURL(/.*\/dashboard.*/)

// Use specific selectors, avoid data-testid when possible
await page.locator('button:has-text("Sign Out")').click()
```

#### Common E2E Patterns
- **Authentication**: Test signup → signin → signout flow
- **Form Submission**: Fill forms, submit, verify redirect/success
- **Navigation**: Click links, verify URL changes and content
- **Error Handling**: Submit invalid data, verify error messages
- **Persistence**: Reload page, verify state is maintained

#### Debugging E2E Tests
```bash
npx playwright test --headed     # Run with visible browser
npx playwright test --debug      # Step through test execution
npx playwright test --ui         # Interactive test runner
```

### Testing Standards

#### Unit Test Standards
- **Keep it simple**: Test basic rendering and simple interactions only
- **Mock minimally**: Only mock what's absolutely necessary
- **Focus on logic**: Extract business logic into testable functions
- **Avoid complex scenarios**: If mocking becomes complex, use E2E instead

#### E2E Test Standards
- **Test user journeys**: Complete end-to-end workflows
- **Use realistic data**: Test with actual API responses
- **Focus on critical paths**: Login, core features, error scenarios
- **Keep tests maintainable**: Use page object patterns for complex apps

## Performance Considerations

### Database
- Use proper indexing for search queries
- Implement connection pooling
- Use pagination for large datasets
- Monitor query performance

### Frontend
- Implement proper code splitting
- Use Next.js Image optimization
- Implement proper caching strategies
- Monitor Core Web Vitals

### AI/ML
- Cache embedding results
- Implement rate limiting for OpenAI API
- Use batch processing for bulk operations
- Monitor API usage and costs

## Security Guidelines

### Authentication
- Validate all user inputs
- Use CSRF protection
- Implement proper session management
- Use secure cookie settings

### Database
- Use parameterized queries (Prisma handles this)
- Implement proper access controls
- Validate data integrity
- Monitor for suspicious activity

### API Security
- Rate limit API endpoints
- Validate request headers
- Implement proper CORS settings
- Log security events

## Logging and Observability

### Hybrid Logging Approach

Maix uses a **hybrid logging approach** combining custom Pino logger with next-axiom integration for comprehensive observability:

#### Custom Pino Logger (`src/lib/logger.ts`)
- **Purpose**: Application-level structured logging with security focus
- **Features**:
  - Comprehensive PII/secret redaction (passwords, tokens, API keys, etc.)
  - Structured logging with consistent metadata
  - Environment-specific transports (Axiom in production, pretty console in development)
  - Security-focused field filtering to prevent credential leaks
- **Usage**: Import `{ logger }` for server-side application logging

#### next-axiom Integration
- **Purpose**: Platform-level observability and client-side logging
- **Features**:
  - Automatic Vercel function logs and performance metrics
  - Client-side Web Vitals collection (LCP, INP, CLS)
  - Browser-based logging via `useLogger()` hook
  - Seamless integration with Vercel deployment pipeline

### Environment Configuration

Required environment variables for logging:

```bash
# Server-side logging (custom Pino logger)
AXIOM_DATASET="maix"
AXIOM_TOKEN="xaat-your-axiom-api-token"

# Client-side logging and web vitals (next-axiom)
NEXT_PUBLIC_AXIOM_DATASET="maix" 
NEXT_PUBLIC_AXIOM_TOKEN="xaat-your-axiom-api-token"
```

### Implementation Guidelines

#### Server-Side Logging
```typescript
import { logger } from '@/lib/logger'

// Structured application logging
logger.info('User action completed', { 
  userId, 
  action: 'profile_update',
  timestamp: new Date().toISOString()
})

// Error logging with full context
logger.error('Database operation failed', error, { 
  operation: 'user.update',
  userId 
})
```

#### Client-Side Logging
```typescript
'use client'
import { useLogger } from 'next-axiom'

export function ClientComponent() {
  const log = useLogger()
  
  const handleAction = () => {
    log.info('User interaction', { component: 'button', action: 'click' })
  }
}
```

#### API Route Logging
API routes automatically benefit from both logging systems:
- Custom Pino logger captures application events
- next-axiom captures platform metrics (duration, memory, etc.)

### Security Features

The custom Pino logger includes comprehensive redaction for:
- **Authentication**: Authorization headers, session tokens, API keys
- **User Data**: Passwords, PII fields, sensitive form data
- **Infrastructure**: Database URLs, connection strings, secrets
- **Maix-specific**: All API keys (Anthropic, Gemini, Resend, etc.)

### Testing Logging

Use the provided test script to verify logging works:
```bash
# Load environment and test both logging systems
set -a && source .env && set +a && node scripts/test-axiom-logging.js
```

This will:
1. Test custom Pino logger → Axiom transport
2. Test next-axiom integration  
3. Verify logs appear in Axiom dashboard
4. Provide troubleshooting guidance

### Log Analysis

In Axiom dashboard:
- **Application logs**: Search by `test: "axiom-integration"` for test logs
- **Platform logs**: Automatic Vercel function metrics
- **Web Vitals**: Real user performance data from production
- **Error tracking**: Full stack traces with redacted sensitive data

This hybrid approach provides:
- **Security**: Comprehensive redaction prevents credential leaks
- **Observability**: Full application and platform visibility  
- **Performance**: Real user metrics and server performance data
- **Debugging**: Structured logs with complete context

## Deployment

### Environment Setup
1. Set up Neon database
2. Configure Vercel project
3. Set environment variables
4. Enable pgvector extension

### Deployment Process
1. Run tests locally
2. Build and test production bundle
3. Deploy to Vercel
4. Verify deployment health

## Monitoring

### Application Monitoring
- Use Vercel Analytics
- Monitor API response times
- Track user engagement
- Monitor error rates

### Database Monitoring
- Monitor query performance
- Track database size growth
- Monitor connection usage
- Set up alerts for issues

## Community Guidelines

### Content Guidelines
- All projects must align with community values
- No inappropriate content or imagery
- Respect cultural sensitivities
- Promote beneficial knowledge sharing

### Design Principles
- Use geometric patterns thoughtfully
- Avoid religious symbols in UI
- Maintain cultural authenticity
- Consider prayer times in scheduling features

### Community Values
- Prioritize Ummah benefit over profit
- Promote knowledge sharing
- Build trust through transparency
- Foster collaborative spirit

## Common Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build production bundle
npm run type-check   # TypeScript validation
npm run lint         # ESLint checking
```

### Database
```bash
npx prisma migrate dev    # Create and apply migration
npx prisma migrate deploy # Deploy migrations in production
npx prisma studio        # Open database GUI
npx prisma db seed       # Seed database
```

### Testing
```bash
npm run test                     # Run unit tests
npm run test:watch               # Watch mode
npx playwright test              # Run all E2E tests
npx playwright test --ui         # Run E2E tests with UI
npx playwright test auth.spec.ts # Run specific E2E test file
```

## Troubleshooting

### Common Issues
1. **Database connection errors**: Check DATABASE_URL format
2. **Authentication failures**: Verify Google OAuth setup
3. **Build errors**: Run type-check and fix TypeScript errors
4. **API rate limits**: Implement proper caching and rate limiting

### Debug Tips
- Use Next.js built-in debugging
- Check Vercel function logs
- Monitor database query performance
- Use browser dev tools for frontend issues

## Resources

### Documentation
- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Neon Documentation](https://neon.tech/docs)

### Community
- GitHub Issues for bug reports
- GitHub Discussions for feature requests
- README.md for general project information

### Project Documentation Structure
- `docs/plans/`: Execution plans and roadmaps
- `docs/guides/`: Extracted wisdom on how to use tools and features
- `docs/howtos/`: Step-by-step instructions for users
- `docs/faqs/`: Frequently asked questions
- `docs/ideas/`: Ideas still in incubation
- `docs/ref/`: Reference material and API documentation

## Notes for Claude Code

### When Working on This Project
1. Always follow community principles and values
2. Use the defined color palette and design system
3. Implement proper TypeScript typing
4. Follow the established project structure
5. Write tests for new functionality
6. Consider performance implications
7. Maintain cultural sensitivity
8. Use Neon-specific PostgreSQL features when appropriate
9. Follow the database schema design patterns
10. Implement proper error handling and user feedback

### Priority Areas
1. **User Experience**: Ensure intuitive and culturally appropriate interface
2. **Performance**: Optimize database queries and API responses
3. **Security**: Implement proper authentication and data validation
4. **Scalability**: Design for growth and increased usage
5. **Community**: Build features that foster collaboration and trust

This file serves as a comprehensive guide for developing and maintaining the Maix platform while adhering to community values and modern web development best practices.

## Code Health Protocol

### Current Code Health Status (Last Updated: August 3, 2025)

**Overall Health: 🟡 Good with identified improvements**

#### Current Issues Found
1. **✅ Security Vulnerabilities**: All npm audit issues resolved
   - **Status**: Complete - form-data package updated, no vulnerabilities found
   - **Last Checked**: August 3, 2025

2. **🟡 Console Logging**: 184 console.* statements across 64 files (out of 225 total files)
   - **Impact**: Poor production observability, potential performance impact
   - **Action**: Replace with structured logging using `@/lib/logger`
   - **Progress**: Logger infrastructure already established with Axiom integration
   - **Priority**: Medium - gradual replacement during feature work

3. **✅ Database Migration System**: Properly established with git tracking
   - **Status**: Complete - migrations directory created, schema tracked
   - **Safety**: Database safety documentation added to prevent data loss

4. **✅ Logging Infrastructure**: Hybrid Pino + Axiom system operational
   - **Status**: Complete - Edge Runtime compatible, comprehensive PII redaction
   - **Features**: Environment-specific transports, structured logging, graceful fallbacks

#### Next Code Health Review: After resolving critical security issue

### Periodic Code Health Reviews

Conduct code health reviews to maintain quality without over-engineering. Follow this protocol:

#### 1. Analyze Current State
- **Security Vulnerabilities**: Run `npm audit --audit-level=moderate`
- **Console Logging**: Count `console.*` statements in src/ (should trend toward zero)
- **Code Duplication**: Look for copy-pasted patterns across files  
- **Complexity Hotspots**: Identify functions >50 lines or deeply nested logic
- **Test Coverage**: Identify untested critical paths
- **Migration Health**: Verify Prisma migrations are properly tracked in git

#### 2. Prioritize Based on Threat Model
- **We ARE**: A community platform for volunteer matching
- **We ARE NOT**: A bank, healthcare system, or payment processor
- **Data Sensitivity**: Low (public profiles, no financial data)
- **Attack Surface**: Small (not an attractive target)

#### 3. Order of Operations
1. **Quick Wins First** (can do immediately):
   - Fix security vulnerabilities from npm audit
   - Remove unused dependencies  
   - Clean up obvious dead code
   - Replace console.log in files being actively worked on

2. **Improve Observability** (ongoing):
   - Replace console.log with structured logging using established `@/lib/logger`
   - Monitor Axiom dashboard for application insights
   - Add performance timing to identify real bottlenecks

3. **Create Safety Net** (before refactoring):
   - Write comprehensive tests for code to be changed
   - Focus on integration tests over unit tests
   - Test actual user flows, not implementation details

4. **Refactor with Confidence** (after tests pass):
   - Reduce code duplication
   - Simplify complex functions
   - Extract shared patterns

#### 4. What to Skip
- **Security Theater**: Complex CSRF, rate limiting, audit logs
- **Premature Optimization**: Caching before measuring
- **Over-Engineering**: Microservices, GraphQL, event sourcing
- **Perfect Coverage**: 100% test coverage is wasteful

#### 5. Success Metrics
- **Developer Velocity**: Can we ship features faster?
- **Bug Frequency**: Are we fixing the same bugs repeatedly?
- **Performance**: Do users complain about speed?
- **Maintainability**: Can new developers understand the code?
- **Observability**: Can we debug production issues quickly?

### Testing Philosophy

#### Test Everything That Matters
- **User Journeys**: Critical paths users actually follow (use E2E tests)
- **Business Logic**: Rules that could break user flows (use unit tests)
- **Data Integrity**: Ensure data stays consistent (use integration tests)
- **Error Handling**: What happens when things go wrong (use E2E for UI, unit for functions)
- **API Contracts**: Ensure endpoints behave as documented (use integration tests)

#### Skip Testing Boilerplate
- Simple getters/setters
- Framework-provided functionality
- Third-party library internals
- UI pixel perfection
- **Complex UI component interactions** (use E2E instead)

#### Test Before Refactoring
1. Write tests for existing behavior (choose appropriate test type)
2. Ensure tests pass with current code
3. Refactor with confidence
4. Tests still pass = successful refactor

#### When Unit Testing Gets Too Complex
**Warning signs:**
- Mocking more than 3 external dependencies
- Tests take longer to write than the code itself
- Frequent test breakage due to implementation changes
- Complex async state management in tests

**Solution**: Switch to E2E tests which test the actual user experience without mocking complexity.

### Practical Examples

#### ❌ Complex Unit Test (Avoid)
```typescript
// DON'T: Complex mocking for UI components
jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }) => {
    // 50+ lines of complex mocking...
  }
}))

it('should submit form with all data', async () => {
  // 100+ lines of setup, mocking, and assertions
  // Brittle, hard to maintain, doesn't test real user experience
})
```

#### ✅ Simple Unit Test (Good)
```typescript
// DO: Test business logic and simple rendering
describe('ProjectForm validation', () => {
  it('should validate required fields', () => {
    const result = validateProjectData({})
    expect(result.errors).toContain('Name is required')
  })
  
  it('should render form title', () => {
    render(<ProjectForm />)
    expect(screen.getByText('Create New Project')).toBeInTheDocument()
  })
})
```

#### ✅ E2E Test (Best for complex workflows)
```typescript
// DO: Test complete user workflows with real browser
test('user can create a new project', async ({ page }) => {
  await page.goto('/projects/new')
  
  await page.fill('[name="name"]', 'AI Assistant Project')
  await page.fill('[name="goal"]', 'Build educational AI tool')
  await page.selectOption('[name="helpType"]', 'MVP')
  await page.click('button[type="submit"]')
  
  await expect(page).toHaveURL(/\/projects\/.*/)
  await expect(page.getByText('Project created successfully')).toBeVisible()
})
```

### Migration Strategy

**For existing complex unit tests:**
1. **Simplify**: Remove complex mocking, test only basic rendering
2. **Extract logic**: Move business logic to pure functions and test those
3. **Create E2E equivalent**: Write Playwright test for the full workflow
4. **Remove brittle tests**: Delete tests that break frequently due to implementation changes
