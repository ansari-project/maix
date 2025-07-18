# CLAUDE.md - MAIX Project Instructions

## Project Overview

MAIX (Muslim AI Exchange) is a Next.js 14 application that connects Muslim volunteers with AI/tech projects. The platform uses modern web technologies with Islamic design principles to serve the Muslim tech community.

## Technology Stack

### Core Technologies
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **Database**: Neon (PostgreSQL with pgvector extension)
- **Authentication**: NextAuth.js with Google OAuth
- **Styling**: Tailwind CSS with Islamic design system
- **UI Components**: shadcn/ui (Radix UI + Tailwind primitives)
- **Deployment**: Vercel

### Key Libraries
- **Database ORM**: Prisma
- **Form Handling**: React Hook Form + Zod validation
- **State Management**: React Query/TanStack Query
- **Real-time**: Pusher or Ably (when implemented)
- **AI/ML**: Claude Sonnet 4 API for embeddings and natural language processing
- **Icons**: Lucide React
- **Animations**: Framer Motion

## Project Structure

```
maix/
├── src/
│   ├── app/              # Next.js 14 app router
│   │   ├── api/          # API routes
│   │   ├── auth/         # Authentication pages
│   │   ├── dashboard/    # User dashboard
│   │   ├── projects/     # Project management
│   │   └── search/       # Search functionality
│   ├── components/       # Reusable UI components
│   │   ├── ui/           # Basic UI components (Radix + Tailwind)
│   │   ├── forms/        # Form components
│   │   ├── layout/       # Layout components
│   │   └── islamic/      # Islamic-themed components
│   ├── lib/              # Utilities and configurations
│   │   ├── auth.ts       # NextAuth configuration
│   │   ├── db.ts         # Prisma client
│   │   ├── claude.ts     # Claude API client setup
│   │   └── utils.ts      # Utility functions
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript type definitions
│   └── styles/           # Global styles and themes
├── prisma/               # Database schema and seeds
├── public/               # Static assets
├── tests/                # Test files
└── docs/                 # Documentation
    ├── plans/            # Execution plans and roadmaps
    ├── guides/           # Extracted wisdom on how to use tools and features
    ├── howtos/           # Step-by-step instructions for users
    ├── faqs/             # Frequently asked questions
    ├── ideas/            # Ideas still in incubation
    └── ref/              # Reference material and API documentation
```

## Development Guidelines

### Project Management
- **Phase-Based Development**: We organize work into phases, not time-based estimates
- **Phases represent logical completion points**: Each phase delivers working functionality
- **No week/time estimates**: Focus on completion criteria rather than duration
- **Sequential phases**: Complete one phase before moving to the next

### Code Style
- Use TypeScript strict mode
- Follow meaningful naming conventions that reflect positive impact
- Use descriptive, meaningful variable names
- Prefer functional components with hooks
- Use proper TypeScript types (avoid `any`)

### Git Commit Guidelines
- **NEVER include "Generated with Claude Code" or "Co-Authored-By: Claude" in commit messages**
- Use descriptive commit messages that explain the purpose of changes
- Keep commit messages concise and focused on the changes made
- Group related changes into a single commit
- Use `git add [specific files]` rather than `git add --all` or `git add .`

### Pre-Commit Checklist

To ensure code quality and prevent deployment failures, always perform the following steps before committing changes:

1. **Local Validation:**
   - Run `npm run build` to ensure no TypeScript or build errors
   - Run `npm run test` to ensure all tests pass
   - Fix any errors found during build or test

2. **Gemini Code Review:**
   - After successful local validation, use the `mcp__zen__chat` tool to request a code review from Gemini
   - This provides an additional layer of scrutiny for logic, design, and best practices
   - **Note**: Gemini tends to suggest overcomplication and optimizations that aren't important at our MVP stage
   - Focus on addressing critical issues (bugs, security, major design flaws) rather than all suggestions
   - Remember our principle: bias towards simple solutions for current problems

3. **Never push code that fails to build or has failing tests**

**Enforcement**: 
- A git pre-commit hook (`.husky/pre-commit`) automatically runs build and test checks
- Commits will be blocked if build or tests fail
- This ensures the checklist is followed reliably and prevents manual oversight

