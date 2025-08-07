# Event Manager Implementation Plan

## Document Information
- **Created**: August 6, 2025
- **Source Design**: `/docs/designs/planned/event-manager.md`
- **Methodology**: DAPPER (Design, Align, Plan, Produce, Evaluate, Refine)
- **Status**: Post-Align Update
- **Last Updated**: August 7, 2025

## Executive Summary

This plan outlines the phased implementation of the Event Manager feature for Maix, an AI-first application that enables NFPs to organize events with Gemini-powered assistance. The implementation follows the DAPPER workflow, with this plan updated after the Align stage.

### Key Implementation Decisions (Post-Align)
- Use Vercel AI SDK with built-in MCP client (`experimental_createMCPClient`)
- HTTP transport for MCP server connection
- **Per-user PAT authentication** for security (no service accounts)
- **Streaming required** for optimal UX
- **Desktop-first** two-panel UI design
- **Deferred features**: Speaker management, advanced registration
- Reuse existing Todo, Post, and Organization systems

## Phase Overview

### Implementation Phases (DAPPER Produce Stage)

| Phase | Description | Deliverable | Scope Changes from Align |
|-------|-------------|-------------|-------------------------|
| **Phase 1** | Core database infrastructure | Event & Registration models | No EventSpeaker model |
| **Phase 2** | User preferences & PAT system | Encrypted PAT storage | Per-user auth required |
| **Phase 3** | Basic Event CRUD operations | Event management APIs | Organization-scoped |
| **Phase 4** | AI Integration with streaming | Streaming chat with MCP | Full streaming support |
| **Phase 5** | Desktop two-panel UI | Event Manager interface | Desktop-first design |
| **Phase 6** | Basic registration system | Simple register/cancel | No waitlists/custom fields |
| **Phase 7** | Integration testing | Test coverage | Focus on core features |
| **Phase 8** | Production preparation | Deployment ready | Simplified scope |

---

## Phase 1: Core Database Infrastructure

### Objective
Implement the database schema for Events and basic Registration models (speaker management deferred).

### Tasks

#### 1.1 Schema Planning
- [ ] Create backup of current database
- [ ] Plan migration strategy
- [ ] Document rollback procedure
- [ ] Test migration locally

#### 1.2 Prisma Schema Updates
```prisma
// Add to schema.prisma
model Event {
  id              String   @id @default(cuid())
  organizationId  String
  name            String
  description     String   @db.Text
  date            DateTime
  venueJson       Json?
  status          EventStatus @default(DRAFT)
  createdBy       String
  // Relations (no speakers in Phase 1)
}

model Registration {
  id        String   @id @default(cuid())
  eventId   String
  email     String
  name      String
  status    RegistrationStatus @default(REGISTERED)
  // Simplified - no custom fields or user association
}

enum RegistrationStatus {
  REGISTERED
  CANCELLED
}
```

#### 1.3 Safe Migration Creation
```bash
# Create migration using safe workflow
npm run db:backup
npm run db:migrate:new add_event_manager_core
# Review generated SQL
cat prisma/migrations/*/migration.sql
```

#### 1.4 Migration Testing
- [ ] Test migration on development database
- [ ] Verify no data loss
- [ ] Check foreign key constraints
- [ ] Test rollback procedure

#### 1.5 Migration Application
```bash
# Apply migration safely
npm run db:migrate:apply
npm run db:health
```

### Acceptance Criteria
- [ ] Database backup completed successfully
- [ ] Migration applied without errors
- [ ] All models accessible via Prisma Client
- [ ] No impact on existing functionality
- [ ] Database health check passes

### Dependencies
- Updated design document (post-Align)
- Database backup capability
- Test database environment

---

## Phase 2: User Preferences & PAT System

### Objective
Implement secure per-user PAT storage system for MCP authentication.

### Tasks

#### 2.1 UserPreferences Model
```prisma
// Add to schema.prisma
model UserPreferences {
  id          String @id @default(cuid())
  userId      String @unique
  mcpTokenEnc String? // Encrypted PAT for per-user auth
  user        User @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("user_preferences")
}
```

