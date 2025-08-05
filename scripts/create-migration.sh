#!/bin/bash
# create-migration.sh - AI-compatible migration creation
# Usage: ./scripts/create-migration.sh migration_name

set -euo pipefail

# Check for migration name
if [ $# -eq 0 ]; then
    echo "Usage: $0 <migration_name>"
    exit 1
fi

MIGRATION_NAME=$1
TIMESTAMP=$(date +%Y%m%d%H%M%S)
MIGRATION_DIR="prisma/migrations/${TIMESTAMP}_${MIGRATION_NAME}"

echo "Creating migration: $MIGRATION_NAME"

# Create migration directory
mkdir -p "$MIGRATION_DIR"

# Generate migration SQL by comparing current schema to database
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > "$MIGRATION_DIR/migration.sql"

# Check if migration is empty
if [ ! -s "$MIGRATION_DIR/migration.sql" ]; then
    echo "No changes detected in schema"
    rm -rf "$MIGRATION_DIR"
    exit 0
fi

echo "Migration created at: $MIGRATION_DIR/migration.sql"
echo ""
echo "Review the migration:"
echo "  cat $MIGRATION_DIR/migration.sql"
echo ""
echo "Apply the migration:"
echo "  npm run db:migrate:apply"