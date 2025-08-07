# Event Manager Feature Design

## Overview

Event Manager is an AI-first application within Maix that enables non-profit organizations (NFPs) to efficiently organize and manage events. The system uses a Gemini-powered MCP client architecture to provide intelligent event planning assistance while leveraging all existing Maix infrastructure through the MCP protocol.

### Key Architecture Decision: Vercel AI SDK with MCP Integration

After thorough analysis, we're using the Vercel AI SDK's built-in MCP client because:
- **Built-in MCP Support**: Vercel AI SDK v4.2+ includes `experimental_createMCPClient`
- **Zero Protocol Translation**: AI SDK handles MCP ↔ Gemini tool format conversion automatically
- **Native Streaming**: Seamless integration with Gemini streaming via `streamText`
- **HTTP/SSE Support**: Works directly with the existing Maix HTTP MCP server
- **Production Ready**: Already used by Zapier, Vapi, and other production apps

## Requirements

### Functional Requirements
- **AI-Powered Event Planning**: Conversational interface to guide event organization
- **Task Management**: Integration with Maix's existing todo system for event tasks
- **Event Details Management**: Venue selection, speaker coordination, catering arrangement
- **Registration System**: RSVP and registration management
- **Publicity Tools**: Event promotion and communication features
- **Organization Scoping**: Events belong to organizations, not individual users

### Non-Functional Requirements
- **Integration**: Maximize reuse of existing Maix infrastructure
- **Simplicity**: Follow Maix's bias towards simple solutions
- **Cultural Sensitivity**: Respect community values and practices
- **Accessibility**: Support both English and Arabic interfaces

## Architecture

### Simplified Architecture with Vercel AI SDK

```
┌─────────────────────────────────────────────────────┐
│                   Event Manager UI                   │
│  ┌─────────────────┐  ┌──────────────────────────┐ │
│  │   AI Assistant   │  │     Task Dashboard       │ │
│  │  (useChat hook)  │  │   (Live Updates)         │ │
│  └─────────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                            │
                       Streaming
                            ▼
┌─────────────────────────────────────────────────────┐
│          Next.js API Route + Vercel AI SDK          │
│  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │ streamText with │  │ experimental_createMCP  │  │
│  │ Gemini + Tools  │  │ Client (built-in)       │  │
│  └─────────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                            │
                    SSE Transport
                            ▼
┌─────────────────────────────────────────────────────┐
│              Existing Maix MCP Server                │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐   │
│  │  10+ Tools│  │  Events  │  │  All existing  │   │
│  │  (todos,  │  │  Tools   │  │  Maix tools    │   │
│  │  posts...)│  │  (new)   │  │                │   │
│  └──────────┘  └──────────┘  └────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Key Architecture Benefits
- **Minimal Code**: Vercel AI SDK handles all the complexity
- **Native Integration**: Built-in MCP client with automatic tool conversion
- **Streaming by Default**: `streamText` provides real-time responses
- **Production Tested**: Same approach used by Zapier, Vapi, etc.

### Component Integration

#### 1. Existing Maix Components to Reuse

**Todo System Integration**
- Extend existing Todo model to include `eventId` field
- Reuse todo permission patterns (creator, assignee, org members)
- Use existing todo UI components with event context
- Leverage `hasResourceAccess` utility for permissions

**Post System Integration**
- Add new PostType enums: `EVENT_UPDATE`, `EVENT_DISCUSSION` 
- Events can have discussion threads (like projects)
- Event updates posted by organizers
- Reuse existing post components and markdown rendering

**Organization & User System**
- Events belong to organizations (required)
- Leverage existing OrganizationMember roles
- Speaker management via existing user profiles
- Reuse user search/selection components

**Authentication & Permissions**
- Use existing NextAuth.js setup unchanged
- Permission model: `isOrgMember || isEventOrganizer`
- Reuse `hasResourceAccess` patterns from projects

#### 2. New Components

**Event Model**
```typescript
interface Event {
  id: string
  organizationId: string
  name: string
  description: string
  date: DateTime
  venue?: {
    name: string
    address: string
    capacity: number
  }
  status: EventStatus
  createdBy: string
  todos: Todo[] // Linked todos
  registrations: Registration[]
}

enum EventStatus {
  DRAFT = "DRAFT",
  PLANNING = "PLANNING", 
  PUBLISHED = "PUBLISHED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED"
}
```

**Registration Model**
```typescript
interface Registration {
  id: string
  eventId: string
  userId?: string // Optional for non-Maix users
  email: string
  name: string
  status: RegistrationStatus
  metadata?: JsonValue // Flexible field for custom data
}
```

### Gemini Integration with Vercel AI SDK

**Implementation with Built-in MCP Support**:
```typescript
// app/api/events/[eventId]/chat/route.ts
import { experimental_createMCPClient, streamText } from 'ai'
import { google } from '@ai-sdk/google'
import { auth } from '@/lib/auth'
import { getPatForUser } from '@/lib/mcp/pat-manager'