#### 2.2 PAT Manager Implementation
```typescript
// src/lib/mcp/pat-manager.ts
- Implement encryption/decryption utilities
- Create savePatForUser function
- Create getPatForUser function
- Create removePatForUser function
- Add proper error handling
```

#### 2.3 Encryption Setup
- [ ] Generate encryption key for environment
- [ ] Add to .env.local: `ENCRYPTION_KEY=...`
- [ ] Implement crypto utilities
- [ ] Test encryption/decryption

#### 2.4 PAT Generation API
```typescript
// src/app/api/user/pat/route.ts
- POST endpoint to generate new PAT
- GET endpoint to check PAT status
- DELETE endpoint to revoke PAT
```

### Acceptance Criteria
- [ ] UserPreferences model created and migrated
- [ ] PAT encryption/decryption working
- [ ] PAT manager functions tested
- [ ] Security review passed
- [ ] No plain text tokens stored

### Dependencies
- Completed Phase 1 (database models)
- Encryption library available
- Environment variables configured

---

## Phase 3: Basic Event CRUD Operations

### Objective
Identify and implement simplifications to reduce complexity while maintaining core functionality.

### Tasks

#### 3.1 Simplification Analysis
```bash
# Work with AI models to identify simplifications
mcp__zen__consensus with:
- Models: [gemini-2.5-pro, o4-mini]
- Context: Updated design + review feedback
- Goal: Identify complexity reduction opportunities
```

#### 3.2 Generate Simplification Menu
Create menu of possible simplifications:

**Option A: Minimal MVP**
- Remove speaker management initially
- Skip venue details (just text field)
- No registration system in Phase 1
- Trade-off: Less feature-complete, but faster to market

**Option B: Simplified Registration**
- Use email-only registration (no user accounts)
- No waitlist management
- Single confirmation email
- Trade-off: Less powerful, but simpler implementation

**Option C: Unified Task System**
- Don't extend Todo model with eventId
- Use tags/labels for event association
- Trade-off: Less structured, but no schema changes

**Option D: Delayed AI Integration**
- Build UI and CRUD first
- Add AI in later phase
- Trade-off: Not AI-first, but reduces initial complexity

#### 3.3 Human Review and Selection
- [ ] Present simplification menu to stakeholder
- [ ] Discuss trade-offs for each option
- [ ] Get approval on selected simplifications
- [ ] Update design document with chosen approach

#### 3.4 Final Design Lock
- [ ] Incorporate all simplifications
- [ ] Create final design document
- [ ] Move to `/docs/designs/active/`
- [ ] Create implementation checklist

### Acceptance Criteria
- [ ] At least 3 simplification options identified
- [ ] Clear trade-off analysis for each option
- [ ] Stakeholder approval on simplifications
- [ ] Final design 30% simpler than original

### Dependencies
- Completed Phase 2 (review feedback)
- Stakeholder availability for decision
- Understanding of MVP requirements

---

## Phase 4: AI Integration with Streaming

### Objective
Implement the database schema for Events, Registrations, and related models.

### Tasks

#### 4.1 Schema Extension Planning
- [ ] Create backup of current database
- [ ] Plan migration strategy
- [ ] Document rollback procedure
- [ ] Test migration locally

#### 4.2 Prisma Schema Updates
```prisma
// Add to schema.prisma
model Event {
  id              String   @id @default(cuid())
  organizationId  String
  name            String
  description     String   @db.Text
  date            DateTime
  venueJson       Json?
  status          EventStatus @default(DRAFT)
  createdBy       String
  // ... relations
}

model Registration {
  // ... as designed
}

model EventSpeaker {
  // ... if not simplified out
}
```

#### 4.3 Safe Migration Creation
```bash
# Create migration using safe workflow
npm run db:backup
npm run db:migrate:new add_event_manager_models
# Review generated SQL
cat prisma/migrations/*/migration.sql
```

#### 4.4 Migration Testing
- [ ] Test migration on development database
- [ ] Verify no data loss
- [ ] Check foreign key constraints
- [ ] Test rollback procedure

