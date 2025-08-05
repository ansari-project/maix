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

2. **Migration Workflow**:
   - Development: `npx prisma migrate dev --name descriptive_name`
   - Production: `npx prisma migrate deploy`
   - Always commit migration files to git
   - Never edit or delete migration files after they're applied

3. **Data Backup Before Production Migrations**:
   ```bash
   ./scripts/backup_database.sh
   ```
   See `docs/guides/database-backup-procedure.md` for detailed backup instructions.

This warning exists because `db push` destroyed production data multiple times in July 2025.

## Project Overview

Maix (Meaningful AI Exchange) is a Next.js 15 application that connects skilled volunteers with meaningful AI/tech projects. See README.md for detailed technology stack and setup instructions.

**Key Technology Notes**:
- For Google Gemini: ALWAYS use `@google/genai` package (see `/docs/guides/google-genai-sdk-usage.md`)
- Database: Neon PostgreSQL with pgvector extension
- Auth: NextAuth.js with Google OAuth

## Project Structure

```
maix/
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/       # UI components (shadcn/ui based)
│   ├── lib/              # Utilities and configs
│   ├── hooks/            # Custom React hooks
│   └── types/            # TypeScript definitions
├── prisma/               # Database schema
├── tests/                # Test files
└── docs/                 # Documentation
    ├── guides/           # How-to guides
    ├── designs/          # Feature designs
    └── howtos/           # User instructions
```

## Development Guidelines

### Feature Development Workflow (DRSITR)

**DRSITR** - Our standard development workflow: Design, Review, Simplify, Implement, Test, Review

1. **Design** - Work out the overall design and architecture
2. **Review** - Use `mcp__zen__thinkdeep` for comprehensive design analysis
3. **Simplify** - Review the design to ensure it's as simple as possible
4. **Implement** - Build the feature following the agreed design
5. **Test** - Write comprehensive tests and run quality checks
6. **Review** - Final code review with `mcp__zen__codereview` tool

**Enforcement**: Follow DRSITR for all non-trivial features. For simple changes (like text updates), Review steps may be simplified.

### Project Management
- **Phase-Based Development**: We organize work into phases, not time-based estimates
- **Phases represent logical completion points**: Each phase delivers working functionality
- **No week/time estimates**: Focus on completion criteria rather than duration
- **Sequential phases**: Complete one phase before moving to the next

### Git Commit Guidelines

- **NEVER include "Generated with Claude Code" or "Co-Authored-By: Claude" in commit messages**
- Use descriptive commit messages that explain the purpose of changes
- Keep commit messages concise and focused on the changes made
- Group related changes into a single commit
- **NEVER use `git add .` or `git add --all`** - Always specify individual files

#### Git Push Guidelines - CRITICAL

- **NEVER force push** without explicit user permission
- **ALWAYS run `git fetch origin && git status` before pushing**
- **If push is rejected**, STOP and inform the user - wait for instructions
- **NEVER make unilateral decisions** about resolving divergent branches

#### Pre-Commit Mental Checklist
1. ✅ **Descriptive message**: Explains purpose and impact
2. ✅ **No Claude suffixes**: No "Generated with Claude Code"
3. ✅ **Specific staging**: Used `git add [specific-files]`
4. ✅ **Build/test passed**: Pre-commit hooks validated

### Pre-Commit Checklist

1. **Check for Dependency Changes:**
   - If you installed new packages, ensure both `package.json` AND `package-lock.json` are staged
   - Never commit code that uses packages without committing the dependency files

2. **Local Validation:**
   - Run `npm run build` to ensure no TypeScript or build errors
   - Run `npm run test` to ensure all unit tests pass
   - Fix any errors found during build or test

3. **Code Review (for non-trivial changes):**
   - For significant features, use the `mcp__zen__codereview` tool
   - Focus on addressing critical issues (bugs, security, major design flaws)
   - Remember: bias towards simple solutions for current problems

4. **Never push code that fails to build or has failing tests**
   - Pre-commit hooks exist to maintain code quality

### Simplicity and Pragmatism

