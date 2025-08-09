# Claude Code Project Configuration

This directory contains project-specific Claude Code configuration for the Maix project.

## Statusline Configuration

The custom statusline shows:
- Git branch and status
- Current AI model
- Current time
- Current task (from `.claude-task` file in project root)

## Task Management

To set the current task displayed in the statusline:
- Use `/slt <task description>` to manually set a task
- Use `/slt` without arguments to auto-summarize current work

The task is stored in `.claude-task` in the project root.

## Setup

This configuration is automatically used when Claude Code is run from this project directory.