// Cache MCP clients per user
const mcpClients = new Map<string, Awaited<ReturnType<typeof experimental_createMCPClient>>>()

async function getMCPClient(userId: string) {
  // Check cache first
  if (mcpClients.has(userId)) {
    return mcpClients.get(userId)!
  }

  // Get user's PAT from encrypted storage
  const patToken = await getPatForUser(userId)
  
  if (!patToken) {
    throw new Error('MCP_NOT_CONFIGURED')
  }

  // IMPORTANT: Use HTTP transport, not SSE
  // The Maix MCP server uses mcp-handler which only supports HTTP
  const client = await experimental_createMCPClient({
    transport: {
      type: 'http',  // Changed from 'sse' to 'http'
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/mcp`,
      headers: {
        'Authorization': `Bearer ${patToken}`,
        'Content-Type': 'application/json'
      }
    }
  })

  // Cache for this user
  mcpClients.set(userId, client)
  return client
}

export async function POST(req: Request) {
  const { messages, eventId } = await req.json()
  const session = await auth()
  
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  try {
    // Get MCP client with user's PAT
    const client = await getMCPClient(session.user.id)
    const tools = await client.tools()
    
    // Stream with Gemini + MCP tools
    const result = await streamText({
      model: google('gemini-2.0-flash'),
      messages,
      tools,  // AI SDK handles all format conversion!
      system: `You are an AI event planning assistant helping organize an event (ID: ${eventId}). 
               Use the available tools to manage todos, create posts, and handle registrations.
               You are acting on behalf of user ${session.user.name || session.user.email}.`,
      maxSteps: 10, // Allow multiple tool calls in sequence
    })
    
    // Return streaming response
    return result.toDataStreamResponse()
  } catch (error) {
    if (error.message === 'MCP_NOT_CONFIGURED') {
      return new Response(
        JSON.stringify({ 
          error: 'MCP_NOT_CONFIGURED',
          message: 'Please configure your MCP access token in settings'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    console.error('Event chat error:', error)
    return new Response('Failed to process request', { status: 500 })
  }
}
```

**Key AI Capabilities**:
- Venue selection assistance
- Speaker coordination (including non-platform speakers)
- Catering and dietary requirement planning
- Registration setup and management
- Publicity and promotion strategies
- Timeline and milestone tracking
- Budget considerations (metadata only, no financial processing)

### Library & Framework Choices

#### UI Components
- **shadcn/ui**: Already in use for all UI components
- **Radix UI**: Underlying primitives (via shadcn)
- **Tailwind CSS**: Styling framework (existing)
- **Lucide React**: Icons (already integrated)

#### Chat Interface
- **Custom chat component**: Build with existing Card components
- **Markdown rendering**: Use existing `<Markdown>` component
- **Message history**: Store in database, paginate with React Query
- **No streaming needed**: Server returns complete responses

#### State Management  
- **React Query (TanStack Query)**: Server state (already in use)
- **React Hook Form + Zod**: Form handling (existing pattern)
- **Local state**: useState/useReducer for UI state only

#### AI & MCP Integration
- **Vercel AI SDK**: Complete solution for AI + MCP + Streaming
- **@ai-sdk/google**: Official Gemini provider for AI SDK
- **Built-in MCP Client**: `experimental_createMCPClient` handles everything
- **Automatic Conversion**: No manual tool format conversion needed

#### Required Dependencies
```json
{
  "dependencies": {
    "ai": "^4.2.0",              // Vercel AI SDK with MCP support
    "@ai-sdk/google": "^1.0.0",  // Gemini provider
    "react": "^18.3.0",
    "next": "^15.0.0"
  }
}
```

#### Streaming Architecture
- **Gemini Streaming**: Via AI SDK's `streamText` function
- **Client Streaming**: `useChat` hook handles all complexity
- **Tool Updates**: Real-time UI updates as tools are called
- **Error Recovery**: Built-in retry and error handling

#### Task Dashboard
- **Reuse Todo components**: Adapt existing todo UI with event context
- **Live Updates**: SSE connection for real-time task updates
- **Categories**: Event-specific task categories (venue, speakers, logistics)

### User Interface

**Two-Panel Layout**:
1. **Left Panel**: AI Assistant Chat
   - Natural conversation flow
   - Contextual suggestions
   - Quick actions from chat

2. **Right Panel**: Task Dashboard
   - Categorized todo lists
   - Progress indicators
   - Quick task actions
   - Event timeline view

## Implementation Plan

### Phase 1: Core Infrastructure
- Extend Prisma schema for Event, Registration, and EventSpeaker models
- Add event-specific MCP tools to existing server
- Create basic CRUD APIs for events
- Implement organization-scoped event access

### Phase 2: AI Integration with Vercel AI SDK
- Set up API route with `experimental_createMCPClient`
- Configure HTTP transport to connect to Maix MCP server
- Implement PAT storage and retrieval system
- Implement `streamText` with Gemini for tool calling
- Add conversation persistence in EventConversation model

### Phase 3: User Interface
- Build two-panel responsive layout
- Implement EventChat component with `useChat` hook
- Integrate existing TodoList component with event context
- Add real-time updates as AI creates todos

### Phase 4: Registration & Speaker Management
- Build registration CRUD operations
- Implement speaker management (platform and non-platform)
- Add attendee communication tools
- Create registration summary components

### Phase 5: Enhancement Features
- Event templates for common types
- Automatic publicity post generation
- Advanced speaker coordination
- Post-event feedback collection

## Technical Considerations

### Database Extensions

```prisma
// Add to existing schema.prisma

model Event {
  id              String   @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  name            String
  description     String   @db.Text // Markdown content
  date            DateTime
  venueJson       Json?    // Venue details
  status          EventStatus @default(DRAFT)
  createdBy       String
  creator         User     @relation(fields: [createdBy], references: [id])
  
  // Integration with existing systems
  todos           Todo[]   @relation("EventTodos")
  posts           Post[]   @relation("EventPosts")
  registrations   Registration[]
  // speakers     EventSpeaker[]  // Deferred to Phase 2
  conversations   EventConversation[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([organizationId, status])
  @@map("events")
}

// Extend existing Todo model
model Todo {
  // ... existing fields ...
  
  eventId   String?
  event     Event?   @relation("EventTodos", fields: [eventId], references: [id])
  
  @@index([eventId, status])
}

// Extend existing Post model
model Post {
  // ... existing fields ...
  
  eventId   String?
  event     Event?   @relation("EventPosts", fields: [eventId], references: [id])
  
  @@index([eventId])
}

// New models
model Registration {
  id        String   @id @default(cuid())
  eventId   String
  event     Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  userId    String?
  user      User?    @relation(fields: [userId], references: [id])
  email     String
  name      String
  status    RegistrationStatus @default(PENDING)
  metadata  Json?    // Custom fields, dietary restrictions, etc.
  createdAt DateTime @default(now())
  
  @@unique([eventId, email])
  @@index([eventId, status])
  @@map("registrations")
}

model EventSpeaker {
  id        String   @id @default(cuid())
  eventId   String
  event     Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  userId    String?  // Optional - speaker might not be on platform
  user      User?    @relation(fields: [userId], references: [id])
  
  // For non-platform speakers
  name      String
  email     String
  bio       String?
  title     String?
  organization String?
  photoUrl  String?
  
  // Speaker details
  topic     String?
  duration  Int?     // Minutes
  confirmed Boolean  @default(false)
  
  createdAt DateTime @default(now())
  
  @@index([eventId])
  @@map("event_speakers")
}

model EventConversation {
  id        String   @id @default(cuid())
  eventId   String
  event     Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  messages  Json     // Array of {role, content, timestamp}
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([eventId, userId])
  @@map("event_conversations")
}

// Add new enums
enum EventStatus {
  DRAFT
  PLANNING
  PUBLISHED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum RegistrationStatus {
  PENDING
  CONFIRMED
  CANCELLED
  WAITLISTED
}

// Extend PostType enum
enum PostType {
  // ... existing types ...
  EVENT_UPDATE
  EVENT_DISCUSSION
}
```

### MCP Tool Definitions

**New Event-Specific Tools for MCP Server**:
```typescript
// Add to existing Maix MCP server

// Tool: Manage events
server.tool(
  "maix_manage_event",
  "Create, update, delete, or get events",
  {
    action: z.enum(["create", "update", "delete", "get", "list"]),
    eventId: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    date: z.string().optional(), // ISO 8601
    venueJson: z.any().optional(),
    status: z.enum(EVENT_STATUS_VALUES).optional(),
  },
  async (params, extra) => {
    // Implementation using existing patterns
  }
)

// Tool: Manage event speakers
server.tool(
  "maix_manage_speaker",
  "Manage event speakers (including non-platform speakers)",
  {
    action: z.enum(["add", "update", "remove", "list"]),
    eventId: z.string(),
    speakerId: z.string().optional(),
    // For non-platform speakers
    name: z.string().optional(),
    email: z.string().email().optional(),
    bio: z.string().optional(),
    topic: z.string().optional(),
    // For platform speakers
    userId: z.string().optional(),
  },
  async (params, extra) => {
    // Handle both platform and non-platform speakers
  }
)

// Tool: Manage registrations
server.tool(
  "maix_manage_registration",
  "Handle event registrations and RSVPs",
  {
    action: z.enum(["register", "cancel", "list", "update_status"]),
    eventId: z.string(),
    registrationId: z.string().optional(),
    email: z.string().email().optional(),
    name: z.string().optional(),
    status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "WAITLISTED"]).optional(),
    metadata: z.any().optional(), // Custom fields
  },
  async (params, extra) => {
    // Registration logic
  }
)
```

**Existing Tools Event Manager Will Use**:
- `maix_manage_todo`: Create event-specific todos
- `maix_manage_post`: Create event updates/discussions
- `maix_search_users`: Find potential speakers
- `maix_manage_organization`: Access org context

### Security & Access Control
- Events are organization-scoped
- Only organization members can create/edit events
- Public events visible to all, private events to members only
- Registration data protected by event organizer permissions

## Detailed Integration Patterns

### Todo System Integration

```typescript
// Extend todo creation to support events
interface CreateTodoParams {
  projectId?: string  // Existing
  eventId?: string    // New
  // ... other fields
}

// Permission check for event todos
const canManageEventTodos = async (userId: string, eventId: string) => {
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: { organization: { include: { members: true } } }
  })
  
  return event?.createdBy === userId || 
         event?.organization.members.some(m => m.userId === userId)
}
```

### Post System Integration

```typescript
// Event updates and discussions
const createEventPost = async (data: {
  eventId: string
  type: 'EVENT_UPDATE' | 'EVENT_DISCUSSION'
  content: string
  authorId: string
}) => {
  // Reuse existing post creation logic
  return db.post.create({
    data: {
      ...data,
      // Leverage existing post structure
    }
  })
}
```

### Frontend Implementation with useChat

```tsx
// app/events/[eventId]/chat.tsx
'use client'
import { useChat } from 'ai/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Markdown } from '@/components/ui/markdown'

export function EventChat({ eventId }: { eventId: string }) {
  const { 
    messages, 
    input, 
    handleInputChange, 
    handleSubmit, 
    isLoading,
    error 
  } = useChat({
    api: `/api/events/${eventId}/chat`,
    body: { eventId },
    onError: (error) => {
      console.error('Chat error:', error)
    }
  })

  return (
    <Card className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'assistant' ? 'justify-start' : 'justify-end'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'assistant'
                  ? 'bg-secondary'
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              <Markdown>{message.content}</Markdown>
              
              {/* Show tool invocations */}
              {message.toolInvocations?.map((tool) => (
                <div key={tool.id} className="mt-2 text-sm opacity-70">
                  {tool.state === 'call' && `🔧 Calling ${tool.toolName}...`}
                  {tool.state === 'result' && `✅ ${tool.toolName} completed`}
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-lg p-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about venue, speakers, tasks..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            Send
          </Button>
        </div>
      </form>
    </Card>
  )
}
```

### PAT Manager Implementation

```typescript
// lib/mcp/pat-manager.ts
import { encrypt, decrypt } from '@/lib/crypto'
import { prisma } from '@/lib/prisma'

export async function savePatForUser(userId: string, patToken: string) {
  const encrypted = encrypt(patToken)
  
  await prisma.userPreferences.upsert({
    where: { userId },
    create: {
      userId,
      mcpTokenEnc: encrypted
    },
    update: {
      mcpTokenEnc: encrypted
    }
  })
}

export async function getPatForUser(userId: string): Promise<string | null> {
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId }
  })
  
  if (!prefs?.mcpTokenEnc) {
    return null
  }
  
  return decrypt(prefs.mcpTokenEnc)
}

export async function removePatForUser(userId: string) {
  await prisma.userPreferences.update({
    where: { userId },
    data: { mcpTokenEnc: null }
  })
}
```

### Event Manager Settings Page

```tsx
// app/events/settings/page.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'

export default function EventManagerSettings() {
  const [token, setToken] = useState('')
  const [isConfigured, setIsConfigured] = useState(false)
  const { toast } = useToast()

  const handleSaveToken = async () => {
    try {
      const res = await fetch('/api/events/settings/pat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
      
      if (!res.ok) throw new Error('Failed to save token')
      
      setIsConfigured(true)
      setToken('') // Clear from UI
      toast({
        title: 'Success',
        description: 'MCP token configured successfully'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save token',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Event Manager Settings</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>MCP Integration</CardTitle>
          <CardDescription>
            Configure your Personal Access Token to enable AI features
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isConfigured ? (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  MCP integration is configured and active
                </AlertDescription>
              </Alert>
              <Button variant="destructive" onClick={handleRemoveToken}>
                Remove Token
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  To use AI features, you need to configure a Personal Access Token:
                  <ol className="list-decimal ml-6 mt-2">
                    <li>Go to <Link href="/settings/api">Settings → API</Link></li>
                    <li>Generate a new Personal Access Token</li>
                    <li>Copy the token and paste it below</li>
                  </ol>
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="maix_pat_..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
                <Button onClick={handleSaveToken} disabled={!token}>
                  Save Token
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

### Task Dashboard Integration

```tsx
// app/events/[eventId]/page.tsx
import { EventChat } from './chat'
import { TodoList } from '@/components/todos/todo-list'
import { EventDetails } from '@/components/events/event-details'
import { RegistrationSummary } from '@/components/events/registration-summary'

export default function EventDetailPage({ params }: { params: { eventId: string } }) {
  return (
    <div className="container mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-8rem)]">
        {/* Left: AI Chat */}
        <EventChat eventId={params.eventId} />
        
        {/* Right: Task Dashboard */}
        <div className="space-y-6 overflow-y-auto">
          <EventDetails eventId={params.eventId} />
          
          {/* Reuse existing TodoList with event context */}
          <TodoList 
            resourceType="event"
            resourceId={params.eventId}
          />
          
          <RegistrationSummary eventId={params.eventId} />
        </div>
      </div>
    </div>
  )
}
```

### UI Component Reuse

```tsx
// Event page layout following project pattern
export function EventDetailPage({ event }: { event: Event }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: AI Chat */}
      <Card>
        <EventChat eventId={event.id} />
      </Card>
      
      {/* Right: Task Dashboard */}
      <div className="space-y-6">
        {/* Reuse TodoList component with event context */}
        <TodoList 
          resourceId={event.id}
          resourceType="event"
          canCreate={canManageEventTodos}
        />
        
        {/* Event details card */}
        <EventDetailsCard event={event} />
        
        {/* Registration summary */}
        <RegistrationSummary eventId={event.id} />
      </div>
    </div>
  )
}
```

## Success Metrics
- Time to create first event < 10 minutes
- 80% of event tasks managed through the system
- Reduced back-and-forth for event planning
- Positive organizer feedback on AI assistance

## Key Technical Decisions

### Why Vercel AI SDK Instead of Custom MCP Client
1. **Built-in MCP Support**: `experimental_createMCPClient` eliminates custom code
2. **Automatic Tool Conversion**: Handles MCP ↔ Gemini format translation
3. **Production Tested**: Used by Zapier, Vapi, and other production apps
4. **Streaming Simplified**: `streamText` and `useChat` handle all complexity
5. **Future Proof**: Vercel is actively developing MCP features

### Transport and Authentication Setup

#### HTTP Transport (Not SSE)
After investigation, the Maix MCP server uses `mcp-handler` which only supports HTTP request/response, not Server-Sent Events. Therefore:
- Use `type: 'http'` in the MCP client configuration
- The AI SDK will handle HTTP-based tool calling
- Streaming still works via Gemini's `streamText` response

#### Authentication Flow

1. **Initial Setup** (One-time per user):
   ```
   User → Settings → API Tokens → Generate PAT
   User → Event Manager Settings → Configure PAT
   ```

2. **Runtime Flow**:
   ```
   Event Chat Request → Retrieve User's PAT → Create MCP Client → Call Tools
   ```

3. **PAT Storage Architecture**:
   ```typescript
   // Option 1: User Preferences (Recommended)
   model UserPreferences {
     id          String @id @default(cuid())
     userId      String @unique
     mcpTokenEnc String? // Encrypted PAT
     user        User @relation(fields: [userId], references: [id])
   }
   
   // Option 2: Session Storage
   // Store encrypted in NextAuth session (temporary)
   ```

4. **Security Considerations**:
   - PATs are encrypted at rest using app-level encryption key
   - Tokens are never exposed to client-side code
   - Each user must configure their own PAT
   - PATs can be revoked from main Maix settings

## Future Considerations
- Integration with calendar systems
- QR code check-in system
- Live event features (Q&A, polls)
- Multi-language event support
- Recurring event templates
- Upgrade to stable MCP client API when available