#!/bin/bash
# GitHub PR creation wrapper for code-submitter agent
# Usage: ./scripts/gpr.sh "title" "body"

if [ -z "$1" ]; then
    echo "Error: No PR title provided"
    exit 1
fi

title="$1"
body="${2:-Automated PR created by code-submitter agent}"

echo "🔗 Creating pull request..."
echo "Title: $title"

# Create PR with title and body
gh pr create --title "$title" --body "$body"

# Return the exit code
exit $?