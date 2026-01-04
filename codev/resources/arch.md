# Architecture

High-level architecture documentation for Maix. Updated during implementation.

## Overview

> For full project description and philosophy, see [README.md](../../README.md).

Maix is an AI-native volunteer platform. This document covers technical architecture and implementation details.

## Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Framework** | Next.js 15 | App Router |
| **Database** | Neon PostgreSQL | pgvector extension for AI embeddings |
| **Auth** | NextAuth.js | Google OAuth |
| **AI** | Google Gemini | Via `@google/genai` package |
| **UI** | shadcn/ui | Radix + Tailwind |
| **ORM** | Prisma | Type-safe database access |

## Directory Structure

```
maix/
├── src/
│   ├── app/              # Next.js App Router (pages, API routes)
│   ├── components/       # UI components (shadcn/ui based)
│   │   ├── ui/          # Base shadcn/ui components
│   │   └── [feature]/   # Feature-specific components
│   ├── lib/              # Utilities, configs, helpers
│   │   ├── db.ts        # Prisma client
│   │   ├── auth.ts      # NextAuth configuration
│   │   └── ai/          # AI integration utilities
│   ├── hooks/            # Custom React hooks
│   ├── contexts/         # React contexts
│   ├── services/         # Business logic services
│   ├── emails/           # Email templates (React Email)
│   ├── types/            # TypeScript definitions
│   └── middleware.ts     # Next.js middleware
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── migrations/      # Migration history
├── tests/               # Test files
│   ├── unit/           # Unit tests
│   └── integration/    # Integration tests
├── scripts/             # Build and utility scripts
│   └── tmp/            # Temporary/one-off scripts
└── codev/               # Development methodology
    ├── specs/          # Feature specifications
    ├── plans/          # Implementation plans
    ├── reviews/        # Post-implementation reviews
    ├── protocols/      # Development protocols (TICK, SPIDER)
    └── resources/      # Reference docs, arch, lessons
```

## Key Components

### Authentication System

**Location**: `src/lib/auth.ts`, `src/app/api/auth/`

**Purpose**: User authentication via NextAuth.js with Google OAuth

**Key Patterns**:
- Session-based authentication
- Role-based access control (OWNER → ADMIN → MEMBER → VIEWER)
- Protected routes via middleware

### Project Management

**Location**: `src/app/projects/`, `src/lib/projects/`

**Purpose**: Core project lifecycle management

**Project States**:
- `AWAITING_VOLUNTEERS` - Seeking contributors
- `PLANNING` - Team assembled, planning work
- `IN_PROGRESS` - Active development
- `COMPLETED` - Project finished

**Dual Status System**:
- `status` - Lifecycle phase
- `isActive` - Whether recruiting volunteers (can be true even when IN_PROGRESS)

### Todo System

**Location**: `src/app/todos/`, `src/components/todos/`

**Purpose**: Task management with projects, drag-and-drop, grouping

**Key Features**:
- Quick-add with progressive disclosure
- Drag-and-drop reordering (@dnd-kit)
- Grouping by status/project/date
- Keyboard shortcuts (/, Ctrl+N, D, arrows)

### AI Assistant

**Location**: `src/lib/ai/`, `src/components/ai-assistant/`

**Purpose**: Natural language interface for platform interactions

**Key Patterns**:
- Lazy loading for performance
- Fallback to traditional UI when AI unavailable
- Google Gemini via @google/genai SDK

### Following System

**Location**: `src/lib/following/`, `src/app/api/following/`

**Purpose**: Notification subscriptions for entities

**Key Principle**: Following grants ZERO permissions - purely for notifications. Never mix with RBAC or Visibility systems.

## Three Orthogonal Systems

Critical architectural pattern - these systems must remain completely independent:

1. **RBAC System** - Controls what actions users can perform
   - Levels: OWNER → ADMIN → MEMBER → VIEWER

2. **Visibility System** - Controls what entities users can see
   - States: PUBLIC → PRIVATE → DRAFT

3. **Following System** - Controls notification subscriptions only
   - Grants ZERO permissions

**Key Pattern**: Never mix concerns. Following should NEVER check permissions, RBAC should NEVER check following status.

## Data Flow

```
User Request → Next.js App Router
                    ↓
              API Route Handler
                    ↓
              Service Layer (business logic)
                    ↓
              Prisma Client
                    ↓
              Neon PostgreSQL
```

### Key Data Patterns

- **Transactions**: Use Prisma transactions for multi-table operations
- **Error Handling**: Proper error handling with typed errors
- **Validation**: Zod schemas for input validation
- **Type Safety**: End-to-end TypeScript

## External Dependencies

| Dependency | Purpose | Documentation |
|------------|---------|---------------|
| Neon PostgreSQL | Serverless Postgres database | [neon.tech](https://neon.tech/docs) |
| Google Gemini | AI/LLM integration | [ai.google.dev](https://ai.google.dev/docs) |
| NextAuth.js | Authentication | [next-auth.js.org](https://next-auth.js.org) |
| Vercel | Hosting & deployment | [vercel.com/docs](https://vercel.com/docs) |
| Prisma | Database ORM | [prisma.io/docs](https://prisma.io/docs) |

## Configuration

### Environment Variables

Required in `.env`:
```
DATABASE_URL=           # Neon PostgreSQL connection string
NEXTAUTH_SECRET=        # NextAuth.js secret
NEXTAUTH_URL=           # Application URL
GOOGLE_CLIENT_ID=       # OAuth client ID
GOOGLE_CLIENT_SECRET=   # OAuth client secret
GOOGLE_AI_API_KEY=      # Gemini API key
```

### TypeScript Configuration

Two configs for different purposes:
- **`tsconfig.json`** - Development + tests (includes test files)
- **`tsconfig.build.json`** - CI/CD builds (excludes test files)

## Conventions

### Code Patterns

- **Progressive Disclosure**: Start simple, expand on user action
- **Adjacent Button Pattern**: Buttons next to inputs, not inside
- **Local State First**: Form state locally, sync on submission
- **Centralized Paths**: API paths in utility functions, not hardcoded

### Performance Patterns

- **Lazy Loading**: Optional features loaded on demand
- **React.memo**: For frequently re-rendered layout components
- **useMemo**: For expensive calculations and context values
- **Debounced Auto-save**: 2-second debounce for form changes

### Testing Patterns

- **Integration First**: 60% integration, 30% unit, 10% E2E
- **Real Database**: Use test database for service/API tests
- **Mock Only Externals**: Email, payments, third-party APIs

### Security Approach

Pragmatic security for a community platform:
- Input validation via Zod
- SQL injection prevention via Prisma
- XSS prevention via React
- Basic session management via NextAuth
- No complex CSRF/rate limiting (low-value target)

## Reference Documentation

- **Testing Strategy**: `codev/resources/ref/testing-strategy.md`
- **Integration Testing**: `codev/resources/ref/integration-testing.md`
- **Database Schema**: `prisma/schema.prisma`
- **Data Model**: `codev/resources/ref/maix-data-model.md`
- **AI SDK Usage**: `codev/resources/ref/google-genai-sdk-usage.md`
- **Prisma Safety**: `codev/resources/ref/prisma.md`
- **Debugging Playbook**: `codev/resources/ref/debugging-playbook.md`
- **Lessons Learned**: `codev/resources/lessons-learned.md`

---

*Updated: 2026-01-04*
*Source: Extracted from CLAUDE.md during codev adoption*
