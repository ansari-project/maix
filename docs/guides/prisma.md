# Prisma ORM Guide: Hard Lessons from Production Disasters

This guide documents our painful experiences with Prisma and provides strict guidelines to prevent future database disasters. We've experienced multiple incidents including data loss, so take these recommendations seriously.

## Table of Contents
1. [Our Database Disasters](#our-database-disasters)
2. [Should We Abandon Prisma?](#should-we-abandon-prisma)
3. [Strict Best Practices](#strict-best-practices)
4. [AI Agent Safeguards](#ai-agent-safeguards)
5. [Emergency Procedures](#emergency-procedures)
6. [Migration Strategy](#migration-strategy)

## Our Database Disasters

### Incident Log
1. **July 2025**: Ran `npx prisma migrate deploy` on development database, causing complete data loss
2. **August 2025**: Used `npx prisma db push` on production, nearly lost critical data
3. **August 2025**: Environment variable confusion led to commands running against wrong database
4. **August 2025**: PostgreSQL search_path issues made it appear all data was lost

### Root Causes
- **Confusing Commands**: `db push` vs `migrate dev` vs `migrate deploy` - easy to use the wrong one
- **Poor Environment Separation**: No clear indication of which database you're connected to
- **Dangerous Defaults**: Commands execute immediately without sufficient warnings
- **Environment Variable Issues**: Shell doesn't always load `.env` files automatically

## Should We Abandon Prisma?

### Alternatives Comparison

#### 1. **Drizzle ORM** (Recommended Alternative)
```typescript
// Drizzle - SQL-like, type-safe, performant
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow()
});
```

**Pros:**
- 10x faster than Prisma in serverless environments
- SQL-first approach - if you know SQL, you know Drizzle
- Smaller bundle size, better for Next.js Edge Runtime
- No code generation step required

**Cons:**
- Less mature ecosystem
- Fewer built-in features
- Manual migration writing

#### 2. **TypeORM**
**Pros:**
- Mature, battle-tested
- Native NestJS support
- Both Active Record and Data Mapper patterns

**Cons:**
- Heavy for serverless
- Complex configuration
- TypeScript support can be quirky

#### 3. **Kysely**
**Pros:**
- Type-safe SQL query builder
- Zero runtime dependencies
- Excellent TypeScript support

**Cons:**
- Lower level than ORMs
- No built-in migrations
- Steeper learning curve

### Migration Feasibility

**Should we migrate away from Prisma?**

**Not Yet.** Despite the issues, migrating would require:
- Rewriting all database queries (500+ locations)
- New migration system
- Retraining team
- Potential new bugs

**Instead**: Implement strict safeguards (see below) and consider migration for v2.

## Strict Best Practices

### 1. Environment Management

**NEVER rely on implicit environment loading**

```bash
# ❌ WRONG - May use wrong database
psql $DATABASE_URL -c "SELECT * FROM users"

# ✅ CORRECT - Explicitly load environment
source .env && psql $DATABASE_URL -c "SELECT * FROM users"

# ✅ BETTER - Use env-specific files
source .env.production && psql $DATABASE_URL -c "SELECT * FROM users"
```

**Create environment-specific files:**
```bash
.env.local       # Local development
.env.staging     # Staging environment
.env.production  # Production (NEVER commit this)
```

### 2. Prisma Command Safety

**Command Reference Card:**
```bash
# Development Only
npx prisma db push              # ⚠️ DANGEROUS - Drops data!
npx prisma migrate dev          # ✅ Safe for development

# Production Only  
npx prisma migrate deploy       # ✅ Safe for production
                               # ❌ NEVER run on development!

# Always Safe
npx prisma generate            # ✅ Generates client
npx prisma studio             # ✅ GUI browser (read-only recommended)
```

### 3. Neon + Next.js Configuration

**Always use separate URLs for pooled and direct connections:**

```prisma
// prisma/schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")        // Pooled connection for app
  directUrl = env("DIRECT_DATABASE_URL") // Direct for migrations
}
```

**Environment variables:**
```bash
# .env.production
DATABASE_URL="postgres://user:pass@host-pooler.neon.tech/db?sslmode=require"
DIRECT_DATABASE_URL="postgres://user:pass@host.neon.tech/db?sslmode=require"
```

### 4. Pre-Command Safety Checks

**Create a safety wrapper script:**

```bash
#!/bin/bash
# scripts/safe-prisma.sh

# Load environment and show which database
source .env
echo "🚨 DATABASE CHECK 🚨"
echo "You are connected to:"
psql $DATABASE_URL -c "SELECT current_database();" 2>/dev/null || echo "❌ Cannot connect"
echo "Environment: ${NODE_ENV:-development}"
echo ""
read -p "Continue with operation? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Execute the command
"$@"
```

Use it like:
```bash
./scripts/safe-prisma.sh npx prisma migrate deploy
```

### 5. Migration Workflow

**Local Development:**
```bash
# 1. Make schema changes
vim prisma/schema.prisma

# 2. Create migration
npx prisma migrate dev --name descriptive_name

# 3. Commit BOTH schema AND migration
git add prisma/
git commit -m "feat: add user bio field"
```

**Production Deployment (CI/CD):**
```bash
# In your deployment script
npm install
npx prisma generate
npx prisma migrate deploy  # Only applies committed migrations
npm run build
```

## AI Agent Safeguards

### For Claude Code and Other AI Assistants

**1. Update CLAUDE.md with explicit warnings:**
```markdown
## ⚠️ CRITICAL DATABASE SAFETY ⚠️

1. NEVER use `npx prisma db push` on any shared database
2. NEVER use `npx prisma migrate deploy` on development
3. ALWAYS verify environment before database commands:
   ```bash
   source .env && echo $DATABASE_URL
   ```
4. If unsure, STOP and ask user which environment to use
```

**2. Implement command aliases:**
```bash
# In .bashrc or .zshrc
alias prisma-dev="NODE_ENV=development npx prisma"
alias prisma-prod="echo '⚠️  PRODUCTION!' && NODE_ENV=production npx prisma"
```

**3. Visual Database Indicators:**
```bash
# Add to your prompt (.bashrc/.zshrc)
function parse_database() {
    if [[ $DATABASE_URL == *"prod"* ]]; then
        echo "🔴 PROD"
    elif [[ $DATABASE_URL == *"staging"* ]]; then
        echo "🟡 STAGE"
    else
        echo "🟢 DEV"
    fi
}
PS1='$(parse_database) \w $ '
```

## Emergency Procedures

### When Disaster Strikes

**1. Stop Everything**
```bash
# Kill any running migrations
ps aux | grep prisma | awk '{print $2}' | xargs kill -9
```

**2. Assess Damage**
```bash
# Check what database you're on
source .env && psql $DATABASE_URL -c "SELECT current_database();"

# Count critical records
source .env && psql $DATABASE_URL -c "
  SELECT 'users' as table, COUNT(*) FROM users
  UNION SELECT 'projects', COUNT(*) FROM projects
  UNION SELECT 'organizations', COUNT(*) FROM organizations;
"
```

**3. Recovery Options**

**Option A: Neon Point-in-Time Recovery**
```bash
# Use Neon dashboard to restore to timestamp before incident
# This is your best option for production
```

**Option B: Restore from Backup**
```bash
# If you have our backup script
source .env && psql $DATABASE_URL < db_backups/latest_backup.sql
```

**Option C: Roll Forward (Recommended)**
```bash
# Create a new migration to fix the problem
npx prisma migrate dev --name fix_disaster
# This creates a new migration that reverses the damage
```

### PostgreSQL Search Path Issues

If tables appear missing:
```sql
-- Check search path
SHOW search_path;

-- Set search path
SET search_path TO public;

-- Make it permanent for role
ALTER ROLE username SET search_path TO public;
```

## The Real Problem: Prisma's Design Flaws

### Why We Keep Having Disasters

After deep analysis, we've discovered the root causes:

1. **Prisma Forces Interactive Mode**
   - `migrate dev` is hardcoded to be interactive
   - No `--allow-non-interactive` flag (3+ years of requests ignored)
   - This breaks AI agents (Claude Code) and CI/CD pipelines
   - GitHub issue #7113 still open with no resolution

2. **Shadow Database Requirements**
   - Prisma REQUIRES a second database for development
   - Most cloud providers limit you to 1 database
   - Using same DB as shadow = DATA LOSS
   - No way to disable this requirement

3. **Single Database Reality vs Multi-DB Assumptions**
   - Prisma assumes: separate dev/staging/prod databases
   - Reality: Most startups use ONE database
   - Their "best practices" are enterprise-focused
   - This mismatch causes systematic failures

4. **Environment Variable Context Switching**
   - `.env` files only load in Node.js context
   - Shell commands need explicit `source .env`
   - No built-in safeguards or warnings
   - Easy to run commands against wrong database

## The Solution: migrate diff + deploy Workflow

After extensive testing, we discovered that even `--create-only` doesn't work for AI agents because Prisma detects non-TTY environments. The real solution uses `migrate diff` and `migrate deploy`:

### Safe Migration Commands (Added to package.json)

```json
{
  "scripts": {
    "db:migrate:new": "./scripts/create-migration.sh",
    "db:migrate:apply": "source .env && prisma migrate deploy",
    "db:migrate:status": "source .env && prisma migrate status",
    "db:backup": "./scripts/backup_database.sh",
    "db:push": "echo '❌ ERROR: db:push is dangerous!' && exit 1"
  }
}
```

### AI Agent Compatible Workflow

```bash
# Step 1: Create migration from schema changes (fully non-interactive!)
npm run db:migrate:new descriptive_name

# Step 2: Review the generated SQL
cat prisma/migrations/*/migration.sql

# Step 3: Apply when ready
npm run db:migrate:apply
```

### How It Works

The `create-migration.sh` script uses:
- `prisma migrate diff` to generate SQL from schema changes
- `prisma migrate deploy` to apply migrations (production-safe)
- No interactive prompts at all

This workflow:
- ✅ **Truly non-interactive** (works with AI agents)
- ✅ **Safe for CI/CD** (uses deploy command)
- ✅ **Production-ready** (based on diff, not dev command)
- ✅ **Prevents data loss** (explicit review step)

## Migration Strategy

### Phase 1: Immediate Safeguards (✅ COMPLETED August 5, 2025)
1. ✅ Implement AI-compatible npm scripts using `migrate diff` + `deploy`
2. ✅ Create `create-migration.sh` script for non-interactive workflow
3. ✅ Update CLAUDE.md with working workflow
4. ✅ Establish database baseline using `migrate resolve`
5. ✅ Test complete workflow: create → review → apply
6. ✅ Enhanced backup script with table row counts
7. ✅ Eliminate dangerous `db push` command

### Phase 2: Process Improvements (This Month)
1. Monitor if incidents stop with new workflow
2. Consider Neon database branching for testing
3. Clean up test migrations from setup
4. Document any edge cases discovered

### Phase 3: Long-term Evaluation (Next Quarter)
1. Assess effectiveness of safeguards
2. If successful, document as best practice for AI agents
3. Consider open-sourcing the migration scripts
4. Evaluate if Drizzle migration still needed

## Best Practices Checklist

Before ANY schema change:
- [ ] Backup created? (`npm run db:backup`)
- [ ] Schema changes made in `prisma/schema.prisma`
- [ ] Migration created? (`npm run db:migrate:new name`)
- [ ] Migration SQL reviewed? (`cat prisma/migrations/*/migration.sql`)
- [ ] Migration applied? (`npm run db:migrate:apply`)
- [ ] Status verified? (`npm run db:migrate:status`)
- [ ] Changes committed to git? (both schema + migration files)

## Conclusion

We've successfully solved the Prisma migration disasters by implementing an AI-agent compatible workflow. The key insights:

1. **Prisma's interactive design breaks automation** - `migrate dev` can't be used by AI agents
2. **The solution is `migrate diff` + `migrate deploy`** - Both are truly non-interactive
3. **Environment safety is critical** - Our scripts auto-load .env and show database info
4. **Backups are essential** - Enhanced script shows table row counts

**The result**: A bulletproof migration workflow that works for:
- ✅ AI agents (Claude Code)
- ✅ CI/CD pipelines  
- ✅ Production deployments
- ✅ Human developers

No more database disasters. The new workflow eliminates the root causes of our previous incidents.

---

*Last updated: August 5, 2025 - AI-compatible workflow implemented and tested*