# Privacy and Visibility Controls

## Overview
Add privacy controls to allow users to make projects, products, and posts either public or private, with appropriate authentication and authorization.

## Current State
All projects and products are currently public and visible to everyone. This limits use cases where users may want to:
- Work on private/internal projects
- Share sensitive or incomplete work with selected collaborators
- Create draft posts before publishing
- Maintain confidential business projects

## Features

### Visibility Levels
- **Public**: Visible to all users (current behavior)
- **Private**: Only visible to owner and invited collaborators
- **Draft**: Private state for incomplete content

### Access Control
- Project/product owners can invite specific users as collaborators
- Collaborators can have different permission levels (view, comment, edit)
- Private content excluded from public search results
- URL access requires authentication and authorization

### Posts Privacy
- Draft posts for work-in-progress content
- Private posts visible only to author
- Public posts (current behavior)

## Technical Implementation

### Database Schema Changes
- Add `visibility` enum field to projects, products, and posts tables
- Create `collaborators` table for private project access:
  - id, project_id/product_id, user_id, permission_level, invited_at
- Add `is_draft` boolean to posts table

### Authentication Requirements
- Middleware to check project/product visibility before rendering
- API route protection for private content
- User session validation for access control
- Invitation system for adding collaborators

### UI/UX Changes
- Privacy toggle in project/product creation forms
- Visibility indicators on project cards
- Collaborator management interface
- Private project dashboard section
- Access denied pages with clear messaging

## Security Considerations
- Ensure private content never appears in:
  - Public search results
  - Public API responses
  - RSS feeds or sitemaps
  - Social media previews
- Proper authorization checks on all API endpoints
- Audit trail for permission changes
- Rate limiting on invitation sending

## Implementation Priority
High - Essential for users who want to work on sensitive or incomplete projects while maintaining the public community aspect for completed work

## Migration Strategy
- Default all existing content to public visibility
- Provide clear communication about new privacy features
- Allow bulk privacy updates for existing content