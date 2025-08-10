# CLAUDE.md - Maix Project Instructions

## ⚠️ CRITICAL SAFETY PROTOCOLS ⚠️

### Git Safety - READ BEFORE EVERY GIT OPERATION

1. **NEVER FORCE PUSH** - This can permanently delete other people's work
2. **ALWAYS CHECK FOR REMOTE CHANGES** before pushing: `git fetch origin && git log HEAD..origin/main --oneline`
3. **IF PUSH FAILS** - STOP and ask the user how to proceed. DO NOT make decisions independently.
4. **This is a COLLABORATIVE repository** - Other developers' work must be protected
5. **NEVER use `git add -A` or `git add .`** - Always use specific file paths with `git add [specific-files]`

### Database Safety - READ BEFORE ANY PRISMA OPERATION

#### Migration Best Practices (AI Agent Compatible)

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
   - ALWAYS use npm scripts (they auto-load .env correctly)
   - Scripts show which database you're targeting before running
   - Production requires explicit confirmation
   - Use `npm run db:migrate:status` to verify current state

4. **ALWAYS backup before migrations**:
   ```bash
   npm run db:backup
   ```

5. **Available Safe Commands**:
   ```bash
   npm run db:migrate:new migration_name  # Create migration using migrate diff
   npm run db:migrate:apply               # Apply pending migrations using deploy
   npm run db:migrate:status              # Check migration status
   npm run db:backup                      # Backup database with table counts
   npm run db:health                      # Comprehensive database health check
   npm run db:studio                      # Open Prisma Studio (read-only recommended)
   ```

**How It Works Under the Hood**:
- `db:migrate:new` runs `./scripts/create-migration.sh` which uses `prisma migrate diff`
- This generates SQL by comparing your schema to the current database state
- `db:migrate:apply` uses `prisma migrate deploy` (production-safe, non-interactive)
- No TTY detection issues, no interactive prompts, works perfectly with AI agents

This warning exists because:
- `db push` destroyed production data multiple times in July 2025
- Interactive `migrate dev` breaks AI agents and CI/CD
- Environment variable confusion led to wrong database targeting
- Prisma's design assumes human developers, not automation

See `docs/guides/prisma.md` for comprehensive safety guidelines.

---

## Project Overview

Maix (Meaningful AI Exchange) is an **AI-accelerated not-for-profit action and collaboration platform** built on Next.js 15. We connect skilled volunteers with meaningful AI/tech projects to advance communities through collaborative innovation.

### Core Focus Areas
- **ACTION** 🎯 - Getting things done efficiently with AI assistance
- **COMMUNITY** 👥 - Doing it together, AI-facilitated collaboration  
- **AI ASSISTANCE** ⚡ - Every workflow enhanced by intelligent automation

### AI-Native Platform Philosophy

**Maix is fundamentally AI-native** - unlike platforms that retrofit AI features onto existing paradigms, we're built from the ground up with AI as the primary interface and collaboration mechanism.

**What Makes Us AI-Native:**
- AI-first navigation and discovery (not traditional menus + AI addon)
- Intelligent project/task matching based on skills and context
- AI-assisted onboarding, contribution guidance, and code reviews
- Natural language interfaces for complex platform interactions
- Proactive suggestions and contextual assistance throughout workflows

**Competitive Differentiation:** While GitHub, Linear, and other platforms add AI features to existing UX patterns, Maix is designed as an AI-native experience where artificial intelligence is the primary way users interact with projects, discover opportunities, and collaborate with others.

### Technology Stack
- **Framework**: Next.js 15 with App Router
- **Database**: Neon PostgreSQL with pgvector extension
- **Auth**: NextAuth.js with Google OAuth
- **AI**: Google Gemini via `@google/genai` package (see `/docs/guides/google-genai-sdk-usage.md`)
- **UI**: shadcn/ui components

### Project Structure
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
├── scripts/              # Build and utility scripts
│   └── tmp/             # Temporary/one-off scripts
└── docs/                 # Documentation
    ├── guides/           # How-to guides
    ├── designs/          # Feature designs
    └── howtos/           # User instructions
