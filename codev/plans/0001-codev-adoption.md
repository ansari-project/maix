# Plan: Full Codev Adoption for Maix

## Metadata
- **ID**: 0001
- **Status**: draft (updated with consultation feedback)
- **Specification**: codev/specs/0001-codev-adoption.md
- **Created**: 2026-01-04

## Executive Summary

This plan migrates Maix from partial codev adoption to full compliance. The work is purely documentation—no application code changes. We'll consolidate all dev_docs content under codev/, create a streamlined CLAUDE.md, and properly track existing DAPPER projects in the codev structure.

Key approach:
1. Migrate before delete (never lose content)
2. Update links as we go
3. Commit atomically per phase
4. Validate each phase before proceeding

**Important Discovery**: Much of the reference content (testing strategy, database concepts, etc.) is currently embedded in CLAUDE.md, not in separate files. Phase 4 (Architecture) will extract this content; Phase 1 only moves the 2 actual files in dev_docs/ref/.

## Success Metrics
- [ ] CLAUDE.md < 200 lines
- [ ] CLAUDE.md == AGENTS.md (in sync)
- [ ] No DAPPER methodology embedded in CLAUDE.md
- [ ] All dev_docs/ref/ files in codev/resources/ref/
- [ ] All DAPPER projects in codev/{specs,plans,reviews}/
- [ ] projectlist.md tracks 3+ projects with correct status
- [ ] config.json valid and complete (ALREADY DONE)

## Phase Breakdown

### Phase 1: Migrate Reference Documentation
**Dependencies**: None
**Status**: pending

#### Objectives
- Move existing reference docs from dev_docs/ref/ to codev/resources/ref/
- Note: Only 2 files exist; most "reference" content is embedded in CLAUDE.md

#### Deliverables
- [ ] codev/resources/ref/ directory created
- [ ] automated-testing-authentication.md migrated
- [ ] vercel-logs.md migrated
- [ ] dev_docs/ref/ directory removed

#### Implementation Details

