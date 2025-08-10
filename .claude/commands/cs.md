---
name: cs
description: Smart commit helper
---

1. Run `git status` to see changes
2. Run `git diff` to review changes  
3. Add files individually with `git add <file>` (never use git add -A or git add .)
4. Run `npm run build` to ensure it compiles
5. Run `npm test` to ensure tests pass
6. Commit with `git commit -m "descriptive message based on changes"`
7. Report what was committed

This runs in the main context where permissions work properly.