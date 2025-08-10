#!/bin/bash
# Git push wrapper for code-submitter agent
# Usage: ./scripts/gps.sh [branch-name]

# Get current branch if not provided
if [ -z "$1" ]; then
    branch=$(git branch --show-current)
else
    branch="$1"
fi

if [ -z "$branch" ]; then
    echo "Error: Could not determine branch name"
    exit 1
fi

echo "📤 Pushing branch: $branch"

# Push with upstream tracking
git push -u origin "$branch"

# Return the exit code
exit $?