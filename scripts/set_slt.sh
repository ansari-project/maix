#!/bin/bash

# Set Status Line Task script
# Usage: ./scripts/set_slt.sh <task description>
# Writes the provided task description to .claude-task file

# Check if any parameters were provided
if [ $# -eq 0 ]; then
    echo "Error: Task description is required"
    echo "Usage: $0 <task description>"
    exit 1
fi

# Write all command line arguments to .claude-task
echo "$*" > .claude-task

echo "✓ Task set: $*"