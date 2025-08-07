# Event Manager Implementation Plan

## Document Information
- **Created**: August 7, 2025  
- **Methodology**: DAPPER (Plan stage)
- **Source Design**: `/docs/designs/planned/event-manager.md`
- **Status**: Ready for Production

## Executive Summary

This plan implements the Event Manager feature following completed Align decisions. The feature provides AI-powered event planning with transparent authentication, streaming responses, and desktop-first UI.

### Key Aligned Decisions
- Public events only (no visibility controls)
- Transparent PAT generation (no user configuration)
- Full streaming support via Vercel AI SDK
- Desktop-first two-panel layout
- Basic registration (email/name only)
- No speaker management in MVP

## Implementation Phases

### Phase 1: Database Foundation
**Objective**: Establish core data models and migrations

**Deliverables**:
- Event model with capacity and public flag
- Registration model (simplified)
- UserPreferences extension for PAT references
- EventConversation model for chat persistence

**Tasks**:
1. Create Prisma schema updates
2. Generate and review migration
3. Apply migration safely
4. Verify database health

**Acceptance Criteria**:
- [ ] Migration applies without errors
- [ ] All models accessible via Prisma Client
- [ ] Database health check passes
- [ ] No impact on existing data

**Dependencies**: None

---

### Phase 2: PAT Management System
**Objective**: Implement transparent PAT generation

**Deliverables**:
- PAT manager service with auto-generation
- Encryption utilities for secure storage
- Integration with existing PersonalAccessToken model

**Tasks**:
1. Implement `getOrCreateEventManagerPat` function
2. Add `isSystemGenerated` flag to PAT model
3. Create encryption/decryption utilities
4. Add UserPreferences relationship
5. Write unit tests for PAT manager

**Acceptance Criteria**:
- [ ] PATs auto-generate on first use
- [ ] Tokens encrypted at rest
- [ ] Expiration handling works
- [ ] 90% test coverage

**Dependencies**: Phase 1 (UserPreferences model)

---

### Phase 3: Event CRUD APIs
**Objective**: Basic event management functionality

**Deliverables**:
- Event service layer
- RESTful API endpoints
- Organization-scoped permissions
- Input validation with Zod

**Tasks**:
1. Create event service (`src/lib/services/event.service.ts`)
2. Implement CRUD endpoints:
   - `POST /api/events` (create)
   - `GET /api/events` (list)
   - `GET /api/events/[id]` (get)
   - `PATCH /api/events/[id]` (update)
   - `DELETE /api/events/[id]` (delete)
3. Add permission checks
4. Create Zod validation schemas
5. Write API tests

**Acceptance Criteria**:
- [ ] All CRUD operations functional
- [ ] Organization members can manage events
- [ ] Public events visible to all
- [ ] Input validation working
- [ ] 80% test coverage

**Dependencies**: Phase 1 (Event model)

---

### Phase 4: MCP Tool Integration
**Objective**: Add event-specific tools to MCP server

**Deliverables**:
- `maix_manage_event` tool
- `maix_manage_registration` tool
- Integration with existing MCP server

**Tasks**:
1. Add event management tool
2. Add registration tool (basic operations only)
3. Implement permission checks in tools
4. Test tool integration
5. Update MCP server documentation

**Acceptance Criteria**:
- [ ] Tools accessible via MCP
- [ ] Permission checks enforced
- [ ] Tools follow existing patterns
- [ ] Integration tests pass

**Dependencies**: Phase 3 (Event APIs)

---

### Phase 5: AI Chat Integration
**Objective**: Implement streaming AI chat with Gemini

**Deliverables**:
- Chat API endpoint with streaming
- Vercel AI SDK integration
- MCP client with transparent PAT
- Conversation persistence

**Tasks**:
1. Install Vercel AI SDK dependencies
2. Create chat endpoint (`/api/events/[id]/chat`)
3. Implement `experimental_createMCPClient`
4. Configure streaming with `streamText`
5. Add conversation persistence
6. Handle errors gracefully