### Simplicity and Pragmatism
- **Bias towards simple solutions**: Address problems we currently have, not hypothetical future scaling issues
- **Avoid premature optimization**: Don't implement complex patterns for problems that don't exist yet
- **Use straightforward Prisma queries**: Query existing models directly rather than complex abstraction layers
- **Focus on current scale**: Design for the data and usage patterns we have today
- **Iterative complexity**: Add architectural complexity only when simple solutions prove insufficient

### Performance and Security Priorities
- Rate limiting is NOT a priority for this project
- Focus on input validation and data security over traffic management
- Prioritize user experience and functionality over restrictive controls

### Database Operations
- Always use Prisma for database operations
- Use transactions for multi-table operations
- Implement proper error handling
- Use connection pooling for performance

### Authentication
- All protected routes must use NextAuth.js
- Implement role-based access control
- Validate user sessions on API routes
- Use proper CSRF protection

### API Routes
- Follow RESTful conventions
- Use proper HTTP status codes
- Validate all input with Zod schemas
- Handle errors gracefully

### UI/UX Guidelines
- Follow Islamic design principles
- Use the defined color palette
- Implement RTL support for Arabic content
- Ensure accessibility (WCAG 2.1 AA)
- Use semantic HTML elements

## Islamic Design System

### Color Palette
```typescript
const islamicColors = {
  primary: '#1E3A8A',    // Deep blue - knowledge and wisdom
  secondary: '#D97706',  // Gold - prosperity and success
  accent: '#059669',     // Green - growth and harmony
  neutral: '#374151',    // Dark gray - stability
  background: '#F9FAFB', // Light gray - purity
  surface: '#FFFFFF'     // White - simplicity
};
```

### Typography
- Use Noto Sans Arabic for Arabic text
- Use Inter for English text
- Implement proper RTL support
- Use appropriate font weights

### Components
- Create reusable Islamic-themed components
- Use geometric patterns respectfully
- Avoid religious symbols
- Maintain cultural sensitivity

## Database Schema

### Key Tables
- `users`: User profiles with expertise and availability
- `projects`: Project details with embeddings for search
- `organizations`: Non-profit organizations
- `applications`: Volunteer applications to projects
- `reviews`: User ratings and feedback

### Important Fields
- `projects.embedding`: Vector(1536) for semantic search
- `users.expertise`: JSONB array of skills
- `projects.type`: Enum (advice, prototype, mvp, complete_product)

## API Endpoints

### Authentication
- `/api/auth/[...nextauth]`: NextAuth.js endpoints
- `/api/auth/session`: Get current session

### Users
- `/api/users/profile`: User profile management
- `/api/users/[id]`: User details
- `/api/users/skills`: Skills management

### Projects
- `/api/projects`: List and create projects
- `/api/projects/[id]`: Project details
- `/api/projects/search`: Search projects
- `/api/projects/[id]/applications`: Project applications

### Matching
- `/api/matching/recommendations`: Get project recommendations
- `/api/matching/similar`: Find similar projects

## Environment Variables

### Required Variables
```env
DATABASE_URL="postgresql://username:password@ep-xxx.neon.tech/neondb"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
ANTHROPIC_API_KEY="your-anthropic-api-key"
```

### Optional Variables
```env
PUSHER_APP_ID="your-pusher-app-id"
PUSHER_KEY="your-pusher-key"
PUSHER_SECRET="your-pusher-secret"
SENTRY_DSN="your-sentry-dsn"
```

## Common Tasks

### Adding New API Route
1. Create file in `src/app/api/`
2. Implement proper authentication
3. Add Zod validation schemas
4. Handle errors appropriately
5. Add TypeScript types

### Creating New Component
1. Place in appropriate `components/` subdirectory
2. Use TypeScript with proper props interface
3. Follow Islamic design principles
4. Add proper accessibility attributes
5. Include JSDoc comments

### Database Changes
1. Update Prisma schema
2. Generate migration: `npx prisma migrate dev`
3. Update TypeScript types
4. Update seed data if needed

### Adding New Search Feature
1. Update project embeddings if needed
2. Modify search API endpoint
3. Update search UI components
4. Test with various query types

## Testing

### Unit Tests
- Use Jest + React Testing Library
- Test components in isolation
- Mock external dependencies
- Test edge cases and error states

