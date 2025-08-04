# Unauthenticated Read-Only Access Proposal

## Overview

This proposal outlines a strategy for providing read-only access to MAIX content without requiring user authentication. This would make the platform fully searchable and discoverable, allowing potential volunteers to explore projects, products, and Q&A before signing up.

## Objectives

1. **Full searchability** - Make projects, products, and Q&A searchable via public interfaces
2. **Lower barriers to entry** - Let potential volunteers browse and search before committing
3. **Showcase community knowledge** - Display the valuable Q&A and project information
4. **Maintain privacy** - Protect sensitive user information while sharing content

## Proposed Public Access Areas

### 1. Public Landing Page (Enhanced)
- Platform overview and mission
- Search bar for projects, products, and Q&A
- Featured projects and recent questions
- Call-to-action to join

### 2. Projects Directory (Full Content)
- **Public fields:**
  - Project name
  - Full description
  - Full goal
  - Project type (advice, prototype, MVP, complete product)
  - Help type needed
  - Required skills
  - Number of volunteers needed
  - Creation date
- **Hidden fields:**
  - Contact information
  - Budget information
  - Owner email (show name only or "Anonymous")
  - Volunteer applications

### 3. Products Showcase (Full Content)
- **Public fields:**
  - Product name
  - Full description
  - Number of associated projects
  - Product website
  - Associated public projects
- **Hidden fields:**
  - Owner email (show name only or "Anonymous")
  - Internal management features

### 4. Questions & Answers (Full Content)
- **Public fields:**
  - Question title and full content
  - All answers with full content
  - Vote counts
  - Best answer indicator
  - Creation dates
  - Author names (or "Anonymous" if preferred)
- **Hidden fields:**
  - Author emails
  - Edit/delete capabilities
  - Voting ability (requires login)

### 5. Public Search
- Unified search across projects, products, and Q&A
- Filter by type (project, product, question, answer)
- Filter by project type, skills, etc.
- Sort by relevance, date, popularity

## Implementation Approach

### Phase 1: Basic Public Routes
1. Create public layout wrapper without auth requirements
2. Implement `/public/projects` route with full data
3. Add `/public/products` showcase
4. Add `/public/questions` for Q&A browsing
5. Create `/public/search` with filters

### Phase 2: SEO and Discovery
1. Add proper meta tags for all public pages
2. Implement sitemap.xml generation
3. Add structured data (JSON-LD) for better search results
4. Create robots.txt with appropriate rules

### Phase 3: Privacy Controls
1. Add "public visibility" toggle to projects/products/questions
2. Add "show as anonymous" option for Q&A
3. Create separate API endpoints for public data
4. Implement opt-out mechanisms

### Phase 4: Enhanced Search
1. Full-text search across all content types
2. Advanced filters and sorting
3. Search suggestions and autocomplete
4. Related content recommendations

## Technical Implementation

### Route Structure
```
/public
  /projects          - Browse all public projects
  /projects/[id]     - View single project (full info)
  /products          - Browse all public products
  /products/[id]     - View single product (full info)
  /questions         - Browse all Q&A
  /questions/[id]    - View question with answers
  /search            - Unified search interface
  /about             - Platform information
```

### Data Access Pattern
```typescript
// Public data access - no truncation
export function publicDataFilter(data: any, type: 'project' | 'product' | 'question') {
  if (type === 'project') {
    return {
      id: data.id,
      name: data.name,
      description: data.description, // Full content
      goal: data.goal, // Full content
      helpType: data.helpType,
      projectType: data.projectType,
      requiredSkills: data.requiredSkills,
      volunteersNeeded: data.volunteersNeeded,
      createdAt: data.createdAt,
      isActive: data.isActive,
      owner: {
        name: data.showOwnerName ? data.owner.name : 'Anonymous',
        // Never expose email
      }
    }
  }
  // Similar for products and questions
}
```

### Search Implementation
```typescript
// Unified search across all content types
export async function publicSearch(query: string, filters: SearchFilters) {
  const [projects, products, questions] = await Promise.all([
    searchProjects(query, filters),
    searchProducts(query, filters),
    searchQuestions(query, filters)
  ])
  
  return {
    projects,
    products,
    questions,
    total: projects.length + products.length + questions.length
  }
}
```

## Privacy and Ethical Considerations

### User Consent
- Add visibility options during content creation:
  - "Make publicly visible" (default: true for new content)
  - "Show my name publicly" (default: true, can choose anonymous)
- Allow users to change visibility settings anytime
- Bulk visibility management in user settings

### Data Protection
- Never expose email addresses
- Optional anonymous posting for Q&A
- No personal contact information
- No financial/budget information

### Cultural Sensitivity
- Respect privacy preferences
- Allow anonymous contributions
- Clear indication when content is public

## Benefits

1. **For the Platform**
   - Full searchability and SEO benefits
   - Showcase community knowledge
   - Attract more volunteers and contributors

2. **For Content Creators**
   - Wider reach for projects
   - Build reputation through Q&A
   - Optional anonymity

3. **For Visitors**
   - Search and explore without barriers
   - Learn from Q&A
   - Find relevant opportunities

## Implementation Phases

### Phase 1: Foundation
- Public routes setup
- Basic project/product pages
- Privacy controls

### Phase 2: Q&A Integration
- Public questions page
- Answer visibility
- Anonymous options

### Phase 3: Search & Discovery
- Unified search
- SEO optimization
- Sitemap generation

### Phase 4: Polish
- Performance optimization
- Enhanced UI/UX
- Analytics integration

## Success Metrics

1. **Search & Discovery**
   - Search queries per day
   - Click-through rates
   - Time to first engagement

2. **Content Engagement**
   - Page views on public content
   - Conversion to registration
   - Content sharing rates

3. **Platform Growth**
   - New registrations from public pages
   - Questions asked after browsing
   - Projects created by new users

## Next Steps

1. Technical specification for public routes
2. Update privacy settings UI mockups
3. Implement Phase 1 MVP
4. User testing with select group
5. Iterate based on feedback