# Event Manager Implementation Plan

## Document Information
- **Created**: August 7, 2025  
- **Methodology**: DAPPER (Plan stage)
- **Source Design**: `/docs/designs/planned/event-manager.md`
- **Status**: Ready for Production

## Executive Summary

This plan implements the Event Manager feature following completed Align decisions. The feature provides an **AI assistant that guides users through the entire event planning process** - from initial concept through execution.

### Core Value Proposition
The AI assistant actively helps users:
- Define event goals and requirements
- Select and book appropriate venues
- Identify and coordinate speakers (future phase)
- Create comprehensive task lists with timelines
- Manage registrations and communications
- Track progress and suggest next steps

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
**Objective**: Add event-specific tools for AI to use

**Deliverables**:
- `maix_manage_event` tool (CRUD operations)
- `maix_manage_registration` tool (attendee management)
- `maix_search_venues` tool (venue suggestions)
- Integration with existing todo and post tools

**Tasks**:
1. Add event management tool:
   - Create, update, get event details
   - Update venue information
   - Set capacity and dates
2. Add registration tool:
   - Register attendees
   - Check capacity
   - List registrations
3. Add venue search tool:
   - Search by capacity/location
   - Return venue suggestions
   - Store venue details in event
4. Ensure todo tool integration:
   - AI can create event-specific todos
   - Todos linked to event context
5. Test all tool integrations
6. Update MCP server documentation

**Acceptance Criteria**:
- [ ] Tools accessible via MCP
- [ ] Permission checks enforced
- [ ] Tools follow existing patterns
- [ ] Integration tests pass

**Dependencies**: Phase 3 (Event APIs)

---

### Phase 5: AI Assistant Core
**Objective**: Build the intelligent event planning assistant

**Deliverables**:
- AI assistant with event planning expertise
- Guided conversation flows for event planning
- Proactive task generation
- Context-aware suggestions
- Progress tracking and next-step recommendations

**Tasks**:
1. Design AI prompts for event planning expertise:
   - Initial event conceptualization
   - Venue selection criteria and suggestions
   - Timeline and milestone planning
   - Budget considerations (advisory only)
   - Registration strategy
2. Implement guided conversation flows:
   - "Let's start planning your event" onboarding
   - Progressive information gathering
   - Smart defaults based on event type
3. Create proactive task generation:
   - AI suggests todos based on event type/date
   - Automatic task prioritization
   - Dependency management between tasks
4. Build streaming chat endpoint with context
5. Add conversation persistence with history
6. Implement progress tracking:
   - AI recognizes completed tasks
   - Suggests next critical steps
   - Warns about approaching deadlines

**AI Conversation Examples**:
```
User: "I want to organize a tech meetup"
AI: "Great! Let's plan your tech meetup. I'll help you through each step. First, let's establish the basics:
- What's your target date? 
- Expected number of attendees?
- Do you have a venue in mind, or shall I suggest options?"

[After basic info gathered]
AI: "Based on a 50-person tech meetup on March 15th, I'll create your planning checklist:
✓ Creating venue research task (due 2 weeks out)
✓ Creating speaker outreach task (due 4 weeks out)  
✓ Creating registration setup task (due 3 weeks out)
✓ Creating catering arrangement task (due 1 week out)

Let's start with the venue. For 50 people in your area, I recommend considering..."
```

**Acceptance Criteria**:
- [ ] AI demonstrates event planning expertise
- [ ] Conversation flows feel natural and helpful
- [ ] Tasks are automatically generated based on context
- [ ] AI provides specific, actionable suggestions
- [ ] Progress tracking works accurately

**Dependencies**: Phase 2 (PAT system), Phase 4 (MCP tools)

---

### Phase 6: Desktop UI Implementation
**Objective**: Build AI-first two-panel interface

**Deliverables**:
- Event creation flow guided by AI
- Two-panel layout with AI chat as primary interface
- Live task dashboard updating as AI creates todos
- Event timeline visualization

**Tasks**:
1. Create AI-guided event creation:
   - Start with chat, not forms
   - AI asks questions and fills in details
   - Event created through conversation
2. Build two-panel layout:
   - Left: AI Assistant (primary focus)
   - Right: Live task dashboard and event details
3. Implement chat component with `useChat`:
   - Show AI thinking indicators
   - Display when AI is creating tasks
   - Show tool invocations inline
4. Integrate TodoList with live updates:
   - Tasks appear as AI creates them
   - Visual feedback for AI-generated items
5. Add event timeline view:
   - Visual representation of key milestones
   - AI can reference and update timeline
6. Style for conversational UI:
   - Chat-first interface
   - Forms are secondary/hidden

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

- Event creation < 5 minutes (guided by AI)
- AI generates 80% of required tasks automatically
- Users feel guided, not overwhelmed
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