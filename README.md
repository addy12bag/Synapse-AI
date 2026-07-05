<div align="center">

<h1>🧠 Synapse AI</h1>
<h3>Your Intelligent Study Companion — Powered by Gemini & Groq</h3>

[![Next.js](https://img.shields.io/badge/Next.js-16.2.7-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)](https://typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-7.8-2D3748?style=for-the-badge&logo=prisma)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=for-the-badge&logo=postgresql)](https://postgresql.org)
[![Clerk](https://img.shields.io/badge/Clerk-Auth-7C3AED?style=for-the-badge&logo=clerk)](https://clerk.com)
[![Gemini](https://img.shields.io/badge/Google-Gemini_AI-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Deploy on Render](https://img.shields.io/badge/Deploy-Render-46E3B7?style=for-the-badge&logo=render)](https://render.com)

<br/>

> **Synapse AI** is a full-stack, AI-powered study planning platform that adapts to your learning style. Upload your syllabus, let AI generate personalized schedules, quiz yourself, chat with your documents, and track your academic progress — all in one beautifully crafted dashboard.

<br/>

[🌐 Live Demo](https://synapse-ai-wtvh.onrender.com) · [🐛 Report Bug](https://github.com/addy12bag/Synapse-AI/issues) · [✨ Request Feature](https://github.com/addy12bag/Synapse-AI/issues)

</div>

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🏗️ Architecture Overview](#️-architecture-overview)
- [🛠️ Tech Stack](#️-tech-stack)
- [📁 Project Structure](#-project-structure)
- [🗄️ Database Schema](#️-database-schema)
- [🚀 Local Development Setup](#-local-development-setup)
  - [Prerequisites](#prerequisites)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Set Up Environment Variables](#3-set-up-environment-variables)
  - [4. Set Up the Database](#4-set-up-the-database)
  - [5. Run the Development Server](#5-run-the-development-server)
- [🔑 Environment Variables Reference](#-environment-variables-reference)
- [🌐 Production Deployment (Render)](#-production-deployment-render)
- [🤖 AI Features Deep Dive](#-ai-features-deep-dive)
- [📊 Core Modules](#-core-modules)
- [🧪 Testing](#-testing)
- [🔒 Security](#-security)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)

---

## ✨ Features

### 🎯 Core Platform
| Feature | Description |
|---|---|
| **🔐 Secure Authentication** | Google OAuth + Email/Password via Clerk — zero-config user management |
| **📊 Smart Dashboard** | Real-time study stats, streak tracking, weekly goals, and XP system |
| **⏱️ Focus Timer** | Pomodoro + custom session timer with automatic session logging |
| **📅 AI Schedule Planner** | AI generates personalized 7-day study schedules from your subjects |
| **📚 Study Hub** | Upload PDFs/DOCX, chat with documents, generate AI quizzes |
| **🧪 Quiz Engine** | MCQ, Flashcards, Short Answer — fully AI-generated from your materials |
| **📈 Progress Tracking** | XP levels, badges, streak calendar, study hours chart |
| **🧠 Spaced Repetition** | SM-2 algorithm for optimal card review scheduling |
| **🤖 AI Weakness Analyzer** | Autonomous agent detects weak subjects and adds remediation sessions |
| **💬 AI Tutor Widget** | Floating context-aware tutor available on every page |
| **📖 Curriculum Hub** | Organize subjects, topics, exam dates, and target hours |

### 🌟 Premium UX
- **Dark/Light Mode** — System-aware theme switching
- **Glassmorphism Design** — Modern translucent UI with smooth gradients
- **Framer Motion Animations** — Micro-animations on every interaction
- **Mobile Responsive** — Fully adaptive layout across all screen sizes
- **Real-time Updates** — TanStack Query for smart data caching and refetching

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                        │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │Dashboard │  │StudyHub  │  │Schedule  │  │Progress  │  │
│  │ Page     │  │  Page    │  │  Page    │  │  Page    │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │              │              │              │         │
│  ┌────▼──────────────▼──────────────▼──────────────▼─────┐ │
│  │              TanStack Query Cache Layer                 │ │
│  └────────────────────────┬────────────────────────────────┘ │
└───────────────────────────┼─────────────────────────────────┘
                            │ Next.js Server Actions
┌───────────────────────────▼─────────────────────────────────┐
│                    SERVER (Next.js App Router)                │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Clerk Auth │  │ Server      │  │  API Routes          │ │
│  │  Middleware │  │ Actions     │  │  /api/upload         │ │
│  └─────────────┘  └──────┬──────┘  └─────────────────────┘ │
│                           │                                   │
│  ┌────────────────────────▼──────────────────────────────┐  │
│  │              Prisma ORM + pg Adapter                   │  │
│  └────────────────────────┬──────────────────────────────┘  │
│                           │                                   │
│  ┌───────────────┐  ┌─────▼──────────┐                      │
│  │ Google Gemini │  │  PostgreSQL DB │                      │
│  │  AI API       │  │  (Render/Neon) │                      │
│  └───────────────┘  └────────────────┘                      │
└──────────────────────────────────────────────────────────────┘
```

**Key Architectural Decisions:**
- **Next.js App Router** — Server Components for data fetching, Client Components for interactivity
- **Server Actions** — Type-safe RPC-like calls from client to server, no REST boilerplate
- **Prisma 7 with pg Adapter** — Connection pooling via `pg.Pool`, works on serverless and traditional Node.js
- **Clerk** — Handles the entire auth lifecycle: sessions, OAuth, webhooks
- **Force Dynamic Rendering** — All dashboard routes are server-rendered on demand (no stale cached data)

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16.2.7 | Full-stack React framework (App Router) |
| **React** | 19.2.4 | UI library |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 4.x | Utility-first styling |
| **Framer Motion** | 12.x | Animations & transitions |
| **Recharts** | 3.x | Progress charts |
| **Lucide React** | 1.x | Icon system |
| **React Hook Form** | 7.x | Form management |
| **Zod** | 4.x | Schema validation |
| **TanStack Query** | 5.x | Server state management |
| **Zustand** | 5.x | Client state management |
| **React Markdown** | 10.x | AI response rendering |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **Next.js Server Actions** | 16.2.7 | Type-safe server functions |
| **Prisma ORM** | 7.8.0 | Database access layer |
| **@prisma/adapter-pg** | 7.8.0 | PostgreSQL driver adapter |
| **pg** | 8.x | PostgreSQL client |
| **pdf-parse** | 2.x | PDF text extraction |
| **mammoth** | 1.x | DOCX text extraction |

### AI / ML
| Service | Model | Purpose |
|---|---|---|
| **Google Gemini** | `gemini-2.0-flash-exp` | Quiz generation, document Q&A, schedule AI |
| **Google Gemini** | `text-embedding-004` | Document chunk embeddings for semantic search |

### Infrastructure
| Service | Purpose |
|---|---|
| **Clerk** | Authentication & user management |
| **PostgreSQL** | Primary relational database |
| **Render** | Production hosting (web service) |
| **GitHub** | Version control & CI/CD trigger |

---

## 📁 Project Structure

```
synapse-ai/
├── prisma/
│   ├── schema.prisma          # Database models
│   ├── migrations/            # Migration history
│   └── prisma.config.js       # Prisma 7 configuration
│
├── public/
│   └── uploads/               # Uploaded PDF/DOCX files
│
├── src/
│   ├── app/
│   │   ├── (auth)/            # Sign-in & Sign-up pages (Clerk)
│   │   ├── (dashboard)/       # Protected dashboard routes
│   │   │   ├── layout.tsx     # Sidebar + TopBar layout
│   │   │   ├── dashboard/     # Main dashboard page
│   │   │   ├── schedule/      # Schedule planner page
│   │   │   ├── study-hub/     # Study Hub + Quiz pages
│   │   │   ├── subjects/      # Curriculum Hub page
│   │   │   ├── timer/         # Focus Timer page
│   │   │   └── progress/      # Progress & Milestones page
│   │   ├── api/
│   │   │   └── upload/        # File upload API route
│   │   ├── actions.ts         # All Server Actions (core business logic)
│   │   ├── globals.css        # Global styles & CSS variables
│   │   ├── layout.tsx         # Root layout with Clerk provider
│   │   └── page.tsx           # Landing page
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx    # Navigation sidebar
│   │   │   ├── TopBar.tsx     # Top navigation bar
│   │   │   └── AiTutorWidget.tsx # Floating AI tutor
│   │   ├── dashboard/         # Dashboard-specific components
│   │   ├── schedule/          # Schedule components
│   │   ├── subjects/          # Curriculum components
│   │   ├── timer/             # Timer components
│   │   ├── progress/          # Progress components
│   │   ├── shared/            # Reusable shared components
│   │   ├── ui/                # Base UI primitives (Shadcn-style)
│   │   ├── CurriculumView.tsx # Subjects & topics management
│   │   ├── StudyHubView.tsx   # Document upload, quiz, chat
│   │   ├── TimerView.tsx      # Pomodoro / focus timer
│   │   ├── ScheduleView.tsx   # Weekly schedule planner
│   │   ├── ProgressView.tsx   # XP, badges, stats
│   │   └── QuizTakeView.tsx   # Interactive quiz interface
│   │
│   ├── hooks/                 # Custom React hooks
│   ├── lib/
│   │   ├── db.ts              # Prisma client singleton
│   │   └── user.ts            # Clerk user sync helper
│   ├── store/                 # Zustand global stores
│   ├── types/                 # TypeScript type definitions
│   └── middleware.ts          # Clerk auth middleware
│
├── .env.local                 # Local environment variables (git-ignored)
├── next.config.ts             # Next.js configuration
├── tailwind.config.ts         # Tailwind configuration
├── tsconfig.json              # TypeScript configuration
└── package.json
```

---

## 🗄️ Database Schema

Synapse AI uses **PostgreSQL** with Prisma ORM. The schema is organized into three phases:

```
Phase 1 — Core Study
┌──────────┐     ┌──────────┐     ┌───────────────┐
│  User    ├────▶│ Subject  ├────▶│    Topic      │
│          │     │          │     └───────────────┘
│          ├────▶│ Schedule │
│          │     └──────────┘
│          ├────▶ StudySession
│          └────▶ UserPreferences

Phase 2 — AI Study Hub
┌──────────┐     ┌──────────┐     ┌───────────────┐
│ Syllabus ├────▶│  Quiz    ├────▶│   Question    │
│ (PDF/Doc)│     │          │     │               │
│          │     └──────────┘     └───────┬───────┘
│ Syllabus │                              │
│  Chunk   │  (embeddings for RAG)        ▼
└──────────┘                     SpacedRepetitionCard
                                  (SM-2 Algorithm)

Phase 3 — Gamification
User ──▶ LeaderboardEntry (XP, Streak, Level, Badges)
User ──▶ ChatMessage (AI Tutor conversation history)
User ──▶ QuizAttempt (score, answers, time taken)
```

**Key Models:**
- **`User`** — Synced from Clerk, owns all data
- **`Subject`** — Academic subjects with color, priority, exam date
- **`Topic`** — Checklist items within a subject
- **`Schedule`** — Study slots (AI-generated or manual) with date/time
- **`StudySession`** — Logged timer sessions with duration
- **`Syllabus`** — Uploaded documents with parsed text and embeddings
- **`SyllabusChunk`** — Text chunks with vector embeddings for semantic search
- **`Quiz`** + **`Question`** — AI-generated assessment banks
- **`QuizAttempt`** — User performance records
- **`SpacedRepetitionCard`** — SM-2 algorithm state per question per user
- **`LeaderboardEntry`** — XP, level, streak, badges
- **`ChatMessage`** — Persistent AI tutor conversation history

---

## 🚀 Local Development Setup

### Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Download |
|---|---|---|
| **Node.js** | ≥ 20.x LTS | [nodejs.org](https://nodejs.org) |
| **npm** | ≥ 10.x | Included with Node.js |
| **Git** | Any | [git-scm.com](https://git-scm.com) |
| **PostgreSQL** | ≥ 15.x | [postgresql.org](https://postgresql.org) |

> **💡 Alternative:** Use [Neon](https://neon.tech) (free serverless PostgreSQL) instead of a local PostgreSQL installation — just grab the connection string from their dashboard.

---

### 1. Clone the Repository

```bash
git clone https://github.com/addy12bag/Synapse-AI.git
cd Synapse-AI
```

---

### 2. Install Dependencies

```bash
npm install
```

This installs all frontend, backend, and Prisma dependencies (~1169 packages).

---

### 3. Set Up Environment Variables

Create a `.env.local` file in the root of the project:

```bash
cp .env.example .env.local   # If .env.example exists
# OR create manually:
touch .env.local
```

Open `.env.local` and add the following variables (see the [full reference](#-environment-variables-reference) below):

```env
# ─── DATABASE ─────────────────────────────────────────────────
DATABASE_URL="postgresql://username:password@localhost:5432/synapse_ai"

# ─── CLERK AUTHENTICATION ─────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
CLERK_SECRET_KEY="sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# ─── AI SERVICES ──────────────────────────────────────────────
GEMINI_API_KEY="AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

> **🔒 Important:** Never commit `.env.local` to Git. It is already in `.gitignore`.

---

### 4. Set Up the Database

#### Option A — Local PostgreSQL

1. Start PostgreSQL and create a database:
   ```sql
   psql -U postgres
   CREATE DATABASE synapse_ai;
   \q
   ```

2. Update `DATABASE_URL` in `.env.local`:
   ```env
   DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/synapse_ai"
   ```

3. Push the schema to the database:
   ```bash
   npx prisma db push
   ```

4. (Optional) Open Prisma Studio to browse your data:
   ```bash
   npx prisma studio
   ```

#### Option B — Neon (Recommended, Free Cloud DB)

1. Go to [neon.tech](https://neon.tech) → Create a free account → Create a new project
2. Copy the **Connection String** from the dashboard (looks like `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`)
3. Paste it as `DATABASE_URL` in `.env.local`
4. Run:
   ```bash
   npx prisma db push
   ```

---

### 5. Run the Development Server

#### Generate Prisma Client
```bash
npx prisma generate
```

#### Start the Dev Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. 🎉

The app will:
1. Redirect unauthenticated users to `/sign-in`
2. Sync Clerk user to the database on first login
3. Show the dashboard with empty initial state

---

### Quick Start Summary

```bash
# 1. Clone
git clone https://github.com/addy12bag/Synapse-AI.git && cd Synapse-AI

# 2. Install
npm install

# 3. Configure environment
cp .env.example .env.local  # then fill in your API keys

# 4. Setup database
npx prisma generate
npx prisma db push

# 5. Run!
npm run dev
```

---

## 🔑 Environment Variables Reference

| Variable | Required | Where to Get |
|---|---|---|
| `DATABASE_URL` | ✅ Yes | Your PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ Yes | [Clerk Dashboard](https://dashboard.clerk.com) → API Keys |
| `CLERK_SECRET_KEY` | ✅ Yes | [Clerk Dashboard](https://dashboard.clerk.com) → API Keys |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | ✅ Yes | Set to `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | ✅ Yes | Set to `/sign-up` |
| `GEMINI_API_KEY` | ✅ Yes | [Google AI Studio](https://aistudio.google.com) → Get API Key |

### How to Get Each API Key

#### 📦 DATABASE_URL (PostgreSQL)
**Option 1 — Neon (Free, Recommended):**
1. Sign up at [neon.tech](https://neon.tech)
2. Create New Project → Choose region
3. Copy the `psql` connection string from the connection details panel

**Option 2 — Local PostgreSQL:**
```
postgresql://<username>:<password>@localhost:5432/<database_name>
```

#### 🔐 Clerk Keys
1. Sign up at [clerk.com](https://clerk.com)
2. Create a new application → Choose "Next.js"
3. Go to **API Keys** in the left sidebar
4. Copy `Publishable key` → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
5. Copy `Secret key` → `CLERK_SECRET_KEY`
6. In **User & Authentication → Social Connections**, enable Google (recommended)

#### 🤖 Gemini API Key
1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Click **Get API Key** → **Create API Key in new project**
3. Copy the key → `GEMINI_API_KEY`
4. **Free tier includes:** 15 requests/minute, 1M tokens/day — plenty for development

---

## 🌐 Production Deployment (Render)

### Step 1 — Push Code to GitHub
```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

### Step 2 — Create a Render Web Service
1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub account and select the `Synapse-AI` repository
3. Configure:
   | Setting | Value |
   |---|---|
   | **Name** | `synapse-ai` |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install && npx prisma generate && npm run build` |
   | **Start Command** | `npx prisma db push && npm start` |
   | **Instance Type** | Free |

### Step 3 — Add Environment Variables
In Render → Environment → Add the following:
```
DATABASE_URL                          = postgresql://...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY    = pk_live_...
CLERK_SECRET_KEY                     = sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL        = /sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL        = /sign-up
GEMINI_API_KEY                       = AIza...
```

### Step 4 — Deploy
Click **Create Web Service** → Render will automatically build and deploy.

> **⚠️ Free Tier Note:** Free Render instances spin down after 15 minutes of inactivity. First request after idle may take 30–50 seconds to respond. Upgrade to a paid plan for always-on performance.

---

## 🤖 AI Features Deep Dive

### 📄 Document Chat (RAG System)
When you upload a PDF or DOCX:
1. **Text Extraction** — `pdf-parse` (PDFs) or `mammoth` (DOCX) extracts raw text
2. **Chunking** — Text is split into 1000-character chunks with 200-character overlap
3. **Embedding** — Each chunk is embedded using Gemini `text-embedding-004` model
4. **Storage** — Embeddings stored as `Float[]` arrays in PostgreSQL
5. **Query** — User questions are embedded → cosine similarity search finds relevant chunks → Gemini `gemini-2.0-flash-exp` generates answers grounded in your document

### 🧪 AI Quiz Generation
1. Upload a syllabus document
2. Click **Generate Quiz** → selects relevant document chunks
3. Sends chunks to Gemini with structured prompt requesting JSON quiz format
4. Returns 10–15 MCQ/flashcard questions with explanations
5. Questions stored in DB and linked to the original document

### 📅 AI Schedule Generator
1. Reads your registered subjects, priorities, exam dates, and target hours
2. Sends a structured prompt to Gemini with your academic profile
3. Gemini returns a 7-day study plan in JSON format
4. Plan is saved as `Schedule` records in the database
5. Weakness Analyzer Agent runs autonomously and adds remediation slots for struggling subjects

### 🧠 Spaced Repetition (SM-2 Algorithm)
Based on the **SuperMemo 2 (SM-2)** algorithm:
- Each flashcard tracks: `interval`, `repetitions`, `easiness` (2.5 default)
- After every review, the algorithm updates `nextReview` date based on performance
- Cards due for review appear in the Study Hub automatically

### 💬 Floating AI Tutor
- Context-aware assistant available on every page
- Remembers conversation history (stored in `ChatMessage` table)
- Responds to academic questions, explains concepts, and gives study tips
- Uses streaming text generation for real-time responses

---

## 📊 Core Modules

### ⏱️ Focus Timer
- **Pomodoro Mode:** 25-min work / 5-min break cycles (configurable)
- **Custom Mode:** Set any duration
- Automatically logs a `StudySession` record when a session completes
- Updates XP and streak in the leaderboard

### 📅 Schedule Planner
- Manual slot creation with subject, time, and title
- AI-generated weekly plan button
- Mark slots as complete → updates progress
- UTC-normalized dates prevent timezone shift bugs

### 📖 Curriculum Hub
- Add/edit/delete subjects with color, icon, priority, and exam date
- Add topics as a checklist under each subject
- Track target study hours per subject

### 📈 Progress & Milestones
- **XP System:** Earn XP for completing study sessions, quizzes, and goals
- **Levels:** Level up as XP accumulates (Level 1–100+)
- **Streak Tracking:** Daily study streak with calendar visualization
- **Badges:** Unlock achievement badges (e.g., "7-Day Streak", "Quiz Master")
- **Charts:** Weekly study hours bar chart, subject distribution

---

## 🧪 Testing

### Run the Linter
```bash
npm run lint
```

### Unit Tests (Jest)
```bash
npm test
```

### End-to-End Tests (Playwright)
```bash
npx playwright test
```

### Type Check Only
```bash
npx tsc --noEmit
```

---

## 🔒 Security

- **Authentication** — All dashboard routes protected by Clerk middleware (`src/middleware.ts`)
- **Authorization** — All server actions verify the authenticated user's Clerk ID before any database operation
- **Data Isolation** — Every query is scoped to the authenticated user's ID — users can never access each other's data
- **Environment Variables** — Secrets never exposed to the client; only `NEXT_PUBLIC_*` variables are sent to the browser
- **File Uploads** — Uploaded files validated by MIME type; stored server-side only

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/Synapse-AI.git

# 3. Create a feature branch
git checkout -b feature/amazing-feature

# 4. Make your changes

# 5. Commit with a descriptive message
git commit -m "feat: add amazing feature"

# 6. Push to your fork
git push origin feature/amazing-feature

# 7. Open a Pull Request on GitHub
```

### Commit Convention
```
feat:     New feature
fix:      Bug fix
build:    Build/deployment changes
docs:     Documentation updates
refactor: Code refactor (no feature/bug)
style:    CSS/styling changes
test:     Test additions
chore:    Maintenance tasks
```

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ by [addy12bag](https://github.com/addy12bag)**

*If Synapse AI helped you study smarter, give it a ⭐ on GitHub!*

[![GitHub Stars](https://img.shields.io/github/stars/addy12bag/Synapse-AI?style=social)](https://github.com/addy12bag/Synapse-AI)

</div>
