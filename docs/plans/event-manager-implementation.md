# Event Manager Implementation Plan (Revised)

## Document Information
- **Created**: August 7, 2025  
- **Revised**: August 7, 2025 (Post O4 & Gemini Pro Review)
- **Methodology**: DAPPER (Plan stage)
- **Source Design**: `/docs/designs/planned/event-manager.md`
- **Status**: Ready for Production

## Executive Summary

This revised plan implements the Event Manager feature following expert review from O4 and Gemini Pro. The feature provides an **AI assistant that guides users through the entire event planning process** - from initial concept through execution.

### Core Value Proposition
The AI assistant actively helps users:
- Define event goals and requirements
- Create comprehensive task lists with timelines
- Manage registrations and communications
- Track progress and suggest next steps

### Key Aligned Decisions (Updated)
- Public events only (no visibility controls)
- Transparent PAT generation with 90-day expiry
- Polling for dashboard updates (no live streaming)
- Desktop-first two-panel layout
- Basic registration (email/name only)
- No venue search in MVP
- Focused tools instead of god objects

## Implementation Phases (7 Total, Previously 8)

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
**Objective**: Implement transparent PAT generation with security improvements

**Deliverables**:
- PAT manager service with auto-generation
- 90-day expiry with auto-refresh
- Encryption utilities for secure storage
- Integration with existing PersonalAccessToken model

**Tasks**:
1. Implement `getOrCreateEventManagerPat` function
2. Add `isSystemGenerated` flag to PAT model
3. Set 90-day expiry with refresh logic
4. Create encryption/decryption utilities
5. Add UserPreferences relationship
6. Write unit tests for PAT manager
7. Plan for future settings page (post-MVP)

**Acceptance Criteria**:
- [ ] PATs auto-generate on first use
- [ ] 90-day expiry enforced
- [ ] Auto-refresh works seamlessly
- [ ] Tokens encrypted at rest
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

### Phase 4: MCP Tools & AI Assistant Core (Combined)
**Objective**: Build event-specific tools and AI assistant iteratively

**Deliverables**:
- Focused event tools (no god objects)
- Registration management tool
- AI assistant with event planning expertise
- Template-based task generation

**Tasks**:
1. Create focused event tools:
   - `maix_create_event` - Create new event
   - `maix_update_event` - Update event details
   - `maix_get_event` - Retrieve event info
   - Test each tool with basic AI prompt
2. Add registration tool:
   - `maix_manage_registration` - Handle registrations
   - Check capacity limits
   - List registrations
3. Design AI prompts iteratively:
   - Start with robust system prompt
   - Test event creation flow
   - Refine based on results
4. Implement guided conversation:
   - "Let's start planning" onboarding
   - Progressive information gathering
   - Smart defaults by event type
5. Build template-based task generation:
   - Pre-defined checklists by event type
   - AI selects and adjusts templates
   - No complex dependency management (deferred)
6. Add conversation persistence:
   - Store messages with metadata
   - Handle conversation history (100 msg limit)
   - Pin AI SDK version to 4.2.x
7. Test AI + tools integration end-to-end

**AI Conversation Examples**:
```
User: "I want to organize a tech meetup"
AI: "Great! Let's plan your tech meetup. I'll help you through each step. First, let's establish the basics:
- What's your target date? 
- Expected number of attendees?

[After basic info gathered]
AI: "Perfect! I'm creating your event now and will set up your planning checklist..."
[AI calls maix_create_event tool]
[AI calls maix_manage_todo tool multiple times]
```

**Acceptance Criteria**:
- [ ] Each tool works independently
- [ ] AI can use all tools effectively
- [ ] Conversation flows feel natural
- [ ] Template-based tasks work
- [ ] AI SDK version pinned
- [ ] 80% test coverage

**Dependencies**: Phase 2 (PAT system), Phase 3 (Event APIs)

---

### Phase 5: Desktop UI Implementation
**Objective**: Build AI-first two-panel interface