#### 4.5 Migration Application
```bash
# Apply migration safely
npm run db:migrate:apply
npm run db:health
```

### Acceptance Criteria
- [ ] Database backup completed successfully
- [ ] Migration applied without errors
- [ ] All models accessible via Prisma Client
- [ ] No impact on existing functionality
- [ ] Database health check passes

### Dependencies
- Completed Phase 3 (final design)
- Database backup capability
- Test database environment

---

## Phase 5: Desktop Two-Panel UI

### Objective
Implement core API routes for creating, reading, updating, and deleting events.

### Tasks

#### 5.1 Event Service Layer
```typescript
// src/lib/services/event.service.ts
- createEvent(data, userId, organizationId)
- getEvent(eventId, userId)
- updateEvent(eventId, data, userId)
- deleteEvent(eventId, userId)
- listOrganizationEvents(organizationId, userId)
```

#### 5.2 API Route Implementation
```typescript
// src/app/api/events/route.ts
- POST /api/events (create)
- GET /api/events (list)

// src/app/api/events/[eventId]/route.ts
- GET /api/events/[eventId] (get)
- PATCH /api/events/[eventId] (update)
- DELETE /api/events/[eventId] (delete)
```

#### 5.3 Permission System
- [ ] Implement `canManageEvent` helper
- [ ] Add organization member checks
- [ ] Create event-specific permission utilities
- [ ] Test permission boundaries

#### 5.4 Input Validation
- [ ] Create Zod schemas for all endpoints
- [ ] Add request validation middleware
- [ ] Implement error handling
- [ ] Add rate limiting if needed

#### 5.5 Basic Testing
- [ ] Unit tests for service layer
- [ ] API route integration tests
- [ ] Permission validation tests
- [ ] Error handling tests

### Acceptance Criteria
- [ ] All CRUD operations functional
- [ ] Permissions properly enforced
- [ ] Input validation working
- [ ] 80% test coverage for new code
- [ ] No regression in existing features

### Dependencies
- Completed Phase 4 (database models)
- Understanding of existing permission patterns
- Test framework setup

---

## Phase 6: Basic Registration System

### Objective
Implement the AI chat functionality using Vercel AI SDK and MCP integration.

### Tasks

#### 6.1 Dependencies Installation
```bash
npm install ai@^4.2.0 @ai-sdk/google@^1.0.0
```

#### 6.2 PAT Storage System
```typescript
// src/lib/mcp/pat-manager.ts
- Implement encrypted PAT storage
- Create UserPreferences model
- Add PAT management utilities
```

#### 6.3 MCP Client Setup
```typescript
// src/app/api/events/[eventId]/chat/route.ts
- Implement experimental_createMCPClient
- Configure HTTP transport
- Add PAT authentication
- Cache clients per user
```

#### 6.4 Gemini Integration
- [ ] Configure Gemini model
- [ ] Implement streamText with tools
- [ ] Add conversation context
- [ ] Handle tool invocations

#### 6.5 Event-Specific MCP Tools
```typescript
// Add to MCP server
- maix_manage_event
- maix_manage_speaker (if not simplified)
- maix_manage_registration
```

#### 6.6 Error Handling
- [ ] Handle missing PAT tokens
- [ ] Add MCP connection errors
- [ ] Implement retry logic
- [ ] User-friendly error messages

### Acceptance Criteria
- [ ] AI chat endpoint functional
- [ ] MCP tools accessible from Gemini
- [ ] Streaming responses working
- [ ] PAT authentication secure
- [ ] Error states handled gracefully

### Dependencies
- Completed Phase 5 (Event APIs)
- MCP server running
- Gemini API key configured
- Encryption utilities available

---

## Phase 7: Integration Testing

### Objective
Build the complete Event Manager user interface with AI chat and task dashboard.

### Tasks

#### 7.1 Event Manager Layout
```tsx
// src/app/events/[eventId]/page.tsx
- Two-panel responsive layout
- Mobile-friendly design
- Loading states
- Error boundaries
```

#### 7.2 AI Chat Component
```tsx
// src/components/events/event-chat.tsx
- Implement useChat hook
- Message rendering with Markdown
- Tool invocation display
- Typing indicators
- Error states
```

