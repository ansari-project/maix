# Maix Development Process

## Overview

Our development process ensures thoughtful design, iterative improvement, and high-quality implementation. We move from high-level ideas to concrete implementations through structured phases.

## Process Flow

```
1. IDEAS → 2. MVP PLAN → 3. PHASED IMPLEMENTATION (DAPPER)
```

---

## 1. Ideas Phase

**Location**: `/docs/ideas/[feature-name].md`

### Purpose
Capture and flesh out the high-level concept before any implementation planning.

### Contents
- **Overview**: What problem are we solving?
- **User Intent**: What does the user want to achieve?
- **Entities Involved**: What models, systems, or components are affected?
- **Goals**: Specific, measurable outcomes
- **User Stories**: How will users interact with this feature?
- **Success Criteria**: How do we know when we've succeeded?
- **Open Questions**: What needs further clarification?
- **Constraints**: Technical, business, or design limitations

### Example Structure
```markdown
# Feature Name

## Overview
Brief description of the feature and the problem it solves.

## User Intent
What the user is trying to accomplish and why.

## Entities Involved
- Existing: [models/systems that will be modified]
- New: [new models/systems to be created]

## Goals
1. Primary goal
2. Secondary goals

## User Stories
- As a [user type], I want to [action] so that [benefit]

## Success Criteria
- Measurable outcome 1
- Measurable outcome 2

## Open Questions
- Question that needs answering before implementation

## Constraints
- Must work within existing system
- Performance requirements
- Security considerations
```

---

## 2. MVP Plan Phase

**Location**: `/docs/plans/[feature-name]-mvp.md`

### Purpose
Convert the idea into a concrete, phased implementation plan focusing on delivering value incrementally.

### Process
1. Review the idea document
2. Extract the minimal valuable functionality
3. Break into logical phases
4. Each phase should deliver working functionality
5. Later phases build on earlier ones

### Contents
- **Overview**: Link to idea doc, brief summary
- **MVP Scope**: What's in/out for initial release
- **Phases**: Ordered list of implementation phases
  - Phase goals
  - Deliverables
  - Dependencies
  - Success criteria
- **Future Enhancements**: What's deliberately deferred

### Example Structure
```markdown
# Feature Name - MVP Plan

## Overview
Based on: `/docs/ideas/feature-name.md`
[Brief summary of what we're building]

## MVP Scope
**Included:**
- Core functionality only
- Essential user flows

**Excluded:**
- Nice-to-have features
- Complex edge cases
- Advanced optimizations

## Implementation Phases

### Phase 1: Foundation (2-3 days)
**Goal**: Basic functionality working end-to-end
**Deliverables**:
- Database schema changes
- Core API endpoints
- Basic UI

### Phase 2: Enhancement (3-5 days)
**Goal**: Improve usability and completeness
**Deliverables**:
- Additional API features
- Polished UI
- Error handling

### Phase 3: Polish (2-3 days)
**Goal**: Production readiness
**Deliverables**:
- Tests
- Documentation
- Performance optimization

## Future Enhancements
Features to consider after MVP:
- Advanced feature 1
- Integration with X
- Performance optimization Y
```

---

## 3. Phased Implementation (DAPPER)

**Location**: `/docs/plans/[feature-name]-implementation.md`

### Purpose
Track the actual implementation using the DAPPER workflow.

### DAPPER Workflow

1. **Design**: AI agents collaborate on comprehensive design with simplifications
2. **Agree**: Human reviews and selects simplifications/answers questions
3. **Plan**: Break into executable phases (each delivers working functionality)
4. **Produce**: Execute implementation (update plan doc as you progress - no separate phase files)
5. **Evaluate**: Comprehensive assessment against requirements
6. **Refine**: Final polish and documentation

### Document Structure
```markdown
# Feature Name - Implementation

## Overview
Implementing: `/docs/plans/feature-name-mvp.md`
Status tracker for all phases.

## Phase 1: [Name] [STATUS: ✅ COMPLETE / ⚠️ IN PROGRESS / PENDING]

### Design ✅
[Technical design details]

### Review ✅
[Key findings from review]

### Simplify ✅
[What was removed/simplified]

### Implementation ✅
- [x] Task 1
- [x] Task 2
- [ ] Task 3

### Test ✅
[Test results]

### Review ✅
[Final review notes]

## Phase 2: [Name] [STATUS: PENDING]
[Continue tracking progress in the plan document]
```

---

## Example: RBAC Development

### 1. Idea Document
`/docs/ideas/maix-rbac-organizations.md` - Comprehensive vision with organizations, apps, complex permissions

### 2. MVP Plan  
`/docs/ideas/maix-rbac-organizations-simplified.md` - Stripped down to just visibility controls and basic organizations

### 3. Implementation
`/docs/plans/rbac-implementation-complete.md` - Tracking DAPPER progress

---

## Best Practices

### Ideas Phase
- Don't self-censor - capture the full vision
- Include user quotes or feedback if available
- List all entities even if unsure about implementation

### MVP Planning
- Be ruthless about scope cutting
- Each phase should be 2-5 days max
- Always ask "what's the simplest thing that provides value?"

### Implementation
- Complete each DAPPER stage before moving on
- Update status in real-time
- Don't skip steps even if they seem obvious
- Document simplifications for future reference

### General
- Link between documents for traceability
- Keep status updated in implementation doc
- Review ideas that were cut for future phases
- Celebrate completed phases!

---

## Benefits of This Process

1. **Clear Thinking**: Ideas are fully explored before implementation
2. **Scope Control**: MVP planning prevents feature creep
3. **Quality**: DAPPER ensures thoughtful implementation
4. **Traceability**: Can trace from idea to implementation
5. **Learning**: Document what was simplified and why

---

## Quick Reference

```
/docs/ideas/feature.md → /docs/plans/feature-mvp.md → /docs/plans/feature-implementation.md
   (Full Vision)            (Scoped Plan)                (DAPPER Execution)
```