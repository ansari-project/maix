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

### Testing Requirements (CRITICAL - Updated August 9, 2025)

#### 🐳 TEST DATABASE WITH DOCKER - YES WE HAVE ONE!
**IMPORTANT**: We have a fully functional test database using Docker. USE IT for integration tests!

```bash
# Start the test database (Docker required)
npm run test:db:start     # Starts PostgreSQL on port 5433

# Run integration tests with real database
npm run test:integration  # Runs all integration tests
npm run test:int         # Alternative: uses test-db script

# Stop/reset test database
npm run test:db:stop     # Stops the container
npm run test:db:reset    # Completely resets the database

# Full test suite
npm run test:all         # Runs both unit and integration tests
```

**Test Database Configuration:**
- Runs on port 5433 (not 5432) to avoid conflicts with dev database
- Database name: `maix_test`
- User: `testuser`
- Password: `testpass`
- Copy `.env.test.example` to `.env.test` for configuration
- Database URL: `postgresql://testuser:testpass@localhost:5433/maix_test`

#### Integration-First Testing Strategy
**IMPORTANT**: We use an "integration-first" approach. Mocked tests give false confidence and miss real bugs.

1. **Test Database Setup (Phase 1 Requirement)**
   - Start Docker: `npm run test:db:start`
   - Copy `.env.test.example` to `.env.test` and configure
   - Run `npm run test:integration` to verify setup

2. **Testing Priority Order**
   ```
   1. Integration Tests (60%) - Real database, real constraints
   2. Unit Tests (30%) - Only for pure business logic  
   3. E2E Tests (10%) - Critical user paths
   ```

3. **When to Mock vs When to Use Real Database**
   - ✅ Use REAL database for: Service layer, API routes, data operations
   - ✅ Mock ONLY: External services (email, payments, third-party APIs)
   - ❌ NEVER mock: Prisma, database operations, internal services

4. **Schema Validation Requirements**
   - Run `npm run build` after EVERY schema change
   - Test with real database queries immediately
   - No phase is complete without TypeScript compilation passing

5. **Integration Test Checklist**
   ```bash
   # Before running integration tests:
   [ ] Test database running? Check with: docker ps | grep postgres-test
   [ ] If not running: npm run test:db:start
   [ ] Run integration tests: npm run test:integration
   [ ] Test database uses port 5433 (not 5432)
   [ ] Integration tests use real database via prismaTest from db-test-utils
   
   # For every new feature:
   [ ] Docker started: npm run test:db:start
   [ ] .env.test configured with test database URL
   [ ] Integration tests written BEFORE implementation
   [ ] Real database operations tested
   [ ] Transactions and rollbacks verified
   [ ] Constraints and cascades tested
   ```

**Available Test Commands:**
- `npm test` - All tests (unit + integration if DB is running)
- `npm run test:unit` - Unit tests only (excludes integration)
- `npm run test:integration` - Integration tests with real database
- `npm run test:integration:full` - Starts DB then runs integration tests
- `npm run test:integration:single` - Starts DB then runs single test file
- `npm run test:int` - Alternative integration test runner (uses scripts/int_test.sh)
- `npm run test:all` - Both unit and integration tests
- `npm run test:watch` - Watch mode for unit tests
- `npm run test:integration:watch` - Watch mode for integration tests
- `npm run test:db:start` - Start Docker test database
- `npm run test:db:stop` - Stop Docker test database
- `npm run test:db:reset` - Reset Docker test database

**Important Notes:**
- Integration tests require Docker to be running
- Test database runs on port 5433 (production uses 5432)
- Tests use real database operations, not mocks
- Database is cleaned between tests but not dropped

See `docs/guides/integration-testing.md` for detailed guide.

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
- Identify and PROPOSE simplifications as OPTIONS (not decisions) to prevent over-engineering
- Present simplifications with pros/cons for human to choose
- Surface trade-offs and alternative approaches
- Flag unresolved questions requiring human input

