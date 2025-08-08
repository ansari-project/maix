# Event Manager Demo - Voiceover Script

## Scene 1: Introduction (0:00 - 0:10)
**[Homepage visible]**

"Welcome to Maix - the Meaningful AI Exchange platform. Today, I'm excited to show you our new Event Manager feature that we've just completed."

## Scene 2: Sign In (0:10 - 0:20)
**[Navigating to sign-in page]**

"The Event Manager is fully integrated with our authentication system, ensuring secure access to event management capabilities for organization members."

## Scene 3: API Overview (0:20 - 0:40)
**[Console showing API endpoints]**

"Behind the scenes, we've built a comprehensive REST API with full CRUD operations for events. You can create, read, update, and delete events, manage registrations, and interact with our AI assistant - all through clean, RESTful endpoints."

## Scene 4: Organizations (0:40 - 0:55)
**[Organizations page]**

"Events are managed at the organization level. Each organization can create and manage their own events - from small meetups to large conferences. Organization members have full control over their event lifecycle."

## Scene 5: Task Integration (0:55 - 1:10)
**[My Todos page]**

"One of the powerful features is automatic task generation. When you create an event, the system intelligently generates a complete checklist of tasks based on the event type. These tasks appear directly in your todo dashboard, keeping everything organized in one place."

## Scene 6: MCP Tools (1:10 - 1:35)
**[Console showing MCP tools list]**

"We've implemented over 15 MCP tools for comprehensive event management. These tools handle everything from event creation to registration management and automated task generation. Each tool is designed to work seamlessly with our AI assistant, providing a powerful automation layer."

## Scene 7: AI Assistant (1:35 - 2:00)
**[Console showing AI features]**

"Meet Maya - our AI event planning assistant. Maya has a friendly, helpful personality and guides users through event planning step-by-step. She understands five different event types and automatically generates appropriate task templates for tech meetups, workshops, networking events, conferences, and hackathons. The conversation history is preserved, so Maya remembers your context throughout the planning process."

## Scene 8: Technical Highlights (2:00 - 2:20)
**[Homepage with summary]**

"Under the hood, we're using state-of-the-art technology: 
- Prisma ORM for type-safe database operations
- AES-256-GCM encryption for security tokens
- AI SDK version 5 for streaming chat responses
- Zod validation for bulletproof input handling
- And automatic capacity management with waitlisting"

## Scene 9: Conclusion (2:20 - 2:35)
**[Final screen]**

"The Event Manager backend is now complete and fully operational. With 841 tests passing and all APIs ready, we're set to build beautiful UI components on top of this robust foundation. This feature will help communities organize impactful events and bring people together around meaningful AI projects."

---

## Quick 30-Second Version

**[0:00 - 0:05]** "Maix Event Manager - Complete backend implementation demo."

**[0:05 - 0:10]** "Full REST API with event CRUD operations and registration management."

**[0:10 - 0:15]** "15+ MCP tools for automation and AI-powered event planning."

**[0:15 - 0:20]** "Maya, our AI assistant, guides users through event creation with smart templates."

**[0:20 - 0:25]** "Automatic task generation, capacity management, and enterprise-grade security."

**[0:25 - 0:30]** "Backend complete. 841 tests passing. Ready for UI implementation."

---

## Technical Demo Version (for developers)

**[Opening]** "Let me walk you through the Event Manager architecture we've implemented..."

**[APIs]** "We've built RESTful endpoints following Next.js 15 App Router patterns, with proper error handling and validation at every layer..."

**[Security]** "Security was a top priority. We implemented PAT management with AES-256-GCM encryption, scoped permissions, and role-based access control..."

**[AI Integration]** "The AI assistant uses the new AI SDK v5 with streaming responses. We've implemented conversation persistence using JSON storage in PostgreSQL..."

**[MCP Tools]** "Each MCP tool follows the Model Context Protocol specification, with Zod schemas for validation and proper error handling..."

**[Testing]** "We've achieved comprehensive test coverage with 841 tests, including unit tests for services, integration tests for APIs, and end-to-end test scenarios..."

**[Conclusion]** "This implementation demonstrates production-ready backend development with modern TypeScript, focusing on type safety, security, and scalability."