#!/bin/bash

# Claude Code Status Line Script
# Provides useful development information

input=$(cat)

# Extract JSON data
MODEL_NAME=$(echo "$input" | jq -r '.model.display_name')
CURRENT_DIR=$(echo "$input" | jq -r '.workspace.current_dir')
PROJECT_DIR=$(echo "$input" | jq -r '.workspace.project_dir')
VERSION=$(echo "$input" | jq -r '.version')

# Color definitions
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Current time
CURRENT_TIME=$(date +"%H:%M")

# Git information
GIT_INFO=""
if [ -d "$CURRENT_DIR/.git" ] || git -C "$CURRENT_DIR" rev-parse --git-dir >/dev/null 2>&1; then
    cd "$CURRENT_DIR"
    
    # Get branch name
    BRANCH=$(git branch --show-current 2>/dev/null || echo "detached")
    
    # Get git status indicators
    STATUS=""
    if ! git diff --quiet 2>/dev/null; then
        STATUS="${STATUS}*" # Modified files
    fi
    if ! git diff --cached --quiet 2>/dev/null; then
        STATUS="${STATUS}+" # Staged files
    fi
    if [ -n "$(git ls-files --others --exclude-standard 2>/dev/null)" ]; then
        STATUS="${STATUS}?" # Untracked files
    fi
    
    # Check if we're ahead/behind remote
    AHEAD_BEHIND=""
    if git rev-parse --abbrev-ref @{u} >/dev/null 2>&1; then
        AHEAD=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo "0")
        BEHIND=$(git rev-list --count HEAD..@{u} 2>/dev/null || echo "0")
        
        if [ "$AHEAD" -gt 0 ] && [ "$BEHIND" -gt 0 ]; then
            AHEAD_BEHIND="↕${AHEAD}/${BEHIND}"
        elif [ "$AHEAD" -gt 0 ]; then
            AHEAD_BEHIND="↑${AHEAD}"
        elif [ "$BEHIND" -gt 0 ]; then
            AHEAD_BEHIND="↓${BEHIND}"
        fi
    fi
    
    # Construct git info
    GIT_BRANCH_COLOR=$GREEN
    if [ -n "$STATUS" ]; then
        GIT_BRANCH_COLOR=$YELLOW
    fi
    
    GIT_INFO="${GIT_BRANCH_COLOR}⎇ ${BRANCH}${NC}"
    if [ -n "$STATUS" ]; then
        GIT_INFO="${GIT_INFO}${RED}${STATUS}${NC}"
    fi
    if [ -n "$AHEAD_BEHIND" ]; then
        GIT_INFO="${GIT_INFO}${PURPLE}${AHEAD_BEHIND}${NC}"
    fi
fi


# Task information from .claude-task file
TASK_INFO=""
TASK_FILE="$CURRENT_DIR/.claude-task"
if [ -f "$TASK_FILE" ] && [ -s "$TASK_FILE" ]; then
    TASK_CONTENT=$(cat "$TASK_FILE" | tr -d '\n\r')
    if [ -n "$TASK_CONTENT" ]; then
        TASK_INFO="$TASK_CONTENT"
    else
        TASK_INFO="None set"
    fi
else
    TASK_INFO="None set"
fi

# Build the complete status line
if [ -n "$GIT_INFO" ]; then
    printf "${GIT_INFO} ${GRAY}|${NC} ${PURPLE}${MODEL_NAME}${NC} ${GRAY}|${NC} ${GRAY}${CURRENT_TIME}${NC} ${GRAY}|${NC} ${CYAN}${TASK_INFO}${NC}"
else
    printf "${PURPLE}${MODEL_NAME}${NC} ${GRAY}|${NC} ${GRAY}${CURRENT_TIME}${NC} ${GRAY}|${NC} ${CYAN}${TASK_INFO}${NC}"
fi