```

---

## DAPPER Development Methodology

**DAPPER** - Our structured development workflow: Design, Align, Plan, Produce, Evaluate, Revise

DAPPER ensures thoughtful design, human alignment, and high-quality implementation through two key documents that maintain complete history of proposals, decisions, and rationale.

### ⚠️ CRITICAL DAPPER ENFORCEMENT RULES ⚠️

**MANDATORY EARLY-STAGE COMPLIANCE** - Claude Code MUST NOT write ANY implementation code until:

#### DESIGN PHASE REQUIREMENTS (STRICT)
1. **COMPREHENSIVE DESIGN DOCUMENT** - MUST include:
   - Multiple architecture options with pros/cons
   - Open questions categorized by tier (Critical/Important/Deferrable)
   - Risk assessment matrix
   - Proposed simplifications as OPTIONS (not decisions)
   - Alternative approaches considered
2. **NO PREMATURE SOLUTIONS** - Do NOT:
   - Start coding "to explore"
   - Create "quick prototypes" 
   - Write "example implementations"
   - Make architecture decisions (that's for Align phase)
3. **EXPERT ANALYSIS REQUIRED** - Use mcp__zen__thinkdeep or similar for design validation

#### ALIGN PHASE REQUIREMENTS (STRICT)
1. **HUMAN MUST EXPLICITLY DECIDE** - Cannot proceed without:
   - ALL Tier 1 questions answered with `[DECIDED: ...]`
   - Simplifications marked `[ACCEPTED]` or `[REJECTED]`
   - Architecture choice confirmed
   - Written approval to proceed to Plan
2. **NO ASSUMPTIONS** - If human says "looks good" or "proceed", CLARIFY:
   ```
   "Before I continue, I need explicit decisions on:
   - Question 1: [state question] - Your decision?
   - Question 2: [state question] - Your decision?
   Please respond with your specific choices."
   ```
3. **DOCUMENT MUST BE UPDATED** - The design document MUST show all decisions

#### AUTOMATIC STOP CONDITIONS
**Claude Code MUST STOP and refuse to continue if:**
- User asks to "implement" but no design exists → "I need to create a DAPPER design first"
- User says "go ahead" but questions unanswered → "I need your decisions on these questions first"
- User requests code but Align incomplete → "We haven't completed the Align phase yet"
- Design exists but no expert review → "I need to get expert analysis of this design"

#### ENFORCEMENT EXAMPLES

**WRONG** (Common Deviation):
```
User: "Build an AI assistant"
Claude: "I'll create a basic implementation to get started..." [STARTS CODING]
```

**CORRECT**:
```
User: "Build an AI assistant"
Claude: "I'll follow DAPPER methodology. First, I need to create a comprehensive design document.
Let me start by exploring different architecture options...
[CREATES DESIGN DOCUMENT WITH OPTIONS AND QUESTIONS]
The design is ready for your review. Please make decisions on the critical questions before we proceed."
```

**WRONG** (Premature Progression):
```
User: "Looks good"
Claude: "Great! I'll start implementing..." [PROCEEDS TO PLAN/PRODUCE]
```

**CORRECT**:
```
User: "Looks good"
Claude: "Thank you! Before proceeding, I need your explicit decisions on:
1. Should the AI have write access? (Options: read-only vs full CRUD)
2. How should we handle conversation history? (Options: session-only vs persistent)
3. What's the monthly Gemini API budget?
Please provide your specific choices for each."
```

**Document Flow**:
```
[feature-name]-design.md (Phases D → A)
├─ Design: Initial proposals, questions, alternatives
└─ Align: Decisions marked [ACCEPTED]/[REJECTED], rationale added
         ↓
    [Plan Phase creates Implementation Plan]
         ↓
