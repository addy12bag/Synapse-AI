# 🤖 Synapse AI — ADK Multi-Agent System

> **Kaggle Capstone**: 5-Day AI Agents Intensive with Google  
> **Track**: Agents for Good (Education)

This directory contains the **Python ADK multi-agent backend** for Synapse AI, built using the **Google Antigravity (ADK) SDK** and **Model Context Protocol (MCP)**.

---

## 🧠 Architecture

```
Orchestrator Agent (ADK Root)
│
│  [Skill: generate_full_study_plan]
├──→ Schedule Agent
│    ├─ MCP Tool: get_user_subjects
│    ├─ MCP Tool: get_weekly_study_hours
│    ├─ MCP Tool: get_study_streak
│    └─ MCP Tool: add_schedule_slot (WRITES to DB)
│
│  [Skill: run_weakness_analysis]
├──→ Weakness Agent
│    ├─ MCP Tool: get_quiz_performance
│    ├─ MCP Tool: get_user_subjects
│    └─ MCP Tool: add_schedule_slot (WRITES remediation)
│
│  [Skill: ask_tutor]
├──→ Tutor Agent
│    ├─ MCP Tool: get_user_subjects
│    └─ MCP Tool: get_quiz_performance
│
└─ Direct MCP: get_study_streak (progress reports)
```

---

## ✅ ADK Concepts Demonstrated

| # | Concept | File | Description |
|---|---------|------|-------------|
| 1 | **Multi-Agent System** | `orchestrator.py` | Root agent delegates to 3 specialized sub-agents |
| 2 | **MCP Server (Stdio)** | `mcp_server.py` | Exposes Synapse DB as 6 structured MCP tools |
| 3 | **Agent Skills** | All agents | Each agent has domain-specific custom tools |
| 4 | **Subagents** | `orchestrator.py` | `enable_subagents=True` for nested delegation |
| 5 | **Autonomous Behavior** | `weakness_agent.py` | Proactively schedules remediation without prompting |

---

## 📁 Files

| File | Description |
|------|-------------|
| `mcp_server.py` | **MCP Server** — Exposes Synapse AI DB as 6 tools via FastMCP |
| `orchestrator.py` | **Root Agent** — Coordinates all sub-agents with safety policies |
| `schedule_agent.py` | **Schedule Agent** — Generates 7-day personalized study plans |
| `weakness_agent.py` | **Weakness Agent** — Identifies gaps, adds remediation sessions |
| `tutor_agent.py` | **Tutor Agent** — Provides context-aware academic explanations |
| `main.py` | **Demo Runner** — Runs full system without DB (uses mock data) |
| `requirements.txt` | Python dependencies |
| `.env.example` | Environment variable template |

---

## 🚀 Quick Start (5 minutes)

### 1. Navigate to agents directory
```bash
cd agents
```

### 2. Create a virtual environment
```bash
python3 -m venv venv
source venv/bin/activate        # macOS/Linux
# OR
venv\Scripts\activate           # Windows
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Set up environment variables
```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

Get your free Gemini API key at: https://aistudio.google.com/app/api-keys

### 5. Run the demo
```bash
python main.py
```

This runs the full multi-agent system with mock data — **no database required**!

---

## 🗄️ Full Database Integration

To connect the agents to a real Synapse AI database:

### 1. Add DATABASE_URL to your `.env`
```env
DATABASE_URL=postgresql://user:password@host:5432/synapse_db
```

### 2. Run with a real student account
```bash
# Full orchestrator (all 4 agents, real DB)
python orchestrator.py student@example.com

# Individual agents
python schedule_agent.py student@example.com
python weakness_agent.py student@example.com
python tutor_agent.py student@example.com "Explain quantum entanglement"
```

---

## 🔧 MCP Server Details

The `mcp_server.py` exposes the Synapse AI PostgreSQL database as 6 MCP tools:

| Tool | Type | Description |
|------|------|-------------|
| `get_user_subjects` | READ | All registered subjects with priority + exam dates |
| `get_today_schedule` | READ | Today's study slots with completion status |
| `get_quiz_performance` | READ | Recent quiz scores + weak subject detection |
| `get_study_streak` | READ | Current streak, XP, level, and badges |
| `get_weekly_study_hours` | READ | Hours studied per subject this week |
| `add_schedule_slot` | **WRITE** | Creates new study session in the database |

The MCP server uses **Stdio transport** — ADK agents launch it as a subprocess and communicate over stdin/stdout, keeping credentials secure and never exposing the database URL over the network.

---

## 🔒 Security Design

- **Credential isolation**: Database URL only flows through environment variables, never hardcoded
- **MCP Stdio**: DB tools run as a local subprocess — no network exposure
- **User scoping**: All MCP tools filter by `user_email` — agents cannot access other users' data
- **Read-first**: Agents read current state before writing to avoid conflicts

---

## 🎯 Capstone Track

**Agents for Good — Education**

Synapse AI addresses a real societal challenge: personalized education is expensive and inaccessible for most students. This multi-agent system democratizes intelligent academic coaching by providing every student with:

- 🎓 A personal AI tutor that explains concepts at their level
- 📅 An intelligent schedule planner that adapts to exam timelines
- ⚡ An autonomous weakness detector that acts before exams arrive
- 📊 A progress tracker that celebrates milestones and motivates consistency

---

## 📦 Dependencies

```
google-antigravity   — ADK SDK for building AI agents
mcp                  — Model Context Protocol (FastMCP server)
psycopg2-binary      — PostgreSQL driver for database access
python-dotenv        — Environment variable loading
```