#### 7.3 Task Dashboard Integration
- [ ] Adapt TodoList component for events
- [ ] Add event context to todos
- [ ] Implement real-time updates
- [ ] Category filtering

#### 7.4 Event Details Component
```tsx
// src/components/events/event-details.tsx
- Event information display
- Edit capabilities
- Status management
- Venue details
```

#### 7.5 Settings Page
```tsx
// src/app/events/settings/page.tsx
- PAT configuration UI
- Token management
- Configuration status
- Help documentation
```

#### 7.6 Navigation Integration
- [ ] Add Events to main navigation
- [ ] Create event list page
- [ ] Add organization context
- [ ] Implement breadcrumbs

### Acceptance Criteria
- [ ] Two-panel layout responsive
- [ ] Chat interface fully functional
- [ ] Task dashboard integrated
- [ ] Settings page working
- [ ] Mobile experience acceptable
- [ ] Accessibility standards met

### Dependencies
- Completed Phase 6 (AI integration)
- Existing UI components
- Design tokens and styles

---

## Phase 8: Production Preparation

### Objective
Prepare the Event Manager for production deployment with simplified scope.

### Tasks

#### 8.1 Registration API
```typescript
// src/app/api/events/[eventId]/registrations/route.ts
- POST (register)
- GET (list registrations)
- PATCH (update status)
- DELETE (cancel registration)
```

#### 8.2 Registration UI Components
```tsx
// src/components/events/registration-form.tsx
- Public registration form
- Custom fields support
- Validation and error handling

// src/components/events/registration-summary.tsx
- Attendee list
- Status management
- Export capabilities
```

#### 8.3 Documentation
- [ ] Update API documentation
- [ ] Create user guide for Event Manager
- [ ] Document PAT configuration process
- [ ] Add troubleshooting guide

#### 8.4 Email Notifications
- [ ] Registration confirmation
- [ ] Event updates
- [ ] Speaker invitations
- [ ] Reminder emails

#### 8.5 Public Event Page
```tsx
// src/app/events/public/[eventId]/page.tsx
- Public event details
- Registration form
- Speaker list
- Venue information
```

### Acceptance Criteria
- [ ] Registration flow complete
- [ ] Email notifications working
- [ ] Public pages accessible
- [ ] Speaker management functional
- [ ] Data export available

### Dependencies
- Completed Phase 7 (UI implementation)
- Email service configuration
- Public routing setup

---

## Future Phases (Post-MVP)

### Objective
Ensure the Event Manager is thoroughly tested and production-ready.

### Tasks

#### 9.1 Unit Testing
```typescript
// tests/unit/
- Service layer tests
- Utility function tests
- Component tests
- Permission tests
```

#### 9.2 Integration Testing
```typescript
// tests/integration/
- API endpoint tests
- Database operation tests
- MCP integration tests
- Authentication flow tests
```

#### 9.3 E2E Testing (Critical Paths Only)
```typescript
// tests/e2e/
- Event creation flow
- AI chat interaction
- Registration process
- Permission validation
```

#### 9.4 Performance Testing
- [ ] Load test AI chat endpoint
- [ ] Database query optimization
- [ ] Check N+1 queries
- [ ] Measure response times

#### 9.5 Security Testing
- [ ] Input validation verification
- [ ] XSS prevention check
- [ ] SQL injection testing
- [ ] Permission boundary testing

#### 9.6 Accessibility Testing
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Color contrast verification
- [ ] WCAG 2.1 AA compliance

### Acceptance Criteria
- [ ] 80% code coverage
- [ ] All critical paths tested
- [ ] No security vulnerabilities
- [ ] Performance benchmarks met
- [ ] Accessibility standards passed

### Dependencies
- Completed Phase 8 (full feature set)
- Test environment setup
- Testing tools configured

---

### Phase 9: Speaker Management
- Implement EventSpeaker model
- Add speaker invitation system
- Support platform and non-platform speakers
- Speaker coordination tools

### Objective
Conduct comprehensive code review to ensure production quality.

### Tasks