[feature-name]-plan.md (Phases P → P → E → R)  
├─ Plan: Phases with ITRC structure defined
├─ Produce: Progress tracking, evidence trail added
├─ Evaluate: Test results, metrics incorporated
└─ Revise: Retrospective report + Updates to both docs with lessons learned
```

**Example**: For complete interface redesign:
- `complete-interface-redesign-design.md` → Design & Align phases
- `complete-interface-redesign-plan.md` → Plan through Revise phases

**Note**: Both documents MUST share the same prefix for clarity and traceability.

### DAPPER Configuration

**Expert Review Models**: When expert review is required (particularly in the Plan stage), use the following models:
- **Primary Models**: GPT-5 and Gemini Pro
- **Alternative Models**: O3, Claude Opus, or other high-capability models as available
- **Minimum Requirement**: At least two different expert models for critical reviews

This configuration applies to all DAPPER expert review requirements mentioned throughout this document.

### When to Use DAPPER

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

### Staying on Track - Plan Adherence Rules

**CRITICAL**: Once a DAPPER plan is approved, Claude Code MUST:

1. **FOLLOW THE PLAN EXACTLY** - Do not deviate from the approved implementation plan
2. **CHECK TODOS CONSTANTLY** - Use TodoWrite to track current phase and sub-tasks
3. **NO SCOPE CREEP** - If user requests features not in plan, respond:
   ```
   "This feature isn't in our current plan. We should either:
   1. Complete the current phase first, or
   2. Update the plan document with this change and get approval"
   ```
4. **PHASE BOUNDARIES** - Complete ALL ITRC tasks for current phase before moving to next
5. **DOCUMENT UPDATES** - Any plan changes MUST be reflected in the plan document

**Plan Deviation Protocol**:
- If deviation needed → Update plan document
- Get human approval for changes
- Update todos to reflect new plan
- Only then proceed with implementation

**Example Enforcement**:
```
User: "While you're at it, can you also add voice input?"
Claude: "Voice input is not in our current Phase 1 plan for the AI Assistant.
Current phase focuses on: [lists current phase objectives]
We should complete this phase first, then we can add voice input to Phase 4.
Would you like to continue with the current plan or revise it?"
```

### The Six Stages

#### 1. Design - Collaborative AI Design

**Purpose**: Create comprehensive design exploring multiple approaches

**CRITICAL RULES**:
- **NEVER MAKE DECISIONS** - Only present OPTIONS with pros/cons
- **NO DEFAULT CHOICES** - Don't mark anything as "recommended" or "selected"
- **QUESTIONS NOT ANSWERS** - End with questions for human, not conclusions

**Process**:
- Multiple AI agents collaborate to explore technical solutions
- Identify and PROPOSE simplifications as OPTIONS (not decisions) to prevent over-engineering
- Present simplifications with pros/cons for human to choose
- Surface trade-offs and alternative approaches
- Flag unresolved questions requiring human input

**Output**: Design document with architecture proposals, simplification OPTIONS (not decisions), alternatives, open questions, and risk analysis

**ANTI-PATTERN TO AVOID**:
```markdown
❌ WRONG: "We will use server-side architecture for security"
✅ RIGHT: "Option A: Server-side (Pros: secure, Cons: latency) 
          Option B: Client-side (Pros: fast, Cons: API key exposure)
          Which architecture should we use?"
```

#### 2. Align - Human Alignment & Decisions

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

#### 3. Plan - Phase-Based Implementation Plan with ITRC Structure

**Purpose**: Break aligned design into executable phases with structured ITRC sub-tasks

**Process**: 
- Convert design into sequential phases that each deliver working functionality
- **MANDATORY**: Each phase MUST be broken down into ITRC sub-tasks:
  - **I (Implement)**: Build the functionality
  - **T (Test)**: Write and run tests
  - **R (Review)**: Code review with mcp__zen__codereview
  - **C (Commit & Push)**: Git commit and push after ITRC complete
- Define clear success criteria for each ITRC step
- **MANDATORY**: Get expert review from multiple models (see DAPPER Configuration above) before proceeding
- Incorporate review feedback into final plan

**Output**: Phase plan with ITRC-structured todos, deliverables, dependencies, success criteria, and expert review confirmation

**Example Phase Structure**:
```
Phase 2: Implement User Authentication
  ├─ Phase 2-I: Implement - Build auth components and API
  ├─ Phase 2-T: Test - Write and run auth tests
  ├─ Phase 2-R: Review - Code review with continuation_id
  └─ Phase 2-C: Commit & Push - Git commit and push with ITRC evidence
