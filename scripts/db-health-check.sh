#!/bin/bash
# db-health-check.sh - Comprehensive database health check
# Usage: ./scripts/db-health-check.sh

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏥 Database Health Check${NC}"
echo "========================"

# Load environment variables
if [ -f .env ]; then
    source .env
else
    echo -e "${RED}❌ ERROR: .env file not found${NC}"
    exit 1
fi

# Check DATABASE_URL
if [ -z "${DATABASE_URL:-}" ]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL not set${NC}"
    exit 1
fi

# Display database info
DB_INFO=$(echo "$DATABASE_URL" | sed 's/:[^:]*@/:***@/g')
echo -e "${GREEN}🔗 Database:${NC} $DB_INFO"
echo ""

# 1. Prisma Schema Validation
echo -e "${YELLOW}1. Validating Prisma Schema${NC}"
if npx prisma validate; then
    echo -e "${GREEN}   ✅ Schema is valid${NC}"
else
    echo -e "${RED}   ❌ Schema validation failed${NC}"
    exit 1
fi
echo ""

# 2. Database Connection Test
echo -e "${YELLOW}2. Testing Database Connection${NC}"
if timeout 10s npm run db:migrate:status > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ Database connection successful${NC}"
else
    echo -e "${RED}   ❌ Cannot connect to database${NC}"
    exit 1
fi
echo ""

# 3. Migration Status
echo -e "${YELLOW}3. Checking Migration Status${NC}"
MIGRATION_OUTPUT=$(npm run db:migrate:status 2>&1 || true)
if echo "$MIGRATION_OUTPUT" | grep -q "Database schema is up to date"; then
    echo -e "${GREEN}   ✅ All migrations applied${NC}"
elif echo "$MIGRATION_OUTPUT" | grep -q "Following migration.*not yet been applied"; then
    echo -e "${RED}   ❌ Pending migrations found${NC}"
    echo "$MIGRATION_OUTPUT"
    echo -e "${YELLOW}   💡 Run: npm run db:migrate:apply${NC}"
else
    echo -e "${YELLOW}   ⚠️  Unexpected migration status:${NC}"
    echo "$MIGRATION_OUTPUT"
fi
echo ""

# 4. Schema Drift Detection
echo -e "${YELLOW}4. Checking for Schema Drift${NC}"
# Use psql to count tables if available
if command -v psql >/dev/null 2>&1; then
    TABLE_COUNT=$(timeout 5s psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" 2>/dev/null || echo "0")
    TABLE_COUNT=$(echo $TABLE_COUNT | tr -d ' ')
    if [ "$TABLE_COUNT" -gt 0 ]; then
        echo -e "${GREEN}   ✅ Found $TABLE_COUNT tables in database${NC}"
    else
        echo -e "${RED}   ❌ No tables found - database may be empty${NC}"
    fi
else
    echo -e "${YELLOW}   ⚠️  psql not available - skipping table count${NC}"
fi
echo ""

# 5. Client Generation Status
echo -e "${YELLOW}5. Checking Prisma Client Status${NC}"
if [ -d "node_modules/.prisma/client" ]; then
    if [ "prisma/schema.prisma" -nt "node_modules/.prisma/client" ]; then
        echo -e "${RED}   ❌ Prisma client may be out of sync${NC}"
        echo -e "${YELLOW}   💡 Run: npx prisma generate${NC}"
    else
        echo -e "${GREEN}   ✅ Prisma client appears to be in sync${NC}"
    fi
else
    echo -e "${RED}   ❌ Prisma client not found${NC}"
    echo -e "${YELLOW}   💡 Run: npx prisma generate${NC}"
fi
echo ""

# 6. Database Size and Table Stats
echo -e "${YELLOW}6. Database Statistics${NC}"
npm run db:backup > /dev/null 2>&1 || true
LATEST_BACKUP=$(ls -t db_backups/maix_backup_*.sql 2>/dev/null | head -1 || echo "")
if [ ! -z "$LATEST_BACKUP" ]; then
    BACKUP_SIZE=$(ls -lh "$LATEST_BACKUP" | awk '{print $5}')
    echo -e "${GREEN}   📊 Latest backup size: $BACKUP_SIZE${NC}"
    echo -e "${GREEN}   📋 Table row counts:${NC}"
    awk '/^COPY/ {table=$2; count=0} /^COPY/ {next} /^\\.$/ {printf "      %-35s %6d rows\n", table, count; next} {count++}' "$LATEST_BACKUP" | sort -k3 -nr | head -10
else
    echo -e "${YELLOW}   ⚠️  No backup found${NC}"
fi
echo ""

# 7. Check for Dangerous Patterns
echo -e "${YELLOW}7. Security & Safety Checks${NC}"
DANGEROUS_FILES=$(find . -name "*.ts" -o -name "*.js" -o -name "*.tsx" | xargs grep -l "prisma.*db.*push\|npx.*prisma.*db.*push" 2>/dev/null | grep -v node_modules | grep -v ".git" || true)
if [ ! -z "$DANGEROUS_FILES" ]; then
    echo -e "${RED}   ⚠️  Found dangerous 'db push' commands in:${NC}"
    echo "$DANGEROUS_FILES" | sed 's/^/      /'
    echo -e "${YELLOW}   💡 Consider using migration workflow instead${NC}"
else
    echo -e "${GREEN}   ✅ No dangerous Prisma commands found${NC}"
fi
echo ""

# 8. Environment Safety
echo -e "${YELLOW}8. Environment Safety${NC}"
if [[ $DATABASE_URL == *"prod"* ]] || [[ $DATABASE_URL == *"production"* ]]; then
    echo -e "${RED}   ⚠️  WARNING: Connected to PRODUCTION database!${NC}"
    echo -e "${RED}   🚨 Exercise extreme caution with any database operations${NC}"
elif [[ $DATABASE_URL == *"staging"* ]]; then
    echo -e "${YELLOW}   ⚠️  Connected to STAGING database${NC}"
else
    echo -e "${GREEN}   ✅ Connected to development database${NC}"
fi

echo ""
echo -e "${BLUE}🏥 Health Check Complete${NC}"
echo "======================="