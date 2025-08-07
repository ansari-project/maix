# CLAUDE.md - Maix Project Instructions

## ⚠️ CRITICAL REMINDERS - READ BEFORE EVERY GIT OPERATION ⚠️

1. **NEVER FORCE PUSH** - This can permanently delete other people's work
2. **ALWAYS CHECK FOR REMOTE CHANGES** before pushing: `git fetch origin && git log HEAD..origin/main --oneline`
3. **IF PUSH FAILS** - STOP and ask the user how to proceed. DO NOT make decisions independently.
4. **This is a COLLABORATIVE repository** - Other developers' work must be protected

## ⚠️ CRITICAL DATABASE SAFETY - READ BEFORE ANY PRISMA OPERATION ⚠️

### Migration Best Practices (Updated August 5, 2025 - AI Agent Compatible)

1. **NEVER use `npx prisma db push`** - This command is destructive and will drop/recreate tables
   - ❌ `npx prisma db push` - NEVER USE THIS on any shared database
   - ❌ `npx prisma migrate dev` - Interactive only, breaks AI agents
   - ✅ `npm run db:migrate:new` - Safe, non-interactive migration creation
   - ✅ `npm run db:migrate:apply` - Apply migrations safely

2. **AI Agent Compatible Workflow (migrate diff + deploy)**:
   ```bash
   # Step 1: Create migration from schema changes (no prompts!)
   npm run db:migrate:new descriptive_name
   
   # Step 2: Review the generated SQL
   cat prisma/migrations/*/migration.sql
   
   # Step 3: Apply when ready
   npm run db:migrate:apply
   ```

3. **Environment Safety Protocol**:
   - ALWAYS use npm scripts (they auto-load .env)
   - Scripts show which database you're targeting
   - Production requires explicit confirmation
   - Use `npm run db:migrate:status` to check state

4. **Available Safe Commands**:
   ```bash
   npm run db:migrate:new migration_name  # Create migration using migrate diff
   npm run db:migrate:apply               # Apply pending migrations using deploy
   npm run db:migrate:status              # Check migration status
   npm run db:backup                      # Backup database with table counts
   npm run db:health                      # Comprehensive database health check
   npm run db:studio                      # Open Prisma Studio (read-only recommended)
   ```

5. **How It Works Under the Hood**:
   - `db:migrate:new` runs `./scripts/create-migration.sh` which uses `prisma migrate diff`
   - This generates SQL by comparing your schema to the current database state
   - `db:migrate:apply` uses `prisma migrate deploy` (production-safe, non-interactive)
   - No TTY detection issues, no interactive prompts, works perfectly with AI agents

6. **Data Backup Before ANY Migration**:
   ```bash
   npm run db:backup
   ```

7. **If unsure about environment - the scripts will show you!**

This warning exists because:
- `db push` destroyed production data multiple times in July 2025
- Interactive `migrate dev` breaks AI agents and CI/CD
- Environment variable confusion led to wrong database targeting
- Prisma's design assumes human developers, not automation

See `docs/guides/prisma.md` for comprehensive safety guidelines.

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

### DAPPER Development Methodology

**DAPPER** - Our structured development workflow: Design, Align, Plan, Produce, Evaluate, Refine

DAPPER ensures thoughtful design, human alignment, and high-quality implementation. The key principle: **one document evolves through the entire process**, maintaining a complete history of proposals, decisions, and rationale.

#### When to Use DAPPER

**Use DAPPER for:**
- New features requiring design decisions
- Complex refactoring with multiple approaches  
- Architecture changes with trade-offs
- Any work with significant complexity

**Skip DAPPER for:**
- Simple bug fixes
- Text/copy changes
- Configuration updates
- Straightforward dependency updates

#### The Six Stages

##### 1. Design - Collaborative AI Design

**Purpose**: Create comprehensive design exploring multiple approaches

**Process**:
- Multiple AI agents collaborate to explore technical solutions
- Identify and propose simplifications to prevent over-engineering
- Surface trade-offs and alternative approaches
- Flag unresolved questions requiring human input

**Output**: Design document with architecture proposals, simplifications, alternatives, open questions, and risk analysis

##### 2. Align - Human Alignment & Decisions

**Purpose**: Review AI proposals and make strategic decisions

