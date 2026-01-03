# MAIX - Meaningful AI Exchange

A comprehensive platform connecting skilled volunteers with meaningful AI/tech projects to advance communities through collaborative innovation.

## 🌐 Live Platform

**Production**: https://maix.io (canonical domain)

MAIX is deployed and available at **maix.io** - this is the official, canonical domain for the platform.

## Overview

MAIX (Meaningful AI Exchange) is an **AI-accelerated not-for-profit action and collaboration platform** built on Next.js 15. We connect skilled volunteers with meaningful AI/tech projects to advance communities through collaborative innovation.

### Core Focus Areas
- **ACTION** 🎯 - Getting things done efficiently with AI assistance
- **COMMUNITY** 👥 - Doing it together, AI-facilitated collaboration  
- **AI ASSISTANCE** ⚡ - Every workflow enhanced by intelligent automation

### AI-Native Platform Philosophy

**MAIX is fundamentally AI-native** - unlike platforms that retrofit AI features onto existing paradigms, we're built from the ground up with AI as the primary interface and collaboration mechanism.

**What Makes Us AI-Native:**
- AI-first navigation and discovery (not traditional menus + AI addon)
- Intelligent project/task matching based on skills and context
- AI-assisted onboarding, contribution guidance, and code reviews
- Natural language interfaces for complex platform interactions
- Proactive suggestions and contextual assistance throughout workflows

**Competitive Differentiation:** While GitHub, Linear, and other platforms add AI features to existing UX patterns, MAIX is designed as an AI-native experience where artificial intelligence is the primary way users interact with projects, discover opportunities, and collaborate with others.

## Goals

MAIX is built around three core principles:

### 🎓 Facilitation of Learning
- **Knowledge Sharing**: Connect learners with experienced professionals who can provide guidance and mentorship
- **Skill Development**: Provide opportunities for volunteers to develop new skills through real-world projects
- **Educational Resources**: Create a repository of best practices, tutorials, and learning materials
- **Peer Learning**: Foster environments where contributors learn from each other through collaboration

### 🤝 Helping Others
- **Community Support**: Enable volunteers to contribute their expertise to projects that benefit communities
- **Non-Profit Assistance**: Provide technology solutions to organizations working on social good
- **Accessibility**: Make AI and technology expertise available to those who might not otherwise have access
- **Impact Amplification**: Help multiply the positive impact of individual efforts through coordinated collaboration

### 💡 Getting Help
- **Expert Access**: Connect project owners with skilled volunteers who can provide the expertise they need
- **Resource Matching**: Match projects with appropriate resources, skills, and timelines
- **Problem Solving**: Provide structured approaches to breaking down complex technical challenges
- **Community Wisdom**: Leverage collective knowledge to find innovative solutions to difficult problems

### Key Features

- **Intelligent Matching**: AI-powered algorithm matching volunteers with projects based on skills, experience, and interests
- **Natural Language Search**: Advanced search capabilities to find relevant projects and volunteers
- **User Profiles**: Comprehensive profiles with unique usernames, skills, and experience levels
- **Clean Design**: Modern, accessible UI with thoughtful design patterns and color schemes
- **Real-time Collaboration**: In-app messaging and project management tools
- **Community Building**: Reviews, ratings, and reputation system to build trust
- **Project Types**: Support for advice, prototypes, MVPs, and complete products
- **Claude Code Integration**: Remote MCP (Model Context Protocol) server for managing profiles and projects via Claude Code CLI

## Technology Stack

### Core Technologies
- **Framework**: Next.js 15 with App Router
- **Database**: Neon PostgreSQL with pgvector extension
- **Authentication**: NextAuth.js with Google OAuth
- **AI**: Google Gemini via `@google/genai` package
- **UI Components**: shadcn/ui (Radix UI + Tailwind)
- **Deployment**: Vercel for seamless scaling

### Key Libraries
- **Animations**: Framer Motion for smooth interactions
- **Forms**: React Hook Form with Zod validation
- **Real-time**: Pusher/Ably for WebSocket connections
- **Icons**: Lucide React for consistency
- **TypeScript**: Full type safety throughout

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Docker (for test database)
- Neon database account
- Google Cloud Console project (for OAuth)
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ansari-project/maix.git
   cd maix
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following variables:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@ep-xxx.neon.tech/neondb"
   
   # NextAuth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key"
   
   # Google OAuth
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   
   # Google Gemini API
   GOOGLE_GENAI_API_KEY="your-gemini-api-key"
   ```

4. **Set up the database**
   ```bash
   npm run db:migrate:apply  # Apply migrations safely
   npm run db:seed          # Optional: seed with sample data
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## Project Structure

```
maix/
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/       # UI components (shadcn/ui based)
│   ├── lib/              # Utilities and configs
│   ├── hooks/            # Custom React hooks
│   └── types/            # TypeScript definitions
├── prisma/               # Database schema
├── tests/                # Test files
├── scripts/              # Build and utility scripts
│   └── tmp/             # Temporary/one-off scripts
└── codev/                # Development methodology (Codev)
    ├── specs/            # Feature specifications
    ├── plans/            # Implementation plans
    ├── reviews/          # Post-implementation reviews
    ├── protocols/        # Development protocols (SPIDER, TICK)
    └── resources/        # Architecture, lessons, reference docs
```

## Development Methodology

MAIX uses **Codev** for structured development. See `codev/protocols/` for details.