**Acceptance Criteria**:
- [ ] Streaming responses work
- [ ] MCP tools callable from AI
- [ ] PAT transparently generated
- [ ] Conversations persist
- [ ] Error states handled

**Dependencies**: Phase 2 (PAT system), Phase 4 (MCP tools)

---

### Phase 6: Desktop UI Implementation
**Objective**: Build two-panel desktop interface

**Deliverables**:
- Event list page
- Event detail page with two panels
- AI chat component with streaming
- Task dashboard integration

**Tasks**:
1. Create event list page (`/events`)
2. Build two-panel layout
3. Implement chat component with `useChat`
4. Integrate existing TodoList component
5. Add event details display
6. Style for desktop-first experience

**Acceptance Criteria**:
- [ ] Two-panel layout responsive
- [ ] Chat streaming visible
- [ ] Todos integrate with events
- [ ] Desktop experience optimized
- [ ] Accessibility standards met

**Dependencies**: Phase 5 (Chat API)

---

### Phase 7: Registration System
**Objective**: Basic event registration

**Deliverables**:
- Registration API endpoints
- Public registration form
- Registration list for organizers
- Capacity enforcement

**Tasks**:
1. Create registration endpoints
2. Build registration form component
3. Add capacity checking
4. Create attendee list view
5. Test registration flow

**Acceptance Criteria**:
- [ ] Users can register with email/name
- [ ] Capacity limits enforced
- [ ] Organizers see registrations
- [ ] Duplicate prevention works

**Dependencies**: Phase 3 (Event APIs)

---

### Phase 8: Integration & Polish
**Objective**: Final integration and testing

**Deliverables**:
- E2E tests for critical paths
- Performance optimization
- Documentation updates
- Bug fixes

**Tasks**:
1. Write E2E tests for event creation flow
2. Test AI chat interactions
3. Optimize database queries
4. Update user documentation
5. Fix identified issues

**Acceptance Criteria**:
- [ ] E2E tests pass
- [ ] Performance targets met
- [ ] Documentation complete
- [ ] No critical bugs

**Dependencies**: All previous phases

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Vercel AI SDK instability | High | Test thoroughly, have fallback plan |
| PAT expiration handling | Medium | Implement refresh logic early |
| Streaming compatibility | Medium | Test across browsers |
| Database migration issues | High | Comprehensive backups, test migrations |

## Success Metrics

- Event creation < 5 minutes
- AI response time < 2 seconds
- Zero PAT configuration friction
- 80% test coverage overall
- No critical production bugs

## Technical Decisions Log

1. **Transparent PATs over manual configuration**: Better UX for first-party feature
2. **HTTP transport over SSE**: MCP server compatibility
3. **Desktop-first over mobile-first**: Complex workflows need space
4. **Basic registration over advanced**: Reduce initial complexity
5. **Public events only**: Simplify permissions for MVP

## Future Enhancements (Post-MVP)

- Speaker management system
- Private events with visibility controls
- Advanced registration (waitlists, custom fields)
- Mobile-responsive design
- Event templates
- Recurring events
- Multi-organization events

## Phase Dependencies Graph

```
Phase 1 (Database) ──┬──> Phase 2 (PAT System) ──> Phase 5 (AI Chat) ──> Phase 6 (UI)
                     │                                                          │
                     └──> Phase 3 (Event APIs) ──> Phase 4 (MCP Tools)         │
                                      │                                         │
                                      └──> Phase 7 (Registration) ─────────────┤
                                                                                │
                                                     Phase 8 (Integration) <────┘
```

## Checklist Before Starting Production

- [x] Align stage complete
- [x] All Tier 1 questions answered
- [x] Design document updated
- [x] Technical feasibility validated
- [x] Dependencies identified
- [x] Risk mitigation planned

---

## Notes

This plan supersedes the previous `event-manager-implementation.md` which was created prematurely before Align completion. This plan reflects all decisions made during the proper Align stage.