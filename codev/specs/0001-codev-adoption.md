# Spec 0001: Full Codev Adoption for Maix

**Status**: Specified (Human approved)
**Created**: 2026-01-04
**Author**: Architect Agent

## Problem Statement

Maix has partial codev infrastructure but hasn't fully adopted the methodology. The project contains:

1. **Oversized CLAUDE.md** (1081 lines) - embeds entire DAPPER methodology inline instead of referencing protocols
2. **Legacy dev_docs/ structure** - uses old DAPPER three-document pattern instead of codev's spec/plan/review structure
3. **Empty codev infrastructure** - protocols exist but no actual specs, plans, or reviews
4. **No project tracking** - projectlist.md has only a placeholder example
5. **Empty architecture docs** - arch.md and lessons-learned.md are templates with no content
6. **Missing configuration** - no codev/config.json for Agent Farm

This creates confusion about which methodology to follow and wastes context by loading 1000+ lines of methodology into every Claude Code session.

## Goals

1. **Simplify CLAUDE.md** - Reduce from 1081 lines to ~150 lines by referencing protocols instead of embedding them
2. **Preserve project knowledge** - Extract project-specific guidance (database safety, tech stack, patterns) to appropriate locations
3. **Migrate existing work** - Convert dev_docs/ content to codev/ structure (not delete)
4. **Enable project tracking** - Populate projectlist.md with actual work items
5. **Document architecture** - Fill arch.md with Maix system architecture
6. **Consolidate lessons** - Merge lessons-learned.md content into codev structure

## Current State Analysis

### CLAUDE.md Content (1081 lines)

| Section | Lines | Disposition |
|---------|-------|-------------|
| Project Overview | ~30 | Keep in CLAUDE.md |
| DAPPER Methodology (full) | ~400 | DELETE - Reference codev/protocols/ instead |
| Development Guidelines | ~100 | Keep critical items, move details to arch.md |
| Testing Strategy | ~150 | Move to codev/resources/ref/testing-strategy.md |
| Database Concepts | ~50 | Move to arch.md |
| Safety Protocols | ~100 | Keep critical warnings, move details to codev/resources/ref/ |
| Key Reminders | ~30 | Keep in CLAUDE.md |

### Legacy Documentation