**Output**: Design document with architecture proposals, simplification OPTIONS (not decisions), alternatives, open questions, and risk analysis

##### 2. Align - Human Alignment & Decisions

**Purpose**: Review AI proposals and make strategic decisions

**Process**:
- Review each proposed simplification OPTION
- Choose which simplifications to accept or reject
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

**Process**: 
- Convert design into sequential phases that each deliver working functionality
- Define clear success criteria for each phase
- **MANDATORY**: Get expert review from multiple models (e.g., O4 and Gemini Pro) before proceeding
- Incorporate review feedback into final plan

**Output**: Numbered phase plan with deliverables, dependencies, success criteria, and expert review confirmation

##### 4. Produce - Iterative Development (ITR Cycle with Evidence-Based Enforcement)

**Purpose**: Execute the implementation plan with verifiable completion

**MANDATORY Process** - For EACH phase, you MUST complete the ITR cycle:
1. **Implement**: Build the code for current phase
2. **Test**: Write and run tests for the implementation IMMEDIATELY after implementing
3. **Review**: Code review using `mcp__zen__codereview`
4. **Update**: Update plan document with progress

**CRITICAL**: Testing is NOT a separate phase - it happens WITHIN each phase as part of the ITR cycle. Every phase must have its own tests before moving to the next phase.

**⚠️ CRITICAL ENFORCEMENT - EVIDENCE-BASED COMPLETION**:
- **NEVER mark a todo as complete without evidence of execution**
- **Test step**: Must show actual test output (npm test results or specific test file runs)
- **Review step**: Must capture continuation_id from mcp__zen__codereview tool
- **Each phase**: Cannot proceed to next phase until all ITR evidence is documented

**Evidence Requirements**:
```
✅ CORRECT TODO COMPLETION:
Todo: "Phase 2: Write tests"
Evidence: Test output showing "Test Suites: 5 passed, Tests: 42 passed"
Status: Can mark complete ✓

❌ INCORRECT TODO COMPLETION - NO PASSING TESTS:
Todo: "Phase 2: Write tests"
Evidence: Test output showing "Tests: 10 failed, 2 passed"
Status: CANNOT mark complete ✗ - Tests must PASS

❌ INCORRECT TODO COMPLETION - NO EVIDENCE:
Todo: "Phase 2: Code review"
Evidence: None (tool not run)
Status: CANNOT mark complete ✗
```

**Verification Checklist Before Marking ITR Steps Complete**:
- [ ] Did I actually run the tool/command?
- [ ] Do I have output/results to prove it?
- [ ] For tests: Do ALL tests PASS? (Not just "tests written")
- [ ] Can I provide the continuation_id or execution proof?
- [ ] Would an audit find evidence this step was done?

**Anti-Pattern Prevention**:
- **DO NOT**: Mark review todos complete without running mcp__zen__codereview
- **DO NOT**: Mark test todos complete without showing test results
- **DO NOT**: Mark test todos complete if tests are FAILING
- **DO NOT**: Skip steps due to perceived time pressure
- **DO NOT**: Batch-mark multiple todos complete without individual evidence
- **DO NOT**: Proceed to next phase without completing ALL ITR steps with evidence

**Phase Completion Requirement**:
- **MANDATORY**: Commit at the end of EVERY phase after completing ITR cycle
- Each phase must be a complete, working unit that can be committed
- This ensures incremental progress and prevents large, risky commits
- If a phase cannot be committed, it's too large - break it down further

**Output**: Working, tested, reviewed code with evidence trail, updated plan document, and committed to git

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
- ✅ **Expert Review MANDATORY**: Plan reviewed by multiple models (O4, Gemini Pro, etc.) for feasibility and completeness
- ✅ Review feedback incorporated into plan
- ✅ Final plan validated and approved

##### Produce → Evaluate Gate
- ✅ All planned phases complete
- ✅ Each phase completed ITR cycle (Implement, Test, Review) WITH EVIDENCE
  - ✅ Test execution logs captured and verified
  - ✅ Code review continuation_id documented
  - ✅ No steps marked complete without proof of execution
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

