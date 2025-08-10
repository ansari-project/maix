#!/bin/bash

# Simple git commit script that prompts for commit message
# Usage: ./scripts/gcm.sh

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

echo "🚀 Committing with message: $message"
git commit -m "$message"