| Location | Content | Migration Target |
|----------|---------|------------------|
| dev_docs/designs/following-system*.md | DAPPER design docs | Migrate to codev/specs/ |
| dev_docs/designs/todo-quick-add*.md | DAPPER design docs | Migrate to codev/specs/ |
| dev_docs/plans/following-system*.md | DAPPER plans | Migrate to codev/plans/ |
| dev_docs/plans/todo-quick-add*.md | DAPPER plans | Migrate to codev/plans/ |
| dev_docs/lessons/*.md | Lessons per project | Migrate to codev/reviews/ |
| dev_docs/ref/*.md | Reference docs | Migrate to codev/resources/ref/ |
| lessons-learned.md (root) | 327 lines of learnings | Migrate to codev/resources/lessons-learned.md |

### Missing Infrastructure

- `codev/specs/` - Created but empty
- `codev/plans/` - Created but empty
- `codev/reviews/` - Created but empty
- `codev/resources/ref/` - Needs creation
- `codev/config.json` - Created

## Proposed Solution

### Phase 1: Create New CLAUDE.md and AGENTS.md

Replace the 1081-line CLAUDE.md with a streamlined version (~150 lines) that:

1. **Describes Maix** - Brief project overview, tech stack, core concepts
2. **References protocols** - Points to codev/protocols/ instead of embedding
3. **Lists key locations** - Specs, plans, reviews, resources
4. **Critical warnings only** - Database safety, git restrictions (5-10 lines each, not 100)
5. **Links to detailed docs** - Architecture, testing, debugging in codev/resources/

**Keep CLAUDE.md and AGENTS.md in sync** - Both files should have the same content (manually maintained per codev convention).

Structure:
```markdown
# Maix - Claude Code Instructions

## Project Overview
- What Maix is (AI-accelerated volunteer platform)
- Tech stack (Next.js 15, Prisma, Neon, NextAuth)

## Development Methodology
This project uses Codev. See:
- Protocols: codev/protocols/
- Project tracking: codev/projectlist.md
- Architecture: codev/resources/arch.md

## Quick Reference
- Key commands (/gcm, /slt)
- Critical warnings (database, git)
- Links to detailed docs

## For More Details
- codev/resources/arch.md - Architecture
- codev/resources/ref/testing-strategy.md - Testing
- codev/resources/ref/debugging-playbook.md - Debugging
```

**Validation**: After creating new CLAUDE.md, verify:
- [ ] Line count under 200 lines (`wc -l CLAUDE.md`)
- [ ] No DAPPER/ITRC methodology definitions remain
- [ ] All internal links resolve to existing files
- [ ] Critical safety warnings preserved (grep for "NEVER", "CRITICAL")
- [ ] AGENTS.md matches CLAUDE.md content

### Phase 2: Migrate Reference Documentation

Move `dev_docs/ref/` content to `codev/resources/ref/`:

1. Create `codev/resources/ref/` directory
2. Move all files from `dev_docs/ref/` to `codev/resources/ref/`
3. Update any internal links in moved files
4. Remove empty `dev_docs/ref/` directory

**Files to migrate**:
- testing-strategy.md
- debugging-playbook.md
- maix-data-model.md
- google-genai-sdk-usage.md
- integration-testing.md
- prisma.md
- (any others found)

**Validation**:
- [ ] All files moved to codev/resources/ref/
- [ ] Internal links updated
- [ ] dev_docs/ref/ removed

### Phase 3: Populate Architecture Documentation

Fill `codev/resources/arch.md` with:

1. **System Overview** - Maix platform description
2. **Directory Structure** - src/, prisma/, scripts/, etc.
3. **Key Components** - Auth, Projects, Todos, AI Assistant
4. **Data Model** - Reference to prisma/schema.prisma
5. **External Dependencies** - Neon, Google AI, NextAuth
6. **Conventions** - Code patterns, naming, etc.

**Source content from**:
- Current CLAUDE.md sections (Database Concepts, Development Guidelines)
- codev/resources/ref/maix-data-model.md (after migration)
- prisma/schema.prisma inspection

**Validation**:
- [ ] All major directories documented
- [ ] Key technology decisions explained
- [ ] Links to reference docs working

### Phase 4: Consolidate Lessons Learned

Merge all lessons into `codev/resources/lessons-learned.md`:

1. Content from root `lessons-learned.md` (327 lines)
2. Content from `dev_docs/lessons/*.md` files
3. Organized by category (Testing, Architecture, Process, Tooling, Integration)

**Validation**:
- [ ] All content from source files captured
- [ ] No duplicate entries
- [ ] Categories match template structure

### Phase 5: Migrate Legacy DAPPER Projects

Convert completed DAPPER projects to codev format and mark as complete:

**Following System Feature**:
1. Migrate `dev_docs/designs/following-system.md` → `codev/specs/0002-following-system.md`
2. Migrate `dev_docs/plans/following-system.md` → `codev/plans/0002-following-system.md`
3. Migrate `dev_docs/lessons/following-system.md` → `codev/reviews/0002-following-system.md`
4. Add to projectlist.md with status: `integrated`

**Todo Quick Add Feature**:
1. Migrate `dev_docs/designs/todo-quick-add.md` → `codev/specs/0003-todo-quick-add.md`
2. Migrate `dev_docs/plans/todo-quick-add.md` → `codev/plans/0003-todo-quick-add.md`
3. Migrate `dev_docs/lessons/todo-quick-add.md` → `codev/reviews/0003-todo-quick-add.md`
4. Add to projectlist.md with status: `integrated`

**Cleanup**:
- Remove `dev_docs/designs/` directory (all content migrated)
- Remove `dev_docs/plans/` directory (all content migrated)
- Remove `dev_docs/lessons/` directory (content consolidated)
- Remove root `lessons-learned.md` (content migrated)

**Validation**:
- [ ] All DAPPER docs migrated to codev structure
- [ ] Projects tracked in projectlist.md with correct status
- [ ] dev_docs/ contains only archive-worthy content or is empty

### Phase 6: Update Project Tracking

Update `codev/projectlist.md` with:

1. This adoption project (0001) - already added, update status
2. Following System (0002) - migrated, status: integrated
3. Todo Quick Add (0003) - migrated, status: integrated
4. Archive completed projects to projectlist-archive.md

**Validation**:
- [ ] All projects tracked with correct status
- [ ] Completed projects archived appropriately

### Phase 7: Finalize Configuration

Config already created (`codev/config.json`). Verify:

```json
{
  "project": "maix",
  "shell": {
    "architect": "claude --dangerously-skip-permissions",
    "builder": "claude --dangerously-skip-permissions",
    "shell": "zsh"
  },
  "consultation": {
    "default_models": ["gemini", "codex"],
    "require_review": true
  }
}
```

**Validation**:
- [ ] Valid JSON syntax
- [ ] No secrets or tokens present
- [ ] Shell command works (`zsh` available on system)

## Decisions (Resolved)

### Q1: What to do with dev_docs/ref/? → **Migrate to codev/resources/ref/**
Move all reference docs to consolidate under codev structure.

### Q2: How to handle completed DAPPER projects? → **Migrate and mark complete**
Convert to codev spec/plan/review format with proper numbering and mark as `integrated` in projectlist.md.

### Q3: Should AGENTS.md differ from CLAUDE.md? → **Keep in sync**
Per codev convention, CLAUDE.md and AGENTS.md should have the same content, manually maintained.

### Q4: Preserve or remove root lessons-learned.md? → **Delete after migration**
Content migrates to codev/resources/lessons-learned.md. Root file deleted to avoid confusion.

## Success Criteria

1. **CLAUDE.md under 200 lines** - Measured by `wc -l CLAUDE.md`
2. **CLAUDE.md and AGENTS.md in sync** - Files should match
3. **All protocols referenced, not embedded** - CLAUDE.md contains no DAPPER/ITRC definitions
4. **Populated arch.md** - Contains actual Maix architecture documentation
5. **Consolidated lessons-learned.md** - All lessons in one place under codev/
6. **Reference docs migrated** - codev/resources/ref/ contains all reference docs
7. **Legacy projects migrated** - Following System and Todo Quick Add in codev structure
8. **projectlist.md has real projects** - All projects tracked with correct status
9. **config.json exists** - Valid JSON with required fields
10. **dev_docs/ cleaned up** - Only empty or truly archival content remains

## Verification Plan

After each phase, run these checks:

```bash
# Phase 1: CLAUDE.md + AGENTS.md
wc -l CLAUDE.md                    # Should be < 200
grep -c "DAPPER\|ITRC" CLAUDE.md   # Should be 0 or reference only
diff CLAUDE.md AGENTS.md           # Should be empty (files match)

# Phase 2: Reference docs migration
ls codev/resources/ref/            # Should have files
ls dev_docs/ref/ 2>/dev/null       # Should not exist or be empty

# Phase 3: Architecture
test -s codev/resources/arch.md    # Should be non-empty
grep -c "##" codev/resources/arch.md # Should have sections

# Phase 4: Lessons
wc -l codev/resources/lessons-learned.md # Should be > 50

# Phase 5: Legacy project migration
ls codev/specs/0002-*.md           # Should exist
ls codev/plans/0002-*.md           # Should exist
ls codev/reviews/0002-*.md         # Should exist
ls dev_docs/designs/ 2>/dev/null   # Should not exist or be empty

# Phase 6: Project tracking
grep -c "status:" codev/projectlist.md # Should be >= 3

# Phase 7: Config
jq . codev/config.json             # Should parse as valid JSON
```

## Non-Goals

1. **Changing Maix application code** - This is documentation/methodology migration only
2. **Restructuring codev/ protocols** - Use them as-is from template
3. **Setting up Agent Farm** - Just create config, don't spawn builders

## Risks

| Risk | Mitigation |
|------|------------|
| Lose important project-specific guidance during CLAUDE.md reduction | Review each section, extract to arch.md or ref/. Validation step confirms critical warnings preserved. |
| Break existing workflows that reference CLAUDE.md sections | Search codebase for CLAUDE.md references before editing |
| Confusion during transition | Complete migration in single session, commit atomically |
| Link breakage after migration | Update all internal links, verify with grep |

## Dependencies

None - this is foundational work.

## Consultation Log

### Round 1 (2026-01-04)

**Codex Review (REQUEST_CHANGES)**:
- Ambiguous instructions for legacy docs handling → Resolved
- No verification/testing plan → Added: Verification Plan section
- Missing security guidance for config → Added: Note that no secrets go in config

**Gemini Review (APPROVE with caveats)**:
- Contradiction between Phase 4 and Q2 → Resolved
- Risk of context loss in CLAUDE.md reduction → Added: Validation step
- Shell config should use zsh → Updated

### Human Review (2026-01-04)

Changes requested and incorporated:
- **Migrate instead of archive/delete** - Legacy docs migrated to codev structure, not archived
- **Move dev_docs/ref/ to codev/resources/ref/** - Consolidate all docs under codev
- **CLAUDE.md and AGENTS.md in sync** - Per codev convention, keep files matching
- **Migrate DAPPER projects to codev format** - Convert and mark as complete, not archive

---

*Approved by human. Ready for planning phase.*
