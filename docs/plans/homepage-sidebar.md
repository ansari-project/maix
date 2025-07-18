# Homepage Sidebar Redesign - Minimal Implementation Plan

## Overview

This plan outlines a minimal implementation of the homepage feed redesign, focusing on the most essential features while maintaining Islamic design principles and cultural authenticity. The implementation prioritizes sidebar navigation with Settings integration for PAT management.

## Phase 1: Sidebar Navigation Foundation

### Design Requirements

**Islamic Design Principles:**
- Use geometric patterns respectfully in sidebar design
- Implement deep blue (#1E3A8A) for primary navigation
- Gold accents (#D97706) for active states
- Green (#059669) for community/growth features
- Maintain cultural authenticity through icon selection

**Navigation Structure:**
```
├── Dashboard Home (feed view)
├── My Profile
├── Browse Projects
├── Post Project
├── My Applications
├── Messages
├── Community
└── Settings (new)
    └── Personal Access Tokens
```

### Technical Implementation

**Components to Create:**
- `<Sidebar>` - Main navigation container
- `<SidebarItem>` - Individual navigation items
- `<SidebarSection>` - Section grouping (main navigation vs settings)
- `<SettingsPanel>` - Settings content area
- `<PATManagement>` - Personal Access Token management

**Responsive Behavior:**
- Desktop: Persistent sidebar (240px width)
- Tablet: Collapsible sidebar with overlay
- Mobile: Bottom drawer/overlay navigation

### Icons and Visual Elements

**Islamic-appropriate iconography:**
- Dashboard: Grid/squares pattern
- Profile: User circle
- Projects: Geometric hexagon
- Applications: Document/list
- Messages: Speech bubble
- Community: People/group
- Settings: Gear/cog
- PAT: Key/lock combination

## Phase 2: Settings Panel with PAT Management

### Settings Navigation

**Settings Structure:**
```
Settings Panel
├── Account Settings
├── Privacy & Security
├── Personal Access Tokens (new)
├── Notifications
└── Help & Support
```

### PAT Management Features

**Core Functionality:**
- Create new PAT with name and optional expiration
- View existing PATs (creation date, last used, expiration)
- Revoke/delete PATs
- Copy PAT token (one-time display)
- Usage instructions for Claude Code integration

**Security Features:**
- Token shown only once upon creation
- Confirmation dialog for deletion
- Clear expiration warnings
- Usage tracking display

### UI Components

**PAT Management Interface:**
```typescript
interface PATManagementProps {
  tokens: PersonalAccessToken[];
  onCreateToken: (name: string, expiresAt?: Date) => void;
  onRevokeToken: (id: string) => void;
}
```

**Modal/Dialog Components:**
- Create PAT dialog with name input and expiration options
- Display new PAT dialog (one-time token reveal)
- Confirm deletion dialog
- Claude Code setup instructions modal

## Phase 3: Minimal Feed Implementation

### Feed Content Types (Minimal)

**Priority 1 - Project Activity:**
- New projects posted
- Project status updates
- Application status changes

**Priority 2 - Personal Activity:**
- Your application updates
- Recommended projects based on skills
- Messages received

**Priority 3 - Community Activity:**
- New volunteer registrations
- Community discussions
- Success stories

### Feed UI Components

**Feed Structure:**
```typescript
interface FeedItem {
  id: string;
  type: 'project' | 'personal' | 'community';
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
  actionUrl?: string;
}
```

**Feed Components:**
- `<FeedContainer>` - Main feed wrapper
- `<FeedItem>` - Individual feed entries
- `<FeedFilter>` - Simple filter buttons
- `<FeedLoader>` - Loading states

### Islamic Community Values Integration

**Content Guidelines:**
- All feed items must align with Islamic values
- Promote beneficial knowledge sharing
- Highlight Ummah benefit over individual gain
- Respect cultural sensitivities in language and imagery

**Community Features:**
- Success stories that inspire Islamic entrepreneurship
- Project updates that benefit the Muslim community
- Knowledge sharing opportunities
- Collaborative project highlights

## Implementation Phases

### Phase 1: Sidebar & Layout Foundation
- [ ] Create Next.js 14 App Router layout with persistent sidebar
- [ ] Implement responsive sidebar with shadcn/ui Sheet component
- [ ] Build composed navigation with NavMenu and UserProfile
- [ ] Add Settings button to UserProfile section
- [ ] Implement Islamic color scheme and responsive behavior

### Phase 2: Minimal Viable Feed
- [ ] Query existing Project, Application, and PAT models directly with Prisma
- [ ] Create simple feed service to merge and sort recent activities
- [ ] Build FeedContainer with project creations and application submissions
- [ ] Implement basic pagination for feed items
- [ ] Add React Server Components for initial feed render

### Phase 3: Settings Panel & PAT Management
- [ ] Create Settings Dialog with shadcn/ui components
- [ ] Build complete PAT management lifecycle (create, list, revoke)
- [ ] Implement secure token creation with one-time display
- [ ] Add Claude Code integration instructions
- [ ] Create comprehensive token management API

### Phase 4: Feed Expansion & Polish
- [ ] Add profile updates and other activities to feed
- [ ] Implement infinite scroll for feed pagination
- [ ] Add optional polymorphic commenting system
- [ ] Create comprehensive TypeScript types and tests
- [ ] Mobile responsiveness and accessibility review

## Technical Specifications

### Database Schema Updates

**No new tables needed** - we'll use existing models:

**Existing Models for Feed:**
- `Project` - for project creation activities
- `Application` - for application submission activities  
- `PersonalAccessToken` - for PAT creation activities
- `User` - for profile update activities (when implemented)

**Optional: Polymorphic Comments System (Phase 4):**
```prisma
model Comment {
  id        String   @id @default(cuid())
  content   String
  createdAt DateTime @default(now())
  
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  
  // Polymorphic references
  entityType String  // "project", "application", "profile"
  entityId   String  // ID of the entity being commented on
  
  // Threading support
  parentId   String?
  parent     Comment? @relation("CommentReplies", fields: [parentId], references: [id])
  replies    Comment[] @relation("CommentReplies")
  
  @@index([entityType, entityId])
  @@index([authorId])
}
```

### API Endpoints

**Feed Endpoints:**
- `GET /api/feed` - Get recent activity from existing models
- `GET /api/feed?type=projects` - Filter feed by activity type
- `GET /api/feed?page=2` - Simple pagination support

**PAT Management Endpoints:**
- `GET /api/auth/tokens` - List user's PATs
- `POST /api/auth/tokens` - Create new PAT
- `DELETE /api/auth/tokens/[id]` - Revoke PAT

**Comments Endpoints (Phase 4):**
- `GET /api/comments?entityType=project&entityId=123` - Get comments for entity
- `POST /api/comments` - Create new comment
- `DELETE /api/comments/[id]` - Delete comment

### Simple Feed Implementation

**Feed Service Example:**
```typescript
// lib/services/feed.service.ts
export async function getFeedItems(limit = 20, page = 1) {
  const skip = (page - 1) * limit;
  
  // Query existing models directly
  const [projects, applications, pats] = await Promise.all([
    prisma.project.findMany({
      take: limit,
      skip,
      orderBy: { createdAt: 'desc' },
      include: { owner: { select: { id: true, name: true } } }
    }),
    prisma.application.findMany({
      take: limit,
      skip,
      orderBy: { createdAt: 'desc' },
      include: { 
        user: { select: { id: true, name: true } },
        project: { select: { id: true, title: true } }
      }
    }),
    prisma.personalAccessToken.findMany({
      take: limit,
      skip,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true } } }
    })
  ]);
  
  // Transform to unified format
  const feedItems = [
    ...projects.map(p => ({
      id: p.id,
      type: 'project_created' as const,
      title: `New project: ${p.title}`,
      timestamp: p.createdAt,
      user: p.owner,
      data: p
    })),
    ...applications.map(a => ({
      id: a.id,
      type: 'application_submitted' as const,
      title: `${a.user.name} applied to ${a.project.title}`,
      timestamp: a.createdAt,
      user: a.user,
      data: a
    })),
    ...pats.map(p => ({
      id: p.id,
      type: 'pat_created' as const,
      title: `${p.user.name} created API token "${p.name}"`,
      timestamp: p.createdAt,
      user: p.user,
      data: p
    }))
  ];
  
  // Sort by timestamp
  return feedItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
```

### Component Architecture

**Sidebar Component Structure:**
```typescript
interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  currentPath: string;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType;
  isActive?: boolean;
  badge?: number;
}
```

**Settings Panel Structure:**
```typescript
interface SettingsPanelProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}
```

## Islamic Design Implementation

### Color Usage
- **Primary Blue (#1E3A8A)**: Navigation items, headers
- **Gold (#D97706)**: Active states, important actions
- **Green (#059669)**: Success states, community features
- **Neutral (#374151)**: Text, secondary elements
- **Background (#F9FAFB)**: Page backgrounds
- **Surface (#FFFFFF)**: Card/panel backgrounds

### Typography
- **Headers**: Use appropriate font weights for hierarchy
- **Body Text**: Ensure readability with proper contrast
- **RTL Support**: Plan for future Arabic content support

### Cultural Considerations
- **Geometric Patterns**: Subtle use in sidebar dividers
- **Respectful Iconography**: Avoid religious symbols
- **Community Focus**: Emphasize collective benefit
- **Knowledge Sharing**: Promote beneficial learning

## Success Metrics

### User Experience
- Sidebar navigation adoption rate
- Settings panel engagement
- PAT creation and usage rates
- Feed interaction metrics

### Technical Performance
- Page load times with sidebar
- API response times for feed
- Mobile responsiveness scores
- Accessibility compliance

### Community Impact
- Project discovery through feed
- Community engagement metrics
- Knowledge sharing activity
- Collaborative project success

## Risk Mitigation

### Technical Risks
- **Performance**: Implement lazy loading for feed
- **Mobile UX**: Thorough responsive testing
- **Data Privacy**: Secure PAT management
- **Scalability**: Efficient feed queries

### Cultural Risks
- **Design Authenticity**: Community feedback loops
- **Content Appropriateness**: Clear guidelines
- **Accessibility**: WCAG 2.1 AA compliance
- **Internationalization**: Future Arabic support

## Future Enhancements

### Phase 2 Features
- Real-time feed updates
- Advanced filtering options
- Feed customization settings
- Mobile app integration

### Islamic Features
- Prayer time awareness
- Islamic calendar integration
- Halal project certification
- Community recognition system

## Conclusion

This minimal implementation focuses on the most impactful features while maintaining Islamic design principles and cultural authenticity. The sidebar navigation provides improved information architecture, while the Settings panel with PAT management enables secure MCP integration. The basic feed implementation creates a foundation for future community engagement features.

The phased approach ensures steady progress while allowing for user feedback and iteration. Each phase builds upon the previous work, creating a cohesive and culturally appropriate user experience that serves the Muslim tech community effectively.