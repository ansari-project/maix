# MAIX - Muslim AI Exchange

A comprehensive platform connecting Muslim volunteers with AI/tech projects to advance the Ummah through collaborative innovation.

## Overview

MAIX (Muslim AI Exchange) serves as a bridge between skilled Muslim volunteers and meaningful AI/technology projects. Our platform facilitates intelligent project matching, enabling the Muslim community to collaborate on impactful initiatives while maintaining Islamic values and principles.

### Key Features

- **Intelligent Matching**: AI-powered algorithm matching volunteers with projects based on skills, experience, and interests
- **Natural Language Search**: Advanced search capabilities to find relevant projects and volunteers
- **Islamic Design**: Culturally appropriate UI with Islamic geometric patterns and color schemes
- **Real-time Collaboration**: In-app messaging and project management tools
- **Community Building**: Reviews, ratings, and reputation system to build trust
- **Project Types**: Support for advice, prototypes, MVPs, and complete products

## Technology Stack

### Core Technologies
- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Database**: Neon (Serverless PostgreSQL with pgvector)
- **Authentication**: NextAuth.js with Google OAuth
- **Deployment**: Vercel for seamless scaling
- **AI/ML**: Claude Sonnet 4 API for embeddings and semantic search

### Key Libraries
- **UI Components**: shadcn/ui (Radix UI + Tailwind) for accessibility
- **Animations**: Framer Motion for smooth interactions
- **Forms**: React Hook Form with Zod validation
- **Real-time**: Pusher/Ably for WebSocket connections
- **Icons**: Lucide React for consistency

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Neon database account
- Google Cloud Console project (for OAuth)
- Anthropic API key for Claude

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/maix.git
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
   
   # Claude API
   ANTHROPIC_API_KEY="your-anthropic-api-key"
   ```

4. **Set up shadcn/ui**
   ```bash
   npx shadcn-ui@latest init
   npx shadcn-ui@latest add button card form dialog input label select textarea
   ```

5. **Set up the database**
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to `http://localhost:3000`

### Database Setup

MAIX uses Neon as the PostgreSQL database with pgvector extension for semantic search capabilities.

1. **Create a Neon account** at [neon.tech](https://neon.tech)
2. **Create a new project** with PostgreSQL
3. **Enable pgvector extension** in your database
4. **Copy the connection string** to your `.env.local` file

### Google OAuth Setup

1. **Go to** [Google Cloud Console](https://console.cloud.google.com)
2. **Create a new project** or select existing one
3. **Enable Google OAuth2 API**
4. **Create OAuth 2.0 credentials** (Web application)
5. **Add authorized redirect URIs**: `http://localhost:3000/api/auth/callback/google`
6. **Copy Client ID and Secret** to your `.env.local` file

## Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build production bundle
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks

# Testing
npm run test         # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run test:e2e     # Run end-to-end tests

# Database
npm run db:push      # Push schema changes
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed database with sample data
```

### Project Structure

```
maix/
├── src/
│   ├── app/              # Next.js 14 app router
│   │   ├── api/          # API routes
│   │   ├── auth/         # Authentication pages
│   │   ├── dashboard/    # User dashboard
│   │   ├── projects/     # Project pages
│   │   └── search/       # Search functionality
│   ├── components/       # Reusable UI components
│   │   ├── ui/           # Basic UI components
│   │   ├── forms/        # Form components
│   │   └── layout/       # Layout components
│   ├── lib/              # Utilities and configurations
│   │   ├── auth.ts       # NextAuth configuration
│   │   ├── db.ts         # Database connection
│   │   └── claude.ts     # Claude API client setup
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

### Specialties
- **AI**: Artificial Intelligence and Machine Learning
- **Full Stack**: Web and mobile development
- **Program Manager**: Project coordination and management

### Experience Levels
- **Hobbyist**: Personal projects and learning
- **Intern**: Currently in internship or entry-level position
- **New Grad**: Recent graduate with 0-2 years experience
- **Senior**: 3+ years of professional experience

## Contributing

We welcome contributions from the Muslim tech community! Here's how you can help:

### Code Contributions
1. **Fork the repository** and create a feature branch
2. **Make your changes** following our coding standards
3. **Write tests** for new functionality
4. **Submit a pull request** with a clear description

### Community Contributions
- **Report bugs** and suggest improvements
- **Share feedback** on user experience
- **Suggest new features** that benefit the community
- **Help with documentation** and translations

### Development Guidelines
- Follow Islamic principles in all contributions
- Maintain code quality with TypeScript and ESLint
- Write comprehensive tests for new features
- Follow our commit message conventions
- Respect cultural sensitivity in UI/UX design

## Deployment

### Vercel Deployment (Recommended)
1. **Connect your repository** to Vercel
2. **Configure environment variables** in Vercel dashboard
3. **Deploy automatically** on push to main branch

### Manual Deployment
```bash
npm run build
npm run start
```

## Community

### Getting Help
- **Documentation**: Check our documentation in the `docs/` directory
  - **Plans**: Execution plans and roadmaps in `docs/plans/`
  - **Guides**: Feature usage guides in `docs/guides/`
  - **How-tos**: Step-by-step instructions in `docs/howtos/`
  - **FAQs**: Common questions in `docs/faqs/`
  - **Ideas**: Ideas still in incubation in `docs/ideas/`
  - **Reference**: API and technical reference in `docs/ref/`
- **Issues**: Report bugs and feature requests on GitHub
- **Discussions**: Join community discussions in GitHub Discussions

### Islamic Values
MAIX is built with Islamic principles in mind:
- **Halal Projects**: All projects must align with Islamic values
- **Community First**: Prioritizing Ummah benefit over profit
- **Knowledge Sharing**: Promoting Islamic tradition of learning
- **Ethical AI**: Ensuring AI development serves humanity

## Roadmap

### Phase 1: Foundation (Weeks 1-4)
- ✅ Project setup and basic authentication
- ✅ Database schema and initial UI components
- 🔄 User registration and profile management

### Phase 2: Core Features (Weeks 5-8)
- 🔄 Project creation and management
- 🔄 Basic matching and application system
- 🔄 Search functionality

### Phase 3: Advanced Features (Weeks 9-12)
- ⏳ AI-powered semantic search
- ⏳ Real-time messaging system
- ⏳ Review and rating system

### Phase 4: Community Features (Weeks 13-16)
- ⏳ Community forums and discussions
- ⏳ Mobile optimization
- ⏳ Analytics and reporting

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Allah (SWT)** for guidance and inspiration
- **Muslim tech community** for support and feedback
- **Open source contributors** for their valuable contributions
- **Islamic geometric art** for design inspiration

---

**"And it is He who created the heavens and earth in truth. And the day He says, 'Be,' and it is, His word is the truth."** - Quran 6:73

Built with ❤️ for the Ummah