```

#### 4. Produce - Iterative Development (ITRC Cycle with Evidence-Based Enforcement)

**Purpose**: Execute the implementation plan with verifiable completion

**MANDATORY Process** - For EACH phase, you MUST complete the ITRC cycle:
1. **I - Implement**: Build the code for current phase
2. **T - Test**: Write and run tests for the implementation IMMEDIATELY after implementing
3. **R - Review**: Code review using `mcp__zen__codereview`
4. **C - Commit & Push**: Git commit with ITRC evidence AND push to remote repository

**CRITICAL**: Testing is NOT a separate phase - it happens WITHIN each phase as part of the ITRC cycle. Every phase must have its own tests before moving to the next phase.

##### TodoWrite Integration

When creating todos for phases, ALWAYS use the ITRC structure:
```typescript
// CORRECT: Explicit ITRC structure
todos = [
  { content: "Phase 1: Build Core Layout", status: "pending" },
  { content: "Phase 1-I: Implement - Create layout components", status: "pending" },
  { content: "Phase 1-T: Test - Write and run layout tests", status: "pending" },
  { content: "Phase 1-R: Review - Code review", status: "pending" },
  { content: "Phase 1-C: Commit & Push - Git commit and push", status: "pending" }
]

// WRONG: Missing ITRC structure
todos = [
  { content: "Phase 1: Build Core Layout", status: "pending" },
  { content: "Phase 2: Add Features", status: "pending" }
]
```

##### Evidence-Based Completion Requirements

**⚠️ CRITICAL ENFORCEMENT**:
- **NEVER mark a todo as complete without evidence of execution**
- **Test step**: Must show actual test output (npm test results showing PASSING tests)
- **Review step**: Must capture continuation_id from mcp__zen__codereview tool
- **Each phase**: Cannot proceed to next phase until all ITRC evidence is documented

**Every ITRC step requires documented evidence before marking complete:**

| Step | Evidence Required | Example |
|------|------------------|---------|
| **Implement** | Code changes staged/committed | `git status` showing files modified |
| **Test** | Test execution output with PASSING tests | `npm test` results showing "Tests: 42 passed" |
| **Review** | Code review tool output | `continuation_id` from mcp__zen__codereview |
| **Commit & Push** | Git operations complete | `git push` output showing success |

**Process Integrity Rule**: If you cannot provide evidence, the step is NOT complete.

##### Phase Transition Enforcement

**⚠️ PHASE TRANSITION BLOCKER**:
Before starting ANY new phase work (even exploratory edits):
1. **CHECK**: Are all current phase ITRC steps complete WITH evidence?
   - ❌ If NO: STOP. Complete ITRC first.
   - ✅ If YES: Proceed to next phase
2. **EVIDENCE AUDIT**: Can you show:
   - Test execution logs? (Must show PASSING tests)
   - Code review continuation_id?
   - Git commit hash AND successful push?

**Phase Completion Requirement**:
- **MANDATORY**: Commit AND PUSH at the end of EVERY phase after completing ITRC cycle
- Each phase must be a complete, working unit that can be committed and pushed
- Commit message MUST include ITRC evidence:
  ```
  feat: Phase X - [Description]
  
  - Implementation: [What was built]
  - Tests: X/Y passing
  - Review: continuation_id: [UUID]
  - ITRC cycle complete: I✓ T✓ R✓ C✓
  ```

**Output**: Working, tested, reviewed code with evidence trail, updated plan document, and committed to git

#### 5. Evaluate - Comprehensive Assessment

**Purpose**: Validate implementation against requirements

**Process**: Run integration tests, verify requirements, validate performance/security, user acceptance

**Output**: Evaluation report with test results, metrics, and identified issues

#### 6. Revise - Process Improvement & Documentation Updates

**Purpose**: Update project artifacts with implementation results and capture learnings for future projects

**RENAMED FROM "REFINE"**: The "Revise" stage focuses specifically on updating documentation and capturing lessons learned, providing better clarity of purpose than "refine".

**Process**: 
- **R1: Production Readiness** - Ensure production quality with measurable standards
  - Address evaluation findings and prepare for production
  - Fix identified issues, update documentation, optimize code, final quality checks
  - Verify all production requirements met
  
- **R2: Process Learning & Documentation Updates** - Update artifacts and capture lessons learned
  - **Update original design document** with implementation addendum showing final results
  - **Update implementation plan** with project retrospective report analyzing what worked/didn't work
  - **Add to lessons-learned.md** with cross-project insights and patterns for future reference
  - **Document methodology improvements** discovered during the project

**Key Principle**: **Update existing documents** rather than creating new ones to maintain coherent project history

**Output**: Production-ready release with updated project artifacts and documented lessons learned

### DAPPER Stage Gates

**CRITICAL**: You cannot proceed to the next stage without meeting exit criteria.

#### Design → Align Gate
- ✅ Architecture diagram complete
- ✅ Key components identified  
- ✅ Technical approach documented
- ✅ Open questions listed
- ✅ Initial risk assessment done

#### Align → Plan Gate  
- ✅ ALL Tier 1 (critical) questions answered
- ✅ Simplifications agreed and documented
- ✅ Design document updated with decisions
- ✅ No contradictions in documentation
- ✅ Technical feasibility validated
- ✅ Stakeholder sign-off obtained

#### Plan → Produce Gate
- ✅ Phases clearly defined with deliverables
- ✅ Dependencies mapped between phases
- ✅ Each phase has acceptance criteria
- ✅ Testing strategy defined
- ✅ Resource requirements identified
- ✅ **Expert Review MANDATORY**: Plan reviewed by multiple models (per DAPPER Configuration) for feasibility and completeness
- ✅ Review feedback incorporated into plan
- ✅ Final plan validated and approved

#### Produce → Evaluate Gate
- ✅ All planned phases complete
- ✅ Each phase completed ITRC cycle WITH EVIDENCE
- ✅ Code passes all tests
- ✅ Documentation updated
- ✅ No critical bugs open
- ✅ Feature works end-to-end

#### Evaluate → Revise Gate
- ✅ Performance benchmarks met
- ✅ User feedback collected
- ✅ Issues prioritized by severity
- ✅ Refinement scope defined

### Question Prioritization Framework

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

### Common DAPPER Pitfalls to Avoid

1. **Premature Planning**: Moving to Plan before answering Tier 1 questions
2. **Skipping Align**: Don't let AI make business decisions
3. **Big Phases**: Keep phases small and deliverable
4. **Multiple Documents**: Maintain one evolving document
5. **No Stage Gates**: Proceeding without meeting exit criteria
6. **Silent PAT Generation**: For third-party integrations, always get user consent
7. **Incoherent Plans**: Phase objectives must match their tasks
8. **Marking Without Evidence**: NEVER mark ITRC steps complete without proof of execution

### DAPPER Quick Reference

```
D - Design    : AI explores and proposes
A - Align     : Human decides and aligns  
P - Plan      : Break into executable phases with ITRC
P - Produce   : Build, test, review, commit & push
E - Evaluate  : Comprehensive validation
R - Revise    : Update docs and capture lessons
```

---

## Testing Strategy

### Testing Philosophy

**FUNDAMENTAL PRINCIPLE**: A small number of well-thought-out tests is better than a large number of poor tests. Focus on testing behavior, not implementation details.

**Testing Principles:**
- **Test behavior, not implementation**: Test what users see and do, not how code works internally
- **No CSS-only tests**: Don't test that a component has a specific class or style
- **Meaningful assertions**: Each test should verify actual functionality
- **Avoid snapshot testing**: Brittle and provides little value
- **Integration over unit tests**: Test how components work together

**What to Test (Priority Order):**
1. Critical User Paths (30%) - Can users complete core workflows?
2. Data Operations (30%) - CRUD operations work correctly?
3. Edge Cases & Error States (20%) - Graceful failure handling?
4. Business Logic (20%) - Complex calculations and rules?

**What NOT to Test:**
- ❌ CSS classes or styles (unless they affect functionality)
- ❌ Third-party library internals
- ❌ Simple prop passing or state updates
- ❌ Implementation details that might change
- ❌ Mock-heavy unit tests that don't reflect reality

**Good Test Example:**
```typescript
// ✅ GOOD: Tests actual user behavior
it('should create a new project when form is submitted', async () => {
  const user = await createTestUser()
  const result = await createProject({
    name: 'Test Project',
    ownerId: user.id
  })
  expect(result.name).toBe('Test Project')
  expect(result.status).toBe('AWAITING_VOLUNTEERS')
})