**Process**:
- Review each proposed simplification
- Make decisions on all open questions
- Provide additional constraints if needed
- Document rationale for decisions

**Output**: SAME document updated with decisions marked `[ACCEPTED]`, `[REJECTED]`, or `[DECIDED: choice + rationale]`, plus new "Alignment Outcomes" section

**Example transformation**:
```markdown
Before: **Awaiting Decision**
After:  **[ACCEPTED]** - Simplicity outweighs audit granularity
```

##### 3. Plan - Phase-Based Implementation Plan

**Purpose**: Break aligned design into executable phases

**Process**: Convert design into sequential phases that each deliver working functionality with clear success criteria, then get expert review from O4 and Gemini Pro

**Output**: Numbered phase plan with deliverables, dependencies, and success criteria (reviewed and validated)

##### 4. Produce - Iterative Development

**Purpose**: Execute the implementation plan

**Process**: For each phase: Implement → Test → Review (`mcp__zen__codereview`) → Update plan

**Output**: Working, tested code with plan document updated (no separate phase docs)

##### 5. Evaluate - Comprehensive Assessment

**Purpose**: Validate implementation against requirements

**Process**: Run integration tests, verify requirements, validate performance/security, user acceptance

**Output**: Evaluation report with test results, metrics, and identified issues

##### 6. Refine - Final Polish

**Purpose**: Address evaluation findings and prepare for production

**Process**: Fix identified issues, update documentation, optimize code, final quality checks

**Output**: Production-ready release

#### Document Evolution

The key insight: **one document evolves** through the process:

```
Initial Design → [Align] → Aligned Design → [Plan] → Phase Plan → [Produce] → Progress Tracking
     ↓                           ↓                        ↓                          ↓
Proposals & Questions    Decisions Made         Phases Defined            Phases Completed
```

#### Best Practices

- **Design**: Let AI explore broadly, document trade-offs, be specific about open questions, categorize questions by tier
- **Align**: Answer ALL Tier 1 questions first, make clear decisions with rationale, update design doc immediately
- **Plan**: Only start after Align gate passed, keep phases small and independently valuable, front-load risky work, get O4 and Gemini Pro review before proceeding
- **Produce**: Update plan in real-time, complete phases sequentially, test as you go
- **Evaluate**: Test against requirements and edge cases, verify assumptions
- **Refine**: Update docs, clean technical debt, ensure deployment readiness

#### Lessons Learned from Event Manager

**What Went Wrong**: Jumped from Align to Plan without answering critical questions about public/private events, PAT UX, and capacity limits.

**Key Learning**: The Align stage isn't complete just because you've made simplification decisions. You must also:
1. Answer all Tier 1 questions
2. Update the design document
3. Get stakeholder sign-off
4. Verify no contradictions remain

**Prevention**: Use the stage gate checklist. Cannot proceed to Plan until ALL items checked.

#### Stage Gate Criteria

**CRITICAL**: You cannot proceed to the next stage without meeting exit criteria.

##### Design → Align Gate
- ✅ Architecture diagram complete
- ✅ Key components identified  
- ✅ Technical approach documented
- ✅ Open questions listed
- ✅ Initial risk assessment done

##### Align → Plan Gate  
- ✅ ALL Tier 1 (critical) questions answered
- ✅ Simplifications agreed and documented
- ✅ Design document updated with decisions
- ✅ No contradictions in documentation
- ✅ Technical feasibility validated
- ✅ Stakeholder sign-off obtained

##### Plan → Produce Gate
- ✅ Phases clearly defined with deliverables
- ✅ Dependencies mapped between phases
- ✅ Each phase has acceptance criteria
- ✅ Testing strategy defined
- ✅ Resource requirements identified
- ✅ **Expert Review**: Plan reviewed by O4 and Gemini Pro for feasibility and completeness

##### Produce → Evaluate Gate
- ✅ All planned phases complete
- ✅ Code passes all tests
- ✅ Documentation updated
- ✅ No critical bugs open
- ✅ Feature works end-to-end

##### Evaluate → Refine Gate
- ✅ Performance benchmarks met
- ✅ User feedback collected
- ✅ Issues prioritized by severity
- ✅ Refinement scope defined

#### Question Prioritization Framework

When you have open questions during Align, categorize them:

