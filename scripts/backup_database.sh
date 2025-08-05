#!/bin/bash

# Database Backup Script for Maix Project
# This script creates a backup of the database before running Prisma operations
# Usage: ./scripts/backup_database.sh

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not found in .env${NC}"
    exit 1
fi

# Create backup directory if it doesn't exist
BACKUP_DIR="./db_backups"
mkdir -p "$BACKUP_DIR"

# Generate timestamp for backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/maix_backup_${TIMESTAMP}.sql"

echo -e "${YELLOW}Starting database backup...${NC}"
echo "Backup file: $BACKUP_FILE"

# Check for pg_dump version 17 first, fallback to default
PG_DUMP="pg_dump"
if [ -x "/opt/homebrew/opt/postgresql@17/bin/pg_dump" ]; then
    PG_DUMP="/opt/homebrew/opt/postgresql@17/bin/pg_dump"
    echo "Using PostgreSQL 17 pg_dump"
fi

# Perform the backup
# Using --data-only to backup only data (not schema, since Prisma manages that)
# Add --no-owner to avoid ownership issues when restoring
# Create a temporary error file
ERROR_FILE=$(mktemp)
if $PG_DUMP "$DATABASE_URL" --data-only --no-owner > "$BACKUP_FILE" 2>"$ERROR_FILE"; then
    echo -e "${GREEN}✓ Database backup completed successfully!${NC}"
    echo "Backup saved to: $BACKUP_FILE"
    
    # Get file size
    SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
    echo "Backup size: $SIZE"
    
    # Show table row counts from the backup file
    echo ""
    echo -e "${YELLOW}Table row counts from backup:${NC}"
    awk '/^COPY/ {table=$2; count=0} /^COPY/ {next} /^\\.$/ {printf "%-40s %6d rows\n", table, count; next} {count++}' "$BACKUP_FILE" | sort -k3 -nr | head -20
    
    # Keep only the last 20 backups to save space
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/maix_backup_*.sql 2>/dev/null | wc -l)
    if [ "$BACKUP_COUNT" -gt 20 ]; then
        echo -e "${YELLOW}Cleaning up old backups...${NC}"
        ls -t "$BACKUP_DIR"/maix_backup_*.sql | tail -n +21 | xargs rm -f
        echo "Kept the 20 most recent backups"
    fi
else
    echo -e "${RED}✗ Database backup failed!${NC}"
    echo ""
    echo "Error details:"
    cat "$ERROR_FILE"
    rm -f "$ERROR_FILE"
    rm -f "$BACKUP_FILE"  # Remove the failed backup file
    echo ""
    echo -e "${YELLOW}Note: If you see a version mismatch error, you may need to:${NC}"
    echo "1. Update your local PostgreSQL: brew upgrade postgresql"
    echo "2. Or use Docker: docker run --rm -e PGPASSWORD=\$PGPASSWORD postgres:17 pg_dump \$DATABASE_URL"
    exit 1
fi

# Clean up error file
rm -f "$ERROR_FILE"

echo -e "${GREEN}Backup complete!${NC}"
echo ""
echo "To restore from this backup, use:"
echo "  psql \$DATABASE_URL < $BACKUP_FILE"