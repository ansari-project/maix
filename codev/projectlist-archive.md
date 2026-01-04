# Project Archive

Completed and terminal projects. See `projectlist.md` for active projects.

> Projects are moved here once `integrated` or `abandoned` for 3+ days.

## Integrated Projects

Projects that have been completed and validated in production.

```yaml
projects:
  - id: "0002"
    title: "Following System"
    summary: "Notification subscription system allowing users to follow entities (organizations, projects, tasks, users)"
    status: integrated
    priority: medium
    files:
      spec: codev/specs/0002-following-system.md
      plan: codev/plans/0002-following-system.md
      review: codev/reviews/0002-following-system.md
    dependencies: []
    tags: [features, api, ui]
    notes: "Migrated from DAPPER (dev_docs/). Original implementation Aug 2025. Key insight: Following grants ZERO permissions - purely for notifications."

  - id: "0003"
    title: "Todo Quick Add"
    summary: "Fast keyboard-friendly todo creation with progressive disclosure for advanced options"
    status: integrated
    priority: medium
    files:
      spec: codev/specs/0003-todo-quick-add.md
      plan: codev/plans/0003-todo-quick-add.md
      review: codev/reviews/0003-todo-quick-add.md
    dependencies: []
    tags: [features, ui, ux]
    notes: "Migrated from DAPPER (dev_docs/). Original implementation Aug 2025. Key insight: Progressive disclosure pattern works well for power-user features."
```

## Terminal Projects

Projects that are paused or canceled.

```yaml
  # No terminal projects yet
```

---

*Archive last updated: 2026-01-04*
