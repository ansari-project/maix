# Unauthenticated Access - Minimal Implementation Plan

## Overview
Implement read-only public access to MAIX content, allowing visitors to browse and search projects, products, and Q&A without authentication.

## Phase 1: Foundation (MVP)

### 1. Public Layout and Middleware
- Create `/src/app/(public)/layout.tsx` without auth checks
- Update middleware to allow public routes
- Add basic public navigation header

### 2. Public Projects Page
- Route: `/public/projects`
- Display all active projects (full content)
- Basic filtering by project type and help type
- Link to individual project pages

### 3. Public Products Page
- Route: `/public/products`
- Display all products (full content)
- Show associated project count
- Link to individual product pages

### 4. Public Q&A Page
- Route: `/public/questions`
- Display all questions with answers
- Show vote counts and best answer
- Full content visibility

### 5. Individual Detail Pages
- `/public/projects/[id]` - Full project details
- `/public/products/[id]` - Full product details
- `/public/questions/[id]` - Question with all answers

### 6. Basic Search
- Route: `/public/search`
- Simple text search across all content types
- Filter by type (project/product/question)
- Use existing Prisma queries (no complex search initially)

## Implementation Order

1. **Public Layout & Routing** (30 min)
   - Create public layout without auth
   - Update middleware configuration
   - Add public navigation

2. **API Data Access** (45 min)
   - Create `/api/public/projects` endpoint
   - Create `/api/public/products` endpoint
   - Create `/api/public/questions` endpoint
   - Filter sensitive data (emails, budgets)

3. **List Pages** (1 hour)
   - Implement projects list page
   - Implement products list page
   - Implement Q&A list page

4. **Detail Pages** (45 min)
   - Project detail page
   - Product detail page
   - Question detail page

5. **Search** (30 min)
   - Basic search page
   - Simple text matching
   - Type filtering

## Data Privacy

### Public Fields
**Projects**: name, description, goal, type, help type, skills, volunteers needed, creation date
**Products**: name, description, website, project count, creation date
**Q&A**: question content, answers, vote counts, author names (not emails)

### Hidden Fields
- Email addresses
- Budget information
- Contact details
- Edit/delete capabilities

## Success Criteria
- Visitors can browse all content without login
- Search works across all content types
- No sensitive information exposed
- Clean, simple interface
- Fast page loads

## Future Enhancements (Not MVP)
- SEO optimization
- Sitemap generation
- Advanced search with filters
- Privacy controls per content
- Analytics tracking