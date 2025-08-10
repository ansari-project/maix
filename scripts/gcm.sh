#!/bin/bash

# Git commit script that also sets statusline task
# Usage: ./scripts/gcm.sh [commit message]

if [ $# -eq 0 ]; then
  echo "📝 Enter your commit message:"
  read -r message
else
  message="$*"
fi

if [ -z "$message" ]; then
  echo "❌ Commit message cannot be empty"
  exit 1
fi

# Extract first line of commit message for statusline
first_line=$(echo "$message" | head -n1)

# Write to .claude-task for statusline
echo "$first_line" > .claude-task

echo "📊 Updated statusline: $first_line"
echo "🚀 Committing with message: $message"
git commit -m "$message"