**Deliverables**:
- Event creation through conversation
- Two-panel layout with AI chat primary
- Polling-based task dashboard
- Event timeline visualization

**Tasks**:
1. Create AI-guided event creation:
   - Start with chat, not forms
   - AI creates event through conversation
2. Build two-panel layout:
   - Left: AI Assistant (primary focus)
   - Right: Task dashboard with polling
3. Implement chat component with `useChat`:
   - Show AI thinking indicators
   - Display tool invocations inline
4. Integrate TodoList with polling:
   - Use React Query invalidation
   - Poll every 5 seconds during active chat
   - Visual feedback for new items
5. Add event timeline view:
   - Visual milestones representation
   - AI can reference timeline
6. Style for conversational UI:
   - Chat-first interface
   - Forms hidden/secondary

**Acceptance Criteria**:
- [ ] Two-panel layout responsive
- [ ] Chat works smoothly
- [ ] Polling updates dashboard
- [ ] Desktop experience optimized
- [ ] Accessibility standards met

**Dependencies**: Phase 4 (Chat API & Tools)

---

### Phase 6: Registration System
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

### Phase 7: Integration & Polish
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
6. Prepare fallback for experimental API

**Acceptance Criteria**:
- [ ] E2E tests pass
- [ ] Performance targets met
- [ ] Documentation complete
- [ ] Fallback plan documented
- [ ] No critical bugs

**Dependencies**: All previous phases

---

## Risk Mitigation (Updated)

| Risk | Impact | Mitigation |
|------|--------|------------|
| experimental_createMCPClient changes | High | Pin to 4.2.x, document fallback architecture |
| PAT security | Medium | 90-day expiry, auto-refresh, future settings page |
| Polling performance | Low | React Query with smart invalidation |
| Database migration issues | High | Comprehensive backups, staging tests |

## Success Metrics

- Event creation < 5 minutes (guided by AI)
- AI generates appropriate tasks from templates
- Users feel guided, not overwhelmed
- AI response time < 2 seconds
- Zero PAT configuration friction
- Dashboard updates within 5 seconds
- 80% test coverage overall

## Technical Decisions Log (Revised)

1. **90-day PATs over 1-year**: Better security with auto-refresh
2. **Polling over SSE for dashboard**: Simpler, use React Query
3. **Combined Phase 4/5**: Iterative tool + AI development
4. **Removed venue search**: Simplify MVP, no clear data source
5. **Focused tools over god object**: Better AI reliability
6. **Template tasks over AI generation**: More predictable results
7. **Pin AI SDK version**: Stability over latest features

## Future Enhancements (Post-MVP)

- Venue search with proper data source
- Speaker management system
- Private events with visibility controls
- Advanced registration (waitlists, custom fields)
- Mobile-responsive design
- Dynamic task dependency management
- Live dashboard updates via SSE
- Settings page for PAT management

## Phase Dependencies Graph (Updated)

```
Phase 1 (Database) ──┬──> Phase 2 (PAT System) ──┐
                     │                           ├──> Phase 4 (Tools + AI) ──> Phase 5 (UI)
                     └──> Phase 3 (Event APIs) ──┤                                    │
                                    │            └────────────────────────────────────┤
                                    └──> Phase 6 (Registration) ──────────────────────┤
                                                                                       │
                                                        Phase 7 (Integration) <────────┘
```

## Checklist Before Starting Production

- [x] Align stage complete
- [x] All Tier 1 questions answered
- [x] Design document updated
- [x] Technical feasibility validated
- [x] O4 review complete
- [x] Gemini Pro review complete
- [x] Feedback incorporated
- [x] Dependencies identified
- [x] Risk mitigation planned

---

## Notes

This revised plan addresses feedback from expert review:
- Combined Phases 4 & 5 for iterative development
- Removed venue search (no data source)
- Changed to polling instead of live updates
- Reduced PAT expiry to 90 days
- Split god object into focused tools
- Added version pinning for experimental API