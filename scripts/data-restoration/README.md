# Data Restoration Scripts

This directory contains scripts used for one-time data restoration and verification during the August 2025 database migration.

## ⚠️ WARNING

These scripts are for **HISTORICAL REFERENCE ONLY** and should **NOT be run in production**. They were created for a specific data migration task and contain hardcoded paths and assumptions that are no longer valid.

## Scripts Overview

### Data Restoration Scripts
- **restore-data.js** - Main restoration script for users, projects, products, and organizations
- **restore-applications.js** - Restores volunteer applications data
- **restore-causemon.js** - Specific restoration for CauseMon product data
- **restore-posts.js** - Restores posts (questions, answers, discussions)
- **restore-posts-careful.js** - Careful restoration of posts with parent-child relationships

### Utility Scripts
- **check-qa.js** - Verifies Q&A system restoration
- **fix-descriptions.js** - One-time fix for description formatting issues

## Historical Context

These scripts were created in August 2025 to restore data from a PostgreSQL backup after a database schema migration. They:
- Parse PostgreSQL dump files
- Handle specific data transformations needed for the new schema
- Maintain data integrity and relationships
- Skip existing data to prevent duplicates

## Why These Are Kept

1. **Audit Trail** - Documents the data migration process
2. **Reference** - Shows data transformation logic used during migration
3. **Recovery** - In case similar restoration is needed in the future
4. **Historical Record** - Part of the project's development history

## DO NOT USE THESE SCRIPTS

- They contain hardcoded file paths specific to the original migration
- The database schema has evolved since these were written
- Running them could corrupt or duplicate data
- They are not maintained or tested with current code

If you need to restore data, please create new scripts based on the current database schema.