#### 10.1 MCP Zen Code Review
```bash
# Comprehensive code review
mcp__zen__codereview with:
- All new code files
- Focus: security, performance, quality
- Model: gemini-2.5-pro
```

#### 10.2 Pre-commit Validation
```bash
# Run full validation suite
npm run build
npm run test
npm run lint
mcp__zen__precommit
```

#### 10.3 Documentation Review
- [ ] Update API documentation
- [ ] Create user guide
- [ ] Document deployment process
- [ ] Update architecture diagrams

#### 10.4 Code Cleanup
- [ ] Remove console.logs
- [ ] Clean up comments
- [ ] Refactor complex functions
- [ ] Optimize imports

#### 10.5 Performance Optimization
- [ ] Implement query optimization
- [ ] Add appropriate indexes
- [ ] Enable caching where needed
- [ ] Minimize bundle size

### Acceptance Criteria
- [ ] No critical issues from review
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Code meets style guidelines
- [ ] Performance targets met

### Dependencies
- Completed Phase 9 (testing)
- Review tools available
- Time for refactoring

---

### Phase 10: Advanced Registration
- Custom registration fields
- Waitlist management
- Registration status workflows
- Attendee communication tools

### Phase 11: Mobile Optimization
- Responsive design for mobile
- Touch-optimized interfaces
- Mobile-specific layouts
- Progressive web app features

### Objective
Deploy the Event Manager feature to production environment.

### Tasks

#### 11.1 Deployment Preparation
- [ ] Create deployment checklist
- [ ] Prepare rollback plan
- [ ] Document known issues
- [ ] Create monitoring alerts

#### 11.2 Database Migration
```bash
# Production migration
npm run db:backup
npm run db:migrate:status
npm run db:migrate:apply
npm run db:health
```

#### 11.3 Environment Configuration
- [ ] Set production environment variables
- [ ] Configure Gemini API keys
- [ ] Set up monitoring
- [ ] Configure error tracking

#### 11.4 Gradual Rollout
- [ ] Deploy to staging first
- [ ] Test all critical paths
- [ ] Deploy to production
- [ ] Monitor for issues

#### 11.5 Post-Deployment
- [ ] Verify all features working
- [ ] Check performance metrics
- [ ] Monitor error rates
- [ ] Gather initial feedback

### Acceptance Criteria
- [ ] Successful deployment to production
- [ ] No data loss or corruption
- [ ] All features functional
- [ ] Monitoring active
- [ ] Rollback plan tested

### Dependencies
- Completed Phase 10 (code review)
- Production environment access
- Deployment permissions

---

## Risk Management

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| MCP client instability | High | Have fallback to direct API calls |
| Gemini API limits | Medium | Implement rate limiting and caching |
| Database migration issues | High | Comprehensive backup and rollback plan |
| PAT security concerns | High | Encryption at rest, secure key management |

### Implementation Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Scope creep | Medium | Strict adherence to simplified design |
| Integration complexity | Medium | Incremental integration with testing |
| Performance issues | Low | Start simple, optimize based on metrics |

---

## Success Metrics

### Phase Completion Metrics
- Each phase delivers working functionality
- No regression in existing features
- Test coverage maintained above 80%
- All acceptance criteria met

### Feature Success Metrics
- Event creation time < 10 minutes
- AI assistance satisfaction > 80%
- Zero data loss incidents
- System uptime > 99.9%

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-08-06 | 1.0 | Initial plan creation | AI Assistant |

---

## Appendices

### A. Technical Decision Log
- Vercel AI SDK chosen for built-in MCP support
- HTTP transport selected over SSE for compatibility
- PAT-based authentication for user-specific access
- Two-panel UI for optimal user experience

### B. Deferred Features
- Calendar system integration
- QR code check-in
- Live event features (polls, Q&A)
- Multi-language support
- Recurring event templates

### C. Reference Documents
- `/docs/designs/planned/event-manager.md` - Original design
- `/docs/guides/maix-data-model.md` - Database patterns
- `/docs/guides/google-genai-sdk-usage.md` - AI integration
- `/docs/guides/prisma.md` - Database safety guidelines