#### ITR Evidence Collection (MANDATORY)

**Every ITR step requires documented evidence before marking complete:**

| Step | Evidence Required | Example |
|------|------------------|---------|
| **Implement** | Code changes staged/committed | `git status` showing files modified |
| **Test** | Test execution output | `npm test` results or `jest` output |
| **Review** | Code review tool output | `continuation_id` from mcp__zen__codereview |

**Process Integrity Rule**: If you cannot provide evidence, the step is NOT complete.

#### Common Pitfalls to Avoid

1. **Premature Planning**: Moving to Plan before answering Tier 1 questions
2. **Skipping Align**: Don't let AI make business decisions
3. **Big Phases**: Keep phases small and deliverable
4. **Multiple Documents**: Maintain one evolving document
5. **No Stage Gates**: Proceeding without meeting exit criteria
6. **Silent PAT Generation**: For third-party integrations, always get user consent
7. **Incoherent Plans**: Phase objectives must match their tasks
8. **Marking Without Evidence**: NEVER mark ITR steps complete without proof of execution

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

### Script Organization
- **Keep scripts organized**: Do not scatter .js and .py files throughout the codebase
- **Use scripts/tmp/**: Place temporary or one-off scripts in `scripts/tmp/` directory
- **Main scripts directory**: Production scripts go in `scripts/`
- **Clear naming**: Use descriptive names that indicate the script's purpose
- **Documentation**: Add comments at the top of scripts explaining their purpose
- **Environment variables**: Do not set env vars directly on the command line (e.g., `DATABASE_URL=... npm test`). Instead, create a script that sets the env vars internally

### Git Guidelines

**Commits**: No "Generated with Claude Code", descriptive messages, use `git add [specific-files]` never `git add .`

**CRITICAL SECURITY**: 
- **NEVER use `git add -A`** - This can cause security issues by accidentally adding sensitive files
- **NEVER use `git add .`** - Always use specific file paths with `git add [specific-files]`

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

### TypeScript Configuration Strategy

Our project uses two separate TypeScript configuration files to ensure correctness for both development and production builds. This separation is intentional and critical.

- **`tsconfig.json` (The Base Config)**
  - **Purpose**: Primary configuration used for local development by editors (VS Code) and for running our test suite via Jest (`ts-jest`)
  - **Scope**: Configured to understand the entire codebase, including application source code, test files, and test-specific libraries (Jest globals). Provides seamless developer experience.

- **`tsconfig.build.json` (The Build Config)**
  - **Purpose**: Used exclusively by CI/CD pipeline for build validation (`npx tsc --noEmit -p tsconfig.build.json`)
  - **Scope**: Inherits from base `tsconfig.json` but explicitly **excludes** all test files (`**/*.test.ts`, etc.)
  - **Why**: Ensures CI type-check precisely matches what Next.js includes in production builds, preventing CI failures due to test-specific code

This approach follows TypeScript best practices: different environments (application vs test) have different type contracts and should be validated separately.

### Debugging CI/CD Issues Efficiently

When GitHub Actions jobs fail, use GitHub CLI (`gh`) for faster debugging instead of navigating the web UI or using inefficient sleep commands.

**Core Workflow**:

1. **Check Status**: List recent runs to find failures
   ```bash
   gh run list --limit 5
   ```

2. **View Detailed Status**: Get job breakdown for a specific run
   ```bash
   gh run view <RUN_ID>
   ```

3. **Get Failed Logs**: View logs for failed jobs (works immediately after completion)
   ```bash
   gh run view --log-failed --job=<JOB_ID>
   ```

4. **Monitor Progress**: Check status periodically while working on other tasks
   ```bash
   # Work on other tasks, then check:
   gh run view <RUN_ID>
   ```

**Pro Tips**:
- Don't use `sleep` commands - work asynchronously and check periodically
- Use `--log-failed` to get only the relevant error information
- The `gh run view` command shows real-time status without repeatedly polling

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