### Protocol Selection

| Task Type | Protocol | When to Use |
|-----------|----------|-------------|
| Complex features | SPIDER | Multi-phase, needs design/review |
| Simple changes | TICK | Quick fixes, single-file changes |

For AI agents, see `CLAUDE.md`. For full protocol documentation, see `codev/protocols/`.

## Testing

**Philosophy**: Integration-first (60%), real database for service tests. See `codev/resources/ref/testing-strategy.md` for complete guidelines.

**Quick start:**
```bash
npm run test:db:start     # Start test database (port 5433)
npm run test:integration  # Run integration tests
npm run test:unit         # Run unit tests
npm run test:db:stop      # Stop test database
```

## Development Guidelines

See `codev/resources/arch.md` for detailed architecture, conventions, and patterns.

**Key principles**: Simplicity, pragmatic security, integration-first testing.

**Database migrations** (see `codev/resources/ref/prisma.md`):
```bash
npm run db:migrate:new name   # Create migration
npm run db:migrate:apply      # Apply migrations
npm run db:backup             # Backup first!
```

**Code quality:**
```bash
npm run lint && npm run type-check && npm run build
```

### Git Best Practices
- Use descriptive commit messages explaining purpose
- Use `git add [specific-files]` - never `git add .` or `git add -A`
- Always check remote before pushing: `git fetch origin && git status`
- Never force push to shared branches
- If push fails, stop and investigate

## Claude Code Integration

MAIX provides a remote MCP (Model Context Protocol) server that allows you to manage your profile and projects directly through Claude Code CLI.

### Quick Setup
1. **Generate a Personal Access Token** at https://maix.io/settings (API Tokens section)
2. **Add the MCP server** to Claude Code:
   ```bash
   claude mcp add --transport http --scope user maix-platform https://maix.io/api/mcp --header "Authorization: Bearer YOUR_PAT_TOKEN_HERE"
   ```
3. **Start using Claude Code** to manage your MAIX profile and projects

### Available Commands
- "Update my MAIX profile to add React and TypeScript skills"
- "Create a new AI project for building a chatbot"
- "List all my projects"
- "Update project [id] to need 5 volunteers"

For detailed setup instructions, see [docs/howtos/claude-code-setup.md](docs/howtos/claude-code-setup.md).

## Debugging Guide

### Quick CI/CD Debugging with GitHub CLI
```bash
gh run list --limit 5              # Check recent runs
gh run view <RUN_ID>               # View run details
gh run view --log-failed --job=<ID> # Get error logs
```

**Pro Tips:**
- Don't use `sleep` commands - work asynchronously
- Use `--log-failed` for relevant error information
- Check status periodically while working on other tasks

For comprehensive debugging strategies, see `codev/resources/ref/debugging-playbook.md`.

## Core Features

### User Types
- **Volunteers**: Skilled individuals offering their expertise
- **Project Supervisors**: People managing projects needing help
- **Organization Admins**: Representatives of non-profit organizations

### Project Types
- **Advice**: Consultation and guidance projects
- **Prototype**: Early-stage development projects
- **MVP**: Minimum viable product development
- **Complete Product**: Full product development projects

### Project Lifecycle
Projects use a dual status system:
- **`status`**: Tracks lifecycle (AWAITING_VOLUNTEERS → PLANNING → IN_PROGRESS → COMPLETED)
- **`isActive`**: Controls volunteer recruitment (can be true even when IN_PROGRESS)

### Notification System
- **Following**: Users can follow organizations, projects, and products to receive updates
- **Pure Subscriptions**: Following grants ZERO permissions - only controls notifications
- **Clear Messaging**: "Get Updates" buttons make it clear this is for notifications only

## Contributing

We welcome contributions from the global tech community! Here's how you can help:

### Code Contributions
1. **Fork the repository** and create a feature branch
2. **Follow Codev protocols** (SPIDER/TICK) for significant features
3. **Write tests** following our integration-first strategy
4. **Submit a pull request** with clear description

### Community Contributions
- **Report bugs** and suggest improvements
- **Share feedback** on user experience
- **Suggest new features** that benefit the community
- **Help with documentation** and translations

### Development Standards
- **TypeScript**: Full type safety with dual config strategy
- **Testing**: Integration-first with real database
- **Accessibility**: WCAG 2.1 AA compliance
- **UI/UX**: Clean design, semantic HTML, Markdown support

## Community Values

MAIX is built on these core values:
- **Community benefit over profit**: Non-profit focus
- **Knowledge sharing**: Open learning and skill development
- **Transparency**: Open processes and clear communication
- **Collaboration**: Welcome contributors from all backgrounds
- **Ethical AI**: Ensuring AI serves humanity responsibly
- **Inclusive**: Accessible to those who need it most

## Documentation

### Key Documentation
- **README.md** - This file, setup and overview
- **CLAUDE.md** - AI agent instructions and safety protocols
- **codev/specs/** - Feature specifications
- **codev/plans/** - Implementation plans
- **codev/reviews/** - Post-implementation reviews and lessons
- **codev/resources/arch.md** - Architecture documentation
- **codev/resources/lessons-learned.md** - Consolidated project insights

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Global tech community** for support and feedback
- **Open source contributors** for their valuable contributions
- **Design community** for inspiration and guidance
- **All volunteers** who contribute their time and expertise

---

Built with ❤️ for positive social impact