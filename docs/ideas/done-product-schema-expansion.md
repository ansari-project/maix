# Product Schema Expansion

## Overview
Broaden the database schema to include products as distinct entities, allowing projects to be associated with products.

## Rationale
Many projects are feature additions, bug fixes, or enhancements to existing products rather than standalone initiatives. This relationship should be captured in our data model.

## Schema Changes
- New `products` table with fields:
  - id, name, description, owner_id
  - website_url, repository_url
  - product_type (web_app, mobile_app, api, library, etc.)
  - status (active, maintenance, deprecated)
  - created_at, updated_at

- Update `projects` table:
  - Add optional `product_id` foreign key
  - Distinguish between product-related and standalone projects

## Use Cases
- "Add dark mode to Islamic prayer app"
- "Fix bug in donation tracking feature"
- "Implement Arabic RTL support for existing platform"
- "Add AI-powered Quran search to mobile app"

## Benefits
- Better project categorization
- Product portfolio tracking for users
- Enhanced search and filtering capabilities
- Clearer project context and scope

## Implementation Considerations
- Migration strategy for existing projects
- UI updates for project creation flow
- Search algorithm adjustments
- Product-specific analytics and reporting

## Implementation Priority
High - Would significantly improve project organization and user understanding