**Tier 1: Critical Blockers** (MUST answer before Plan)
- Affects database schema or core models
- Determines API design or architecture
- Impacts security or authentication
- Defines core business logic

**Tier 2: Important** (Should answer before relevant phase)
- Affects specific feature behavior
- Determines UI/UX patterns
- Impacts performance optimization

**Tier 3: Deferrable** (Can answer later or during implementation)
- Nice-to-have features
- Future enhancements
- Optimization details

#### Common Pitfalls to Avoid

1. **Premature Planning**: Moving to Plan before answering Tier 1 questions
2. **Skipping Align**: Don't let AI make business decisions
3. **Big Phases**: Keep phases small and deliverable
4. **Multiple Documents**: Maintain one evolving document
5. **No Stage Gates**: Proceeding without meeting exit criteria
6. **Silent PAT Generation**: For third-party integrations, always get user consent
7. **Incoherent Plans**: Phase objectives must match their tasks

#### Quick Reference

```
D - Design    : AI explores and proposes
A - Align     : Human decides and aligns  
P - Plan      : Break into executable phases
P - Produce   : Build, test, review, repeat
E - Evaluate  : Comprehensive validation
R - Refine    : Polish for production
```

### Project Management
- **Phase-Based Development**: We organize work into phases based on functionality, not time
- **Phases represent logical completion points**: Each phase delivers working functionality
- **No time estimates**: Phases are defined by deliverables, not duration
- **Sequential phases**: Complete one phase before moving to the next

### Git Guidelines

**Commits**: No "Generated with Claude Code", descriptive messages, use `git add [specific-files]` never `git add .`

**Pushing**: Never force push, always `git fetch origin && git status` first, if rejected STOP and ask user

### Pre-Commit Checklist

1. **Include dependencies**: Both `package.json` AND `package-lock.json` if changed
2. **Validate locally**: Run `npm run build` and `npm run test`
3. **Review significant changes**: Use `mcp__zen__codereview` for features

### Simplicity and Pragmatism

- **Bias towards simple solutions**: Address problems we currently have, not hypothetical future scaling issues
- **Avoid premature optimization**: Don't implement complex patterns for problems that don't exist yet
- **Use straightforward Prisma queries**: Query existing models directly rather than complex abstraction layers
- **Focus on current scale**: Design for the data and usage patterns we have today
- **Iterative complexity**: Add architectural complexity only when simple solutions prove insufficient

#### Example: Keeping Things Simple

**Avatar Photos**: Display user names instead of complex image handling. Eliminates storage, uploads, and UI complexity while providing essential identification. Similar approach for performance (optimize only when needed) and moderation (add only if abuse occurs).

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

### Technical Standards

**Database**: Use Prisma for all operations, transactions for multi-table, proper error handling
**Auth**: NextAuth.js for protected routes, role-based access, validate sessions on API routes  
**UI/UX**: Clean design, WCAG 2.1 AA accessibility, semantic HTML, Markdown support via `<Markdown>` component

## Key Database Concepts

### Project Lifecycle Management

Projects use a dual status system:
- **`status`**: Tracks lifecycle phase (AWAITING_VOLUNTEERS → PLANNING → IN_PROGRESS → COMPLETED)
- **`isActive`**: Controls volunteer recruitment (can be true even when IN_PROGRESS)

For detailed schema information, see `prisma/schema.prisma` and `docs/guides/maix-data-model.md`.

## Feature Documentation

For new features, use `docs/designs/FEATURE-DESIGN-TEMPLATE.md`. Focus on architecture, define phases by functionality not duration.

Directory structure: `experimental/` → `planned/` → `active/` → `shipped/`

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

**Key Docs**: README.md (setup), testing-strategy.md, maix-data-model.md, google-genai-sdk-usage.md

**Community Values**: Community benefit over profit, knowledge sharing, transparency, collaboration

## Key Reminders for Claude Code

1. **Safety First**: Follow git and database safety protocols above
2. **Keep It Simple**: Bias towards simple solutions for current problems
3. **Use DAPPER**: Design, Align, Plan, Produce, Evaluate, Refine
4. **Test Pragmatically**: See testing-strategy.md
5. **Track Progress**: Use TodoWrite tool for task management
6. **No Claude Suffixes**: Never add "Generated with Claude Code" to commits