# Documentation Reorganization Proposal

## Overview
Reorganize the docs/ideas directory to docs/designs with lifecycle-based subdirectories, create a standardized feature design template, and update documentation guidelines in CLAUDE.md.

## Current Problems
1. **Inconsistent naming**: Mix of `todo-`, `inprogress-`, and `done/` prefixes
2. **No standard template**: Each design document has different structure
3. **Implementation focus**: Too much detail on code, not enough on architecture
4. **Timeline coupling**: Some docs include dates/weeks which become outdated

## Proposed Solution

### 1. New Directory Structure

```
docs/
└── designs/
    ├── FEATURE-DESIGN-TEMPLATE.md   # Template for all feature designs
    ├── experimental/                # Early-stage design explorations
    ├── planned/                     # Approved designs ready to implement
    ├── active/                      # Designs currently being implemented
    ├── shipped/                     # Completed feature designs
    └── archived/                    # Deprecated or abandoned designs
        └── README.md                # Explains archival criteria
```

### 2. Naming Convention
- **No lifecycle prefixes** in filenames
- Use descriptive names: `invitation-system.md` not `todo-invitation-system.md`
- Lifecycle status indicated by directory location
- Kebab-case for consistency

### 3. Template Structure
The FEATURE-DESIGN-TEMPLATE.md includes:
- **Overview**: Brief summary
- **Context and Requirements**: Problem statement, requirements, non-goals
- **Design**: Architecture focus, not implementation details
- **Implementation Phases**: No dates, just logical progression
- **Integration Points**: MCP, API, UI touchpoints
- **Success Criteria**: How to measure completion

### 4. Migration Plan

#### Step 1: Create New Structure
```bash
mkdir -p docs/designs/{experimental,planned,active,shipped,archived}
echo "# Archived Designs\n\nDesigns are moved here when..." > docs/designs/archived/README.md
```

#### Step 2: Move Existing Files (preserving git history)
```bash
# Move the template
git mv docs/ideas/FEATURE-DESIGN-TEMPLATE.md docs/designs/

# Move todo- files to planned/
git mv docs/ideas/todo-invitation-system.md docs/designs/planned/invitation-system.md
git mv docs/ideas/todo-notification-system.md docs/designs/planned/notification-system.md
# ... etc

# Move inprogress- files to active/
git mv docs/ideas/inprogress-code-health.md docs/designs/active/code-health.md

# Move done/ contents to shipped/
git mv docs/ideas/done/* docs/designs/shipped/
rmdir docs/ideas/done
```

#### Step 3: Update CLAUDE.md
Add new section on feature documentation standards.

## Benefits
1. **Clear lifecycle visibility**: Directory = status
2. **Consistent documentation**: Template ensures completeness
3. **Architecture focus**: Design over implementation
4. **Flexibility**: Phases not tied to dates
5. **Scalability**: Easy to add new lifecycle stages

## Alternative Considered
**Frontmatter status tags**: Keep files in one directory, use YAML frontmatter for status.
- **Rejected because**: Less visual, requires parsing files to see status

## Implementation Checklist
- [ ] Create FEATURE-DESIGN-TEMPLATE.md
- [ ] Create new directory structure
- [ ] Write migration script
- [ ] Update CLAUDE.md with documentation standards
- [ ] Move existing files to new structure
- [ ] Update any references in code/docs

## Success Criteria
- All feature designs follow consistent template
- Status is immediately visible from directory structure
- New features naturally follow the lifecycle flow
- Documentation focuses on architecture over implementation details