# CLAUDE.md - Maix Project Instructions

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

#### Git Push Guidelines - CRITICAL
- **NEVER force push (`git push --force` or `git push --force-with-lease`)** without explicit user permission
- **ALWAYS pull before pushing** to check for remote changes
- **If push is rejected**, inform the user and ask how to proceed:
  - Option 1: Pull and merge changes
  - Option 2: Pull with rebase
  - Option 3: Review conflicts together
- **NEVER make unilateral decisions** about resolving divergent branches
- **Remember**: This is a collaborative repository - force pushing can lose other people's work

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
   - Run `npm run test` to ensure all tests pass
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
- A git pre-commit hook (`.husky/pre-commit`) automatically runs build and test checks
- Commits will be blocked if build or tests fail
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

## Testing

### Unit Tests
- Use Jest + React Testing Library
- Test components in isolation
- Mock external dependencies
- Test edge cases and error states

### Integration Tests
- Use Playwright for E2E testing
- Test user journeys
- Verify authentication flows
- Test search functionality

### Database Tests
- Test Prisma operations
- Verify data integrity
- Test performance with large datasets

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
npx prisma db push       # Push schema changes
npx prisma studio        # Open database GUI
npx prisma db seed       # Seed database
```

### Testing
```bash
npm run test            # Run unit tests
npm run test:watch      # Watch mode
npm run test:e2e        # End-to-end tests
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

### Periodic Code Health Reviews

Conduct code health reviews to maintain quality without over-engineering. Follow this protocol:

#### 1. Analyze Current State
- **Unused Dependencies**: Check for packages in package.json not imported anywhere
- **Code Duplication**: Look for copy-pasted patterns across files
- **Complexity Hotspots**: Identify functions >50 lines or deeply nested logic
- **Console Logging**: Count console.* statements in production code
- **Test Coverage**: Identify untested critical paths

#### 2. Prioritize Based on Threat Model
- **We ARE**: A community platform for volunteer matching
- **We ARE NOT**: A bank, healthcare system, or payment processor
- **Data Sensitivity**: Low (public profiles, no financial data)
- **Attack Surface**: Small (not an attractive target)

#### 3. Order of Operations
1. **Quick Wins First** (can do immediately):
   - Remove unused dependencies
   - Fix security vulnerabilities from npm audit
   - Clean up obvious dead code

2. **Improve Observability** (before making changes):
   - Replace console.log with structured logging
   - Consider Vercel-optimized solutions (Logflare, Axiom)
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

### Testing Philosophy

#### Test Everything That Matters
- **Business Logic**: Rules that could break user flows
- **Data Integrity**: Ensure data stays consistent
- **User Journeys**: Critical paths users actually follow
- **Error Handling**: What happens when things go wrong
- **API Contracts**: Ensure endpoints behave as documented

#### Skip Testing Boilerplate
- Simple getters/setters
- Framework-provided functionality
- Third-party library internals
- UI pixel perfection

#### Test Before Refactoring
1. Write tests for existing behavior
2. Ensure tests pass with current code
3. Refactor with confidence
4. Tests still pass = successful refactor
