# Maix - Claude Code Instructions

## Project Overview

> For full description and philosophy, see [README.md](README.md).

Maix is an AI-native volunteer platform built on Next.js 15, Neon PostgreSQL, and Google Gemini.

## Development Methodology

This project uses **Codev** for structured development. See `codev/protocols/` for details.

### Protocol Selection

| Task Type | Protocol | When to Use |
|-----------|----------|-------------|
| Complex features | SPIDER | Multi-phase, needs design/review |
| Simple changes | TICK | Quick fixes, single-file changes |

### Key Locations

| Purpose | Location |
|---------|----------|
| Specs | `codev/specs/` |
| Plans | `codev/plans/` |
| Reviews | `codev/reviews/` |
| Architecture | `codev/resources/arch.md` |
| Lessons | `codev/resources/lessons-learned.md` |
| Project list | `codev/projectlist.md` |

## Quick Reference

### Custom Commands

- `/gcm <message>` - Git commit with message (uses `scripts/gcm.sh`)
- `/slt <task>` - Set statusline task (or auto-summarize if no argument)

### Key Patterns

- **Separation of Concerns**: RBAC, Visibility, and Following are orthogonal systems
- **Progressive Disclosure**: Start simple, expand on user action
- **Integration-First Testing**: Real database for service/API tests

For architecture details, conventions, and component documentation, see `codev/resources/arch.md`.

## Critical Safety Protocols

### Git Safety

1. **NEVER force push** - Protects collaborative work
2. **NEVER use `git add -A` or `git add .`** - Always use specific file paths
3. **Always fetch before push**: `git fetch origin && git status`
4. **If push fails**: STOP and ask user - don't proceed independently

### Database Safety

1. **NEVER use `npx prisma db push`** - Destructive, drops/recreates tables
2. **NEVER use `npx prisma migrate dev`** - Interactive, breaks AI agents

**Safe commands only:**
```bash
npm run db:migrate:new migration_name  # Create migration
npm run db:migrate:apply               # Apply migrations
npm run db:migrate:status              # Check status
npm run db:backup                      # Backup first!
```

See `codev/resources/ref/prisma.md` for comprehensive database safety guidelines.

## Testing

```bash
npm run test:db:start     # Start test database (port 5433)
npm run test:integration  # Run integration tests
npm run test:unit         # Run unit tests
npm run test:all          # Both unit and integration
```

**Philosophy**: Integration-first (60%), real database for service tests, mock only external services.

## Key Reminders

1. **Keep It Simple** - Bias towards simple solutions for current problems
2. **Track Progress** - Use TodoWrite tool for task management
3. **No Claude Suffixes** - Never add "Generated with Claude Code" to commits
4. **Test Pragmatically** - Integration-first with real database
5. **Follow Protocols** - Use SPIDER or TICK as appropriate

## For More Details

- **Architecture**: `codev/resources/arch.md`
- **Lessons Learned**: `codev/resources/lessons-learned.md`
- **Database Schema**: `prisma/schema.prisma`
- **Testing Strategy**: `codev/resources/ref/testing-strategy.md`
