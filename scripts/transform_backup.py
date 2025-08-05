#!/usr/bin/env python3
"""
Transform PostgreSQL backup to remove unwanted tables for clean import.
Only filters out neon_auth.users_sync and _prisma_migrations tables.
All other data is preserved as-is.
"""

import sys
import os

# Configuration
TABLES_TO_SKIP = [
    'neon_auth.users_sync',
    'public._prisma_migrations'
]

def transform_backup(input_file, output_file):
    """Process backup file and filter out unwanted tables."""
    
    with open(input_file, 'r', encoding='utf-8') as f_in, \
         open(output_file, 'w', encoding='utf-8') as f_out:
        
        skipping = False
        lines_skipped = 0
        tables_processed = 0
        
        for line in f_in:
            # Check if we're at the end of a COPY block
            if line.strip() == '\\.':
                if skipping:
                    skipping = False
                    lines_skipped += 1
                    print(f"  Skipped data block")
                    continue
                else:
                    f_out.write(line)
                    continue
            
            # Check if this is a COPY command
            if line.startswith('COPY '):
                # Extract table name
                parts = line.split(' ')
                if len(parts) >= 2:
                    table_name = parts[1]
                    
                    if table_name in TABLES_TO_SKIP:
                        print(f"Skipping table: {table_name}")
                        skipping = True
                        lines_skipped += 1
                        continue
                    else:
                        print(f"Including table: {table_name}")
                        tables_processed += 1
            
            # If we're not skipping, write the line
            if not skipping:
                f_out.write(line)
        
        print(f"\nTransformation complete:")
        print(f"  Tables processed: {tables_processed}")
        print(f"  Tables skipped: {len(TABLES_TO_SKIP)}")
        print(f"  Output written to: {output_file}")

def main():
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    else:
        # Default to the most recent backup
        input_file = '/Users/mwk/Development/ansari-project/maix2/db_backups/maix_backup_20250805_000025.sql'
    
    if not os.path.exists(input_file):
        print(f"Error: Input file '{input_file}' not found")
        sys.exit(1)
    
    # Generate output filename
    base_name = os.path.basename(input_file)
    output_file = os.path.join(
        os.path.dirname(input_file),
        f"transformed_{base_name}"
    )
    
    print(f"Transforming backup file: {input_file}")
    transform_backup(input_file, output_file)

if __name__ == '__main__':
    main()