### Integration Tests
- Use Playwright for E2E testing
- Test user journeys
- Verify authentication flows
- Test search functionality

### Database Tests
- Test Prisma operations
- Verify data integrity
- Test performance with large datasets

## Performance Considerations

### Database
- Use proper indexing for search queries
- Implement connection pooling
- Use pagination for large datasets
- Monitor query performance

### Frontend
- Implement proper code splitting
- Use Next.js Image optimization
- Implement proper caching strategies
- Monitor Core Web Vitals

### AI/ML
- Cache embedding results
- Implement rate limiting for OpenAI API
- Use batch processing for bulk operations
- Monitor API usage and costs

## Security Guidelines

### Authentication
- Validate all user inputs
- Use CSRF protection
- Implement proper session management
- Use secure cookie settings

### Database
- Use parameterized queries (Prisma handles this)
- Implement proper access controls
- Validate data integrity
- Monitor for suspicious activity

### API Security
- Rate limit API endpoints
- Validate request headers
- Implement proper CORS settings
- Log security events

## Deployment

### Environment Setup
1. Set up Neon database
2. Configure Vercel project
3. Set environment variables
4. Enable pgvector extension

### Deployment Process
1. Run tests locally
2. Build and test production bundle
3. Deploy to Vercel
4. Verify deployment health

## Monitoring

### Application Monitoring
- Use Vercel Analytics
- Monitor API response times
- Track user engagement
- Monitor error rates

### Database Monitoring
- Monitor query performance
- Track database size growth
- Monitor connection usage
- Set up alerts for issues

## Islamic Considerations

### Content Guidelines
- All projects must align with Islamic values
- No inappropriate content or imagery
- Respect cultural sensitivities
- Promote beneficial knowledge sharing

### Design Principles
- Use Islamic geometric patterns respectfully
- Avoid religious symbols in UI
- Maintain cultural authenticity
- Consider prayer times in scheduling features

### Community Values
- Prioritize Ummah benefit over profit
- Promote knowledge sharing
- Build trust through transparency
- Foster collaborative spirit

## Common Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build production bundle
npm run type-check   # TypeScript validation
npm run lint         # ESLint checking
```

### Database
```bash
npx prisma migrate dev    # Create and apply migration
npx prisma db push       # Push schema changes
npx prisma studio        # Open database GUI
npx prisma db seed       # Seed database
```

### Testing
```bash
npm run test            # Run unit tests
npm run test:watch      # Watch mode
npm run test:e2e        # End-to-end tests
```

## Troubleshooting

### Common Issues
1. **Database connection errors**: Check DATABASE_URL format
2. **Authentication failures**: Verify Google OAuth setup
3. **Build errors**: Run type-check and fix TypeScript errors
4. **API rate limits**: Implement proper caching and rate limiting

### Debug Tips
- Use Next.js built-in debugging
- Check Vercel function logs
- Monitor database query performance
- Use browser dev tools for frontend issues

## Resources

### Documentation
- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Neon Documentation](https://neon.tech/docs)

### Community
- GitHub Issues for bug reports
- GitHub Discussions for feature requests
- README.md for general project information

### Project Documentation Structure
- `docs/plans/`: Execution plans and roadmaps
- `docs/guides/`: Extracted wisdom on how to use tools and features
- `docs/howtos/`: Step-by-step instructions for users
- `docs/faqs/`: Frequently asked questions
- `docs/ideas/`: Ideas still in incubation
- `docs/ref/`: Reference material and API documentation

## Notes for Claude Code

### When Working on This Project
1. Always follow Islamic principles and values
2. Use the defined color palette and design system
3. Implement proper TypeScript typing
4. Follow the established project structure
5. Write tests for new functionality
6. Consider performance implications
7. Maintain cultural sensitivity
8. Use Neon-specific PostgreSQL features when appropriate
9. Follow the database schema design patterns
10. Implement proper error handling and user feedback

### Priority Areas
1. **User Experience**: Ensure intuitive and culturally appropriate interface
2. **Performance**: Optimize database queries and API responses
3. **Security**: Implement proper authentication and data validation
4. **Scalability**: Design for growth and increased usage
5. **Community**: Build features that foster collaboration and trust

This file serves as a comprehensive guide for developing and maintaining the MAIX platform while adhering to Islamic values and modern web development best practices.