// ❌ BAD: Tests implementation details
it('should have correct CSS class', () => {
  expect(component.className).toContain('btn-primary')
})
```

### Test Debugging Tips

**Schema Inspection**: When debugging database-related issues, read the Prisma schema file directly (`prisma/schema.prisma`) instead of starting Prisma Studio. This is faster and provides the exact field definitions and relationships.

**Mock Carefully in Tests**: When mocking auth modules, only mock the specific functions you need (e.g., `requireAuth`), not the entire module. This prevents breaking other functions that your code depends on:

```javascript
// ✅ GOOD - preserves other functions
jest.mock('@/lib/auth-utils', () => ({
  ...jest.requireActual('@/lib/auth-utils'),
  requireAuth: jest.fn()
}))

// Bad - breaks all other functions
jest.mock('@/lib/auth-utils')
```

### Test Database Setup (Docker)

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

### Integration-First Testing Strategy

**Testing Priority Order:**
```
1. Integration Tests (60%) - Real database, real constraints
2. Unit Tests (30%) - Only for pure business logic  
3. E2E Tests (10%) - Critical user paths
```

**When to Mock vs When to Use Real Database:**
- ✅ Use REAL database for: Service layer, API routes, data operations
- ✅ Mock ONLY: External services (email, payments, third-party APIs)
- ❌ NEVER mock: Prisma, database operations, internal services

### Integration Test Checklist

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

### Available Test Commands

- `npm test` - All tests (unit + integration if DB is running)
- `npm run test:unit` - Unit tests only (excludes integration)
- `npm run test:integration` - Integration tests with real database
- `npm run test:integration:full` - Starts DB then runs integration tests
- `npm run test:integration:single` - Starts DB then runs single test file
- `npm run test:int` - Alternative integration test runner
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
- Run `npm run build` after EVERY schema change
- No phase is complete without TypeScript compilation passing

See `docs/guides/integration-testing.md` and `docs/guides/testing-strategy.md` for detailed guides.

---

## Development Guidelines

### Project Management
- **Phase-Based Development**: We organize work into phases based on functionality, not time
- **Phases represent logical completion points**: Each phase delivers working functionality
- **No time estimates**: Phases are defined by deliverables, not duration
- **Sequential phases**: Complete one phase before moving to the next

### Git Guidelines

**Commits**: 
- No "Generated with Claude Code"
- Descriptive messages explaining the purpose of changes
- Use `git add [specific-files]` - NEVER `git add .` or `git add -A`

**Pushing**: 
- Never force push
- Always `git fetch origin && git status` first
- If rejected, STOP and ask user

**Pre-Commit Checklist**:
1. **Include dependencies**: Both `package.json` AND `package-lock.json` if changed
2. **Validate locally**: Run `npm run build` and `npm run test`
3. **Review significant changes**: Use `mcp__zen__codereview` for features

### Script Organization
- **Keep scripts organized**: Do not scatter .js and .py files throughout the codebase
- **Use scripts/tmp/**: Place temporary or one-off scripts in `scripts/tmp/` directory
- **Main scripts directory**: Production scripts go in `scripts/`
- **Clear naming**: Use descriptive names that indicate the script's purpose
- **Documentation**: Add comments at the top of scripts explaining their purpose
- **Environment variables**: Do not set env vars directly on the command line. Create a script that sets the env vars internally

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

- **Database**: Use Prisma for all operations, transactions for multi-table, proper error handling
- **Auth**: NextAuth.js for protected routes, role-based access, validate sessions on API routes  
- **UI/UX**: Clean design, WCAG 2.1 AA accessibility, semantic HTML, Markdown support via `<Markdown>` component

### TypeScript Configuration Strategy

Our project uses two separate TypeScript configuration files to ensure correctness for both development and production builds:

- **`tsconfig.json` (The Base Config)**
  - **Purpose**: Primary configuration used for local development by editors (VS Code) and for running our test suite via Jest (`ts-jest`)
  - **Scope**: Configured to understand the entire codebase, including application source code, test files, and test-specific libraries (Jest globals)

- **`tsconfig.build.json` (The Build Config)**
  - **Purpose**: Used exclusively by CI/CD pipeline for build validation (`npx tsc --noEmit -p tsconfig.build.json`)
  - **Scope**: Inherits from base `tsconfig.json` but explicitly **excludes** all test files (`**/*.test.ts`, etc.)
  - **Why**: Ensures CI type-check precisely matches what Next.js includes in production builds

### Debugging Guide

**📚 COMPREHENSIVE DEBUGGING PLAYBOOK**: For systematic debugging of test failures, CI/CD issues, and common development problems, see **`docs/protocol/debugging-playbook.md`**

The playbook includes:
- Test failure resolution strategies
- Bulk fix operations for common patterns
- CI/CD troubleshooting workflows
- Mock configuration best practices
- Database debugging techniques
- Performance investigation methods

#### Quick CI/CD Debugging with GitHub CLI

When GitHub Actions jobs fail, use GitHub CLI (`gh`) for faster debugging:

**Core Workflow**:

1. **Check Status**: List recent runs to find failures
   ```bash
   gh run list --limit 5
   ```

2. **View Detailed Status**: Get job breakdown for a specific run
   ```bash
   gh run view <RUN_ID>
   ```

3. **Get Failed Logs**: View logs for failed jobs
   ```bash
   gh run view --log-failed --job=<JOB_ID>
   ```

4. **Monitor Progress**: Check status periodically while working on other tasks
   ```bash
   gh run view <RUN_ID>
   ```

**Pro Tips**:
- Don't use `sleep` commands - work asynchronously and check periodically
- Use `--log-failed` to get only the relevant error information
- The `gh run view` command shows real-time status without repeatedly polling

For more complex debugging scenarios, refer to the full debugging playbook.

---

## Key Database Concepts

### Project Lifecycle Management

Projects use a dual status system:
- **`status`**: Tracks lifecycle phase (AWAITING_VOLUNTEERS → PLANNING → IN_PROGRESS → COMPLETED)
- **`isActive`**: Controls volunteer recruitment (can be true even when IN_PROGRESS)

For detailed schema information, see `prisma/schema.prisma` and `docs/guides/maix-data-model.md`.

---

## Feature Documentation

For new features, use `docs/designs/FEATURE-DESIGN-TEMPLATE.md`. Focus on architecture, define phases by functionality not duration.

Directory structure: `experimental/` → `planned/` → `active/` → `shipped/`

---

## Code Health

**Quick health check**:
```bash
npm audit --audit-level=moderate  # Fix Critical/High only
grep -r "console\." src/ | wc -l  # Should trend down
npm outdated                       # Update only if needed
```

---

## Additional Resources

**Key Docs**: 
- README.md (setup and getting started)
- docs/guides/testing-strategy.md (comprehensive testing philosophy)
- docs/guides/maix-data-model.md (database schema documentation)
- docs/guides/google-genai-sdk-usage.md (AI integration guide)
- lessons-learned.md (cumulative project insights)

**Community Values**: 
- Community benefit over profit
- Knowledge sharing
- Transparency
- Collaboration

---

## Key Reminders for Claude Code

1. **Safety First**: Follow git and database safety protocols above
2. **Keep It Simple**: Bias towards simple solutions for current problems
3. **Use DAPPER**: Design, Align, Plan, Produce, Evaluate, Revise
4. **Test Pragmatically**: Integration-first with real database
5. **Track Progress**: Use TodoWrite tool for task management
6. **No Claude Suffixes**: Never add "Generated with Claude Code" to commits