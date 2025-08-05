#!/bin/bash
# prisma-safe.sh - Safety wrapper for Prisma commands
# Prevents accidental database disasters by verifying environment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
    source .env
else
    echo -e "${RED}❌ ERROR: .env file not found${NC}"
    exit 1
fi

# Verify DATABASE_URL is set
if [ -z "${DATABASE_URL:-}" ]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL not set${NC}"
    exit 1
fi

# Extract database info (hide password)
DB_INFO=$(echo "$DATABASE_URL" | sed 's/:[^:]*@/:***@/g')
echo -e "${GREEN}🔍 Target Database:${NC} $DB_INFO"

# Check which database we're connected to
if [[ $DATABASE_URL == *"neondb_owner"* ]]; then
    DB_NAME=$(echo "$DATABASE_URL" | grep -oP '(?<=/)[^?]+(?=\?|$)' | tail -1)
    echo -e "${GREEN}📊 Database Name:${NC} $DB_NAME"
fi

# Detect environment
if [[ $DATABASE_URL == *"prod"* ]] || [[ $DATABASE_URL == *"production"* ]]; then
    ENV_TYPE="PRODUCTION"
    COLOR=$RED
elif [[ $DATABASE_URL == *"staging"* ]]; then
    ENV_TYPE="STAGING"
    COLOR=$YELLOW
else
    ENV_TYPE="DEVELOPMENT"
    COLOR=$GREEN
fi

echo -e "${COLOR}🌍 Environment: $ENV_TYPE${NC}"

# Get current git branch
GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo -e "${GREEN}🌿 Git Branch:${NC} $GIT_BRANCH"

# Production safety check
if [ "$ENV_TYPE" = "PRODUCTION" ]; then
    echo -e "${RED}⚠️  WARNING: You are about to run a command on PRODUCTION!${NC}"
    echo -e "${RED}⚠️  This could affect live user data!${NC}"
    echo
    read -p "Type 'PRODUCTION' to continue, or press Ctrl+C to cancel: " confirm
    if [ "$confirm" != "PRODUCTION" ]; then
        echo -e "${RED}❌ Cancelled${NC}"
        exit 1
    fi
fi

# Check for dangerous commands
if [[ "$*" == *"db push"* ]]; then
    echo -e "${RED}❌ ERROR: 'db push' is dangerous and can cause data loss!${NC}"
    echo -e "${YELLOW}💡 Use 'npm run db:migrate:new' instead${NC}"
    exit 1
fi

if [[ "$*" == *"migrate reset"* ]]; then
    echo -e "${RED}⚠️  WARNING: 'migrate reset' will DELETE ALL DATA!${NC}"
    echo -e "${YELLOW}💡 Run 'npm run db:backup' first${NC}"
    read -p "Type 'DELETE ALL DATA' to continue: " confirm
    if [ "$confirm" != "DELETE ALL DATA" ]; then
        echo -e "${RED}❌ Cancelled${NC}"
        exit 1
    fi
fi

# Show migration status before migrate commands
if [[ "$*" == *"migrate"* ]] && [[ "$*" != *"status"* ]]; then
    echo
    echo -e "${GREEN}📋 Current migration status:${NC}"
    npx prisma migrate status || true
    echo
fi

# Execute the command
echo -e "${GREEN}🚀 Executing:${NC} $*"
echo
exec "$@"