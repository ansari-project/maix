# Project Lifecycle Guide

This guide explains the project lifecycle states in MAIX and how they work together with recruitment status to manage projects effectively.

## Overview

MAIX projects have two complementary status systems:

1. **Project Status** (`status`): Tracks the project's lifecycle phase
2. **Recruitment Status** (`isActive`): Controls whether the project is actively seeking volunteers

## Project Lifecycle States

### 1. AWAITING_VOLUNTEERS
- **Purpose**: Project is defined and ready, waiting for volunteers to join
- **Typical Duration**: Until sufficient volunteers apply and are accepted
- **Recruitment**: Usually `isActive: true` to attract volunteers
- **Next States**: PLANNING (when volunteers are onboarded)

**Example**: "AI-powered Islamic prayer time app" has clear requirements but needs developers

### 2. PLANNING  
- **Purpose**: Team is assembled and working on detailed planning, architecture, and task breakdown
- **Typical Duration**: 1-4 weeks depending on project complexity
- **Recruitment**: May be `isActive: false` if team is complete, or `true` if specific skills are still needed
- **Next States**: IN_PROGRESS (when planning is complete and implementation begins)

**Example**: Team is designing the app architecture, creating wireframes, and defining the technical stack

### 3. IN_PROGRESS
- **Purpose**: Active development work is happening
- **Typical Duration**: Most of the project timeline
- **Recruitment**: Usually `isActive: false`, but may be `true` if additional skills are needed mid-project
- **Next States**: COMPLETED (when project goals are met), ON_HOLD (if work needs to pause), CANCELLED (if project cannot continue)

**Example**: Developers are building features, designers are creating UI components, testing is ongoing

### 4. ON_HOLD
- **Purpose**: Work has temporarily stopped due to external factors (volunteer availability, dependency issues, etc.)
- **Typical Duration**: Varies widely - could be weeks to months
- **Recruitment**: Often `isActive: true` to find replacement volunteers or additional help
- **Next States**: IN_PROGRESS (when work resumes), CANCELLED (if project cannot continue)

**Example**: Lead developer became unavailable, waiting for new volunteer to take over technical leadership

### 5. COMPLETED
- **Purpose**: Project has successfully delivered its goals
- **Typical Duration**: Final state
- **Recruitment**: Always `isActive: false`
- **Next States**: None (terminal state)

**Example**: Prayer time app is published on app stores and functioning as intended

### 6. CANCELLED
- **Purpose**: Project has been permanently discontinued
- **Typical Duration**: Final state  
- **Recruitment**: Always `isActive: false`
- **Next States**: None (terminal state)

**Example**: Technical challenges proved insurmountable, or requirements changed fundamentally

## Status Transitions

### Valid Transitions

```
AWAITING_VOLUNTEERS → PLANNING → IN_PROGRESS → COMPLETED
                                     ↓
                                  ON_HOLD ←→ IN_PROGRESS
                                     ↓
                                 CANCELLED

Any state → CANCELLED (projects can be cancelled at any time)
```

### Important Guidelines

1. **COMPLETED projects should never transition to other states** - if more work is needed, create a new related project
2. **CANCELLED projects should never transition to other states** - if the project is revived, create a new project
3. **Projects can move back and forth between IN_PROGRESS and ON_HOLD** as needed
4. **PLANNING can transition back to AWAITING_VOLUNTEERS** if the initial team doesn't work out

## Best Practices

### For Project Owners

1. **Update status regularly** to keep volunteers and the community informed
2. **Use meaningful status updates** when changing states - explain why the transition happened
3. **Consider recruitment needs** when changing status - does the new phase require different skills?
4. **Communicate with your team** before changing status, especially to ON_HOLD or CANCELLED

### For Volunteers

1. **Check both status and isActive** when browsing projects
2. **Understand the commitment level** - AWAITING_VOLUNTEERS projects need initial commitment, IN_PROGRESS projects need ongoing work
3. **Consider joining ON_HOLD projects** - they often need fresh perspective and energy

### For Platform Users

1. **Filter by status** to find projects matching your availability:
   - Looking to start something new? Filter for AWAITING_VOLUNTEERS
   - Want to join active work? Filter for IN_PROGRESS  
   - Can help restart stalled projects? Filter for ON_HOLD
2. **Use status for realistic expectations** about project timeline and commitment

## Technical Implementation

### Database Schema
```sql
enum ProjectStatus {
  AWAITING_VOLUNTEERS
  PLANNING
  IN_PROGRESS
  ON_HOLD
  COMPLETED
  CANCELLED
}

-- Project model includes:
status ProjectStatus @default(AWAITING_VOLUNTEERS)
isActive Boolean @default(true)
```

### API Usage
```typescript
// Create project (defaults to AWAITING_VOLUNTEERS)
await prisma.project.create({
  data: { /* project data */ }
});

// Update project status
await prisma.project.update({
  where: { id: projectId },
  data: { 
    status: 'IN_PROGRESS',
    isActive: false // Stop recruiting since work has started
  }
});

// Query projects by status
const activeProjects = await prisma.project.findMany({
  where: { 
    status: { in: ['AWAITING_VOLUNTEERS', 'PLANNING', 'IN_PROGRESS'] },
    isActive: true 
  }
});
```

## FAQ

**Q: What's the difference between status and isActive?**
A: `status` tracks where the project is in its lifecycle, while `isActive` controls recruitment. A project can be IN_PROGRESS but still `isActive: true` if they need additional volunteers.

**Q: Can a COMPLETED project be reopened?**  
A: No. If more work is needed, create a new related project. This keeps project history clean and clear.

**Q: Should I set isActive to false when moving to PLANNING?**
A: It depends. If your team is complete and you're focused on planning, set it to false. If you still need specific skills for planning (like a designer or product manager), keep it true.

**Q: What if a project needs to go back to planning from IN_PROGRESS?**
A: This might indicate the planning phase wasn't complete. Consider if the project should transition to ON_HOLD while re-planning occurs, or create a new project with the revised scope.