**Actual files in dev_docs/ref/** (verified):
- automated-testing-authentication.md
- vercel-logs.md

```bash
# 1. Create target directory
mkdir -p codev/resources/ref/

# 2. Move actual files
mv dev_docs/ref/automated-testing-authentication.md codev/resources/ref/
mv dev_docs/ref/vercel-logs.md codev/resources/ref/

# 3. Remove empty source directory
rmdir dev_docs/ref/
```

**Note**: Files like testing-strategy.md, debugging-playbook.md, maix-data-model.md do NOT exist as separate files. This content is embedded in CLAUDE.md and will be extracted during Phase 4 (Architecture Documentation).

#### Acceptance Criteria
- [ ] `ls codev/resources/ref/` shows 2 files
- [ ] `ls dev_docs/ref/` fails (directory removed)

#### Rollback Strategy
Git revert.

---

### Phase 2: Migrate Legacy DAPPER Projects (NO DELETION YET)
**Dependencies**: None (can run parallel to Phase 1)
**Status**: pending

#### Objectives
- Convert Following System and Todo Quick Add to codev format
- Register them in projectlist.md as integrated
- **Do NOT delete source files yet** - cleanup happens in Phase 7

#### Deliverables
- [ ] codev/specs/0002-following-system.md (from dev_docs/designs/)
- [ ] codev/plans/0002-following-system.md (from dev_docs/plans/)
- [ ] codev/specs/0003-todo-quick-add.md (from dev_docs/designs/)
- [ ] codev/plans/0003-todo-quick-add.md (from dev_docs/plans/)
- [ ] projectlist.md updated with both projects

#### Implementation Details

**Following System (0002)**:
```bash
# Copy (not move) - keep originals until cleanup phase
cp dev_docs/designs/following-system.md codev/specs/0002-following-system.md
cp dev_docs/plans/following-system.md codev/plans/0002-following-system.md
```

**Todo Quick Add (0003)**:
```bash
cp dev_docs/designs/todo-quick-add.md codev/specs/0003-todo-quick-add.md
cp dev_docs/plans/todo-quick-add.md codev/plans/0003-todo-quick-add.md
```

**Why copy not move**: Phase 3 needs lessons files which reference these. We do all cleanup in Phase 7 after everything is verified.

#### Acceptance Criteria
- [ ] `ls codev/specs/0002-*.md codev/specs/0003-*.md` shows 2 files
- [ ] `ls codev/plans/0002-*.md codev/plans/0003-*.md` shows 2 files
- [ ] Original files still exist (cleanup later)

#### Rollback Strategy
Delete copied files.

---

### Phase 3: Consolidate Lessons Learned
**Dependencies**: Phase 2 (projects tracked)
**Status**: pending

#### Objectives
- Merge all lessons content into codev/resources/lessons-learned.md
- Create review documents for migrated projects
- **Do NOT delete source files yet** - cleanup in Phase 7

#### Deliverables
- [ ] codev/resources/lessons-learned.md populated
- [ ] codev/reviews/0002-following-system.md created
- [ ] codev/reviews/0003-todo-quick-add.md created

#### Implementation Details

**Source files** (verified exist):
- `/lessons-learned.md` (root, 327 lines)
- `dev_docs/lessons/following-system.md` (6885 bytes)
- `dev_docs/lessons/todo-quick-add.md` (7050 bytes)
- `dev_docs/lessons/dapper-improvements-following.md` (4276 bytes)

**Process**:
1. Read all source files
2. Organize content by category in codev/resources/lessons-learned.md
3. Create review docs for projects 0002 and 0003 based on their lessons
4. Keep source files until Phase 7 cleanup

#### Acceptance Criteria
- [ ] `wc -l codev/resources/lessons-learned.md` > 50
- [ ] `ls codev/reviews/0002-*.md codev/reviews/0003-*.md` shows 2 files
- [ ] Source files still exist (cleanup later)

#### Rollback Strategy
Git revert.

---

### Phase 4: Populate Architecture Documentation
**Dependencies**: Phase 1 (ref docs available for linking)
**Status**: pending

#### Objectives
- Fill codev/resources/arch.md with actual Maix architecture
- **EXTRACT content from current CLAUDE.md** (this is where testing-strategy, database concepts, etc. live)

#### Deliverables
- [ ] arch.md with System Overview
- [ ] arch.md with Directory Structure
- [ ] arch.md with Key Components (from CLAUDE.md Database Concepts section)
- [ ] arch.md with External Dependencies
- [ ] arch.md with Conventions (from CLAUDE.md Development Guidelines)
- [ ] arch.md with Testing Strategy summary (from CLAUDE.md Testing Strategy section)

#### Implementation Details

**Content to EXTRACT from CLAUDE.md**:
- Project Overview → System Overview
- Technology Stack → External Dependencies
- Database Concepts → Key Components / Data Model
- Development Guidelines → Conventions
- Testing Strategy → Testing section (summary, link to ref docs)
- Key Database Concepts → Data Model section

**Content from codebase**:
- Directory Structure (inspect src/, prisma/, scripts/)
- Key Components (scan src/app/, src/lib/)

**Link to**:
- `codev/resources/ref/automated-testing-authentication.md`
- `codev/resources/ref/vercel-logs.md`

#### Acceptance Criteria
- [ ] `grep -c "##" codev/resources/arch.md` >= 5 sections
- [ ] Includes content previously in CLAUDE.md (database concepts, etc.)
- [ ] Links resolve

#### Rollback Strategy
Git revert.

---

### Phase 5: Create Streamlined CLAUDE.md
**Dependencies**: Phase 4 (arch.md has extracted content to link to)
**Status**: pending

#### Objectives
- Replace 1081-line CLAUDE.md with ~150 line version
- Keep AGENTS.md in sync
- All detailed content now lives in arch.md and ref docs

#### Deliverables
- [ ] New CLAUDE.md < 200 lines
- [ ] References codev/protocols/ instead of embedding DAPPER
- [ ] Contains critical warnings (database, git)
- [ ] Links to arch.md for detailed content
- [ ] AGENTS.md matches CLAUDE.md

#### Implementation Details

**Before writing new CLAUDE.md**:
- Verify arch.md has all extracted content
- Grep for "NEVER", "CRITICAL" warnings to preserve

**New CLAUDE.md structure**:
```markdown
# Maix - Claude Code Instructions

## Project Overview
[~20 lines: What Maix is, tech stack]

## Development Methodology
[~20 lines: Codev references, protocol selection guide]

## Key Locations
[~15 lines: Where to find things]

## Quick Reference
[~20 lines: Commands, shortcuts]

## Critical Warnings
[~30 lines: Database safety, git restrictions - condensed]

## For More Details
[~10 lines: Links to arch.md, ref docs]
```

#### Acceptance Criteria
- [ ] `wc -l CLAUDE.md` < 200
- [ ] `grep -c "DAPPER" CLAUDE.md` == 0 (no methodology definitions)
- [ ] `grep -c "codev/protocols" CLAUDE.md` >= 1 (has references)
- [ ] `diff CLAUDE.md AGENTS.md` empty (files match)
- [ ] `grep -c "NEVER\|CRITICAL" CLAUDE.md` >= 3 (warnings preserved)

#### Rollback Strategy
Git revert.

---

### Phase 6: Update Project Tracking
**Dependencies**: Phase 2 (projects migrated), Phase 5 (adoption complete)
**Status**: pending

#### Objectives
- Finalize projectlist.md with correct statuses
- Archive completed projects to projectlist-archive.md

#### Deliverables
- [ ] Project 0001 status: implementing → integrated (after all phases)
- [ ] Project 0002 status: integrated (in archive)
- [ ] Project 0003 status: integrated (in archive)
- [ ] projectlist-archive.md populated

#### Implementation Details

After all phases complete, update project tracking:

```yaml
# projectlist-archive.md - Completed projects
projects:
  - id: "0002"
    title: "Following System"
    status: integrated
    files:
      spec: codev/specs/0002-following-system.md
      plan: codev/plans/0002-following-system.md
      review: codev/reviews/0002-following-system.md
    notes: "Migrated from DAPPER. Original implementation Aug 2025."

  - id: "0003"
    title: "Todo Quick Add"
    status: integrated
    files:
      spec: codev/specs/0003-todo-quick-add.md
      plan: codev/plans/0003-todo-quick-add.md
      review: codev/reviews/0003-todo-quick-add.md
    notes: "Migrated from DAPPER. Original implementation Aug 2025."
```

#### Acceptance Criteria
- [ ] `grep -c "status: integrated" codev/projectlist*.md` >= 3
- [ ] projectlist-archive.md has projects 0002 and 0003

#### Rollback Strategy
Git revert.

---

### Phase 7: Cleanup and Validation
**Dependencies**: All previous phases complete and verified
**Status**: pending

#### Objectives
- Remove original dev_docs/ files (now migrated)
- Remove root lessons-learned.md
- Verify config.json (already created)
- Run full verification
- Final commit

#### Deliverables
- [ ] dev_docs/designs/ removed (content in codev/specs/)
- [ ] dev_docs/plans/ removed (content in codev/plans/)
- [ ] dev_docs/lessons/ removed (content in codev/reviews/ and lessons-learned.md)
- [ ] Root lessons-learned.md removed
- [ ] dev_docs/ removed if empty
- [ ] All verification checks pass

#### Implementation Details

```bash
# Remove migrated files
rm -rf dev_docs/designs/
rm -rf dev_docs/plans/
rm -rf dev_docs/lessons/
rm lessons-learned.md

# Check if dev_docs/ is empty
ls dev_docs/
# If empty, remove
rmdir dev_docs/

# Verify config.json (already created)
jq . codev/config.json

# Run full verification
wc -l CLAUDE.md
diff CLAUDE.md AGENTS.md
ls codev/resources/ref/
ls codev/specs/ codev/plans/ codev/reviews/
grep -c "status:" codev/projectlist.md
```

#### Acceptance Criteria
- [ ] All verification checks from spec pass
- [ ] No broken links (grep for dead references)
- [ ] Clean git status (all changes committed)

#### Rollback Strategy
Git revert entire branch.

---

## Dependency Map

```
Phase 1 (ref docs) ─────┐
                        ↓
Phase 2 (projects) ──→ Phase 3 (lessons/reviews) ──→ Phase 4 (arch)
                                                          ↓
                                                    Phase 5 (CLAUDE.md)
                                                          ↓
                                                    Phase 6 (tracking)
                                                          ↓
                                                    Phase 7 (cleanup)
```

**Critical**: Phase 7 (cleanup) only runs after ALL other phases verified.

## Resource Requirements

### Development Resources
- Single AI agent (Architect)
- No human engineering time beyond review

### Infrastructure
- None - documentation only

### Already Complete
- codev/config.json created with correct content

## Risk Analysis

### Technical Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Broken internal links | Medium | Low | Grep verification after each phase |
| Lost content during migration | Low | High | Copy before delete; cleanup only in Phase 7 |
| CLAUDE.md too aggressive reduction | Medium | Medium | Preserve all CRITICAL/NEVER warnings; verify arch.md has extracted content |
| Missing content in arch.md | Medium | Medium | Read CLAUDE.md carefully during Phase 4; extract all valuable sections |

## Validation Checkpoints

1. **After Phase 1**: Reference docs at new location
2. **After Phase 2**: Projects copied to codev structure
3. **After Phase 3**: Reviews created, lessons consolidated
4. **After Phase 4**: arch.md has all extracted content from CLAUDE.md
5. **After Phase 5**: CLAUDE.md streamlined and valid
6. **After Phase 6**: Project tracking complete
7. **After Phase 7**: Full verification, cleanup done

## Documentation Updates Required
- [x] codev/config.json (ALREADY DONE)
- [ ] codev/resources/arch.md (Phase 4)
- [ ] codev/resources/lessons-learned.md (Phase 3)
- [ ] CLAUDE.md (Phase 5)
- [ ] AGENTS.md (Phase 5)
- [ ] codev/projectlist.md (Phase 6)

## Expert Review

### Round 1 (2026-01-04)

**Codex (REQUEST_CHANGES)**:
- Plan omitted codev/config.json creation → Fixed: Added note that it's ALREADY DONE

**Gemini (REQUEST_CHANGES)**:
- Data loss risk: Files assumed to exist in dev_docs/ref/ don't → Fixed: Updated Phase 1 to show actual 2 files
- Content is embedded in CLAUDE.md, not separate files → Fixed: Added note; Phase 4 now explicitly extracts from CLAUDE.md
- Phase 2/3 dependency conflict (delete before use) → Fixed: Restructured to copy first, delete only in Phase 7

**Plan Adjustments**:
- Phase 1: Only moves 2 actual files (automated-testing-authentication.md, vercel-logs.md)
- Phase 2: Renamed, now copies projects (doesn't delete)
- Phase 3: Depends on Phase 2, creates reviews
- Phase 4: Explicitly extracts embedded content from CLAUDE.md
- Phase 7: All cleanup consolidated here

## Approval
- [ ] Human Review
- [x] Expert AI Consultation Complete

## Change Log
| Date | Change | Reason | Author |
|------|--------|--------|--------|
| 2026-01-04 | Initial plan | Spec approved | Architect |
| 2026-01-04 | Updated with consultation feedback | Address data loss risk, dependency conflicts | Architect |

---

*Ready for human approval*