- **Bias towards simple solutions**: Address problems we currently have, not hypothetical future scaling issues
- **Avoid premature optimization**: Don't implement complex patterns for problems that don't exist yet
- **Use straightforward Prisma queries**: Query existing models directly rather than complex abstraction layers
- **Focus on current scale**: Design for the data and usage patterns we have today
- **Iterative complexity**: Add architectural complexity only when simple solutions prove insufficient

#### Real Examples of Keeping Things Simple

**Avatar Photos**: Instead of implementing complex avatar components with image handling, fallbacks, and Radix UI primitives, we simply display user names. This eliminates image storage, upload handling, and UI complexity while providing the essential user identification we need.

**Performance Optimization**: Rather than implementing complex Prisma query optimization, database indexing strategies, N+1 query prevention, and caching layers upfront, we use straightforward Prisma queries and will only optimize if we observe actual performance problems.

**Content Moderation**: Rather than implementing a complex content moderation system with status fields, review workflows, admin interfaces, and approval processes upfront, we start with simple content posting and will only add moderation if we experience actual abuse problems.

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

### Database Operations
- Always use Prisma for database operations
- Use transactions for multi-table operations
- Implement proper error handling
- Use connection pooling for performance

### Authentication
- All protected routes must use NextAuth.js
- Implement role-based access control
- Validate user sessions on API routes

### UI/UX Guidelines
- Follow clean design principles
- Ensure accessibility (WCAG 2.1 AA)
- Use semantic HTML elements
- **All textarea fields must support Markdown**: Use the `<Markdown>` component from `@/components/ui/markdown`

## Key Database Concepts

### Project Lifecycle Management

Projects use a dual status system:
- **`status`**: Tracks lifecycle phase (AWAITING_VOLUNTEERS → PLANNING → IN_PROGRESS → COMPLETED)
- **`isActive`**: Controls volunteer recruitment (can be true even when IN_PROGRESS)

For detailed schema information, see `prisma/schema.prisma` and `docs/guides/maix-data-model.md`.

## Feature Development Documentation

When designing new features:

1. **Always use the template**: Copy `docs/designs/FEATURE-DESIGN-TEMPLATE.md`
2. **Focus on architecture**: Emphasize high-level design, not implementation details
3. **Use phases, not dates**: "Phase 1: Core functionality" not "Week 1"
4. **Apply DRS process**: For complex features, use Design-Review-Simplify workflow

Directory structure for designs:
- `docs/designs/experimental/`: Early explorations
- `docs/designs/planned/`: Ready for implementation
- `docs/designs/active/`: Currently being built
- `docs/designs/shipped/`: Completed features

## Testing Strategy

See `docs/guides/testing-strategy.md` for our comprehensive testing philosophy.

**Quick summary**:
1. **Unit Tests** - Primary choice for business logic
2. **API Route Tests** - Test endpoints with mocked database
3. **Component Tests** - Basic rendering only
4. **E2E Tests** - Reserve for critical user workflows

## Code Health

**Quick health check**:
```bash
npm audit --audit-level=moderate  # Fix Critical/High only
grep -r "console\." src/ | wc -l  # Should trend down
npm outdated                       # Update only if needed
```

## Additional Resources

### Key Documentation
- **README.md**: Technology stack, setup, and general information
- **docs/guides/testing-strategy.md**: Comprehensive testing philosophy
- **docs/guides/maix-data-model.md**: Database schema and patterns
- **docs/guides/google-genai-sdk-usage.md**: Google AI integration
- **docs/designs/FEATURE-DESIGN-TEMPLATE.md**: Feature design process

### Community Values
- Prioritize community benefit over profit
- Promote knowledge sharing
- Build trust through transparency
- Foster collaborative spirit

## Key Reminders for Claude Code

1. **Safety First**: Follow git and database safety protocols above
2. **Keep It Simple**: Bias towards simple solutions for current problems
3. **Use DRSITR**: Design, Review, Simplify, Implement, Test, Review
4. **Test Pragmatically**: See testing-strategy.md
5. **Track Progress**: Use TodoWrite tool for task management
6. **No Claude Suffixes**: Never add "Generated with Claude Code" to commits