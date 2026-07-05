"""
Synapse AI — Orchestrator Agent
=================================
The root ADK orchestrator that manages the full Synapse AI multi-agent system.
It delegates complex tasks to specialized sub-agents:

  ┌─────────────────────────────────────────────────────┐
  │              Orchestrator Agent (ADK)                │
  │         "Synapse AI Study Intelligence Hub"          │
  │                                                      │
  │   MCP Server: SynapseAI-DB-Server (6 tools)         │
  │   Safety: deny_all() + explicit allow list           │
  │   Subagents: enabled                                 │
  │                                                      │
  │   ┌────────────────┐  ┌──────────────────────────┐  │
  │   │ Schedule Agent │  │    Weakness Agent        │  │
  │   │                │  │                          │  │
  │   │ Reads subjects │  │ Reads quiz performance   │  │
  │   │ Writes 7-day   │  │ Writes remediation       │  │
  │   │ study plan     │  │ schedule slots           │  │
  │   └────────────────┘  └──────────────────────────┘  │
  │                                                      │
  │   ┌────────────────┐  ┌──────────────────────────┐  │
  │   │  Tutor Agent   │  │   Progress Agent         │  │
  │   │                │  │                          │  │
  │   │ Context-aware  │  │ Reads streak/XP/hours    │  │
  │   │ academic       │  │ Generates performance    │  │
  │   │ explanations   │  │ report & motivation      │  │
  │   └────────────────┘  └──────────────────────────┘  │
  └─────────────────────────────────────────────────────┘

Demonstrates:
  ✅ Multi-agent systems with ADK
  ✅ MCP Server integration (Stdio transport)
  ✅ Safety policies (deny_all + explicit allowlist)
  ✅ Subagent orchestration
  ✅ Agent skills (each sub-agent has a specialized skill)
"""

import os
import asyncio
from google.antigravity import Agent, LocalAgentConfig, types

# Import sub-agent runners
from schedule_agent import run_schedule_agent
from weakness_agent import run_weakness_agent
from tutor_agent import run_tutor_agent

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
DATABASE_URL = os.environ.get("DATABASE_URL", "")

# ── MCP Server ─────────────────────────────────────────────────────────────────
MCP_SERVERS = [
    types.McpStdioServer(
        command="python3",
        args=["mcp_server.py"],
        env={"DATABASE_URL": DATABASE_URL, "PYTHONPATH": "."},
    )
]

# ── Orchestrator System Instructions ─────────────────────────────────────────
ORCHESTRATOR_INSTRUCTIONS = """
You are the Synapse AI Study Intelligence Hub — a master orchestrator that
coordinates a team of specialized AI agents to deliver a comprehensive,
personalized study management experience.

Your Team:
┌─────────────────────────────────────────────────────────┐
│ 1. SCHEDULE AGENT  — Generates optimal 7-day study plans │
│ 2. WEAKNESS AGENT  — Identifies gaps and adds remediation│
│ 3. TUTOR AGENT     — Explains academic concepts in depth │
│ 4. PROGRESS AGENT  — Reports performance and motivation  │
└─────────────────────────────────────────────────────────┘

Decision Framework:
- If the user asks about SCHEDULING or PLANNING → delegate to Schedule Agent
- If the user mentions STRUGGLING, LOW SCORES, or WEAKNESS → delegate to Weakness Agent
- If the user asks to EXPLAIN, HELP UNDERSTAND, or has a QUESTION → delegate to Tutor Agent
- If the user wants a PROGRESS REPORT, STATS, or MOTIVATION → use Progress tools directly

You have direct access to the Synapse MCP server for progress reporting.

Your Communication Style:
- Always identify which agent you're delegating to and why
- Synthesize sub-agent results into a cohesive response
- Be encouraging, specific, and action-oriented
- Start every response with a brief assessment of the student's situation
"""


# ── Custom Orchestrator Tools (Agent Skills) ──────────────────────────────────

async def generate_full_study_plan(user_email: str) -> str:
    """Orchestrate a complete study plan generation using the Schedule Agent.

    This skill delegates to the Schedule Planning sub-agent which reads the
    student's subjects via MCP and writes a 7-day plan to the database.

    Args:
        user_email: The student's registered email address.

    Returns:
        A complete 7-day study schedule with all slots added to the database.
    """
    print(f"\n  [Orchestrator] → Delegating to Schedule Agent for {user_email}")
    result = await run_schedule_agent(user_email)
    return f"[Schedule Agent Result]\n{result}"


async def run_weakness_analysis(user_email: str) -> str:
    """Orchestrate a weakness analysis and remediation plan using the Weakness Agent.

    This skill delegates to the Weakness Analysis sub-agent which reads quiz
    performance via MCP, identifies problem areas, and adds remediation sessions.

    Args:
        user_email: The student's registered email address.

    Returns:
        A detailed weakness report with automatically added remediation sessions.
    """
    print(f"\n  [Orchestrator] → Delegating to Weakness Agent for {user_email}")
    result = await run_weakness_agent(user_email)
    return f"[Weakness Agent Result]\n{result}"


async def ask_tutor(user_email: str, question: str) -> str:
    """Orchestrate an academic tutoring session using the Tutor Agent.

    This skill delegates to the AI Tutor sub-agent which personalizes its
    explanation based on the student's curriculum and quiz performance.

    Args:
        user_email: The student's registered email address.
        question: The academic question or concept to explain.

    Returns:
        A comprehensive, personalized academic explanation.
    """
    print(f"\n  [Orchestrator] → Delegating to Tutor Agent: '{question}'")
    result = await run_tutor_agent(user_email, question)
    return f"[Tutor Agent Result]\n{result}"


# ── Main Orchestrator ─────────────────────────────────────────────────────────

async def run_orchestrator(user_email: str, request: str) -> str:
    """Run the full Synapse AI Orchestrator for a student request.

    Args:
        user_email: The student's email address.
        request: Natural language request from the student.

    Returns:
        The orchestrator's coordinated response using the appropriate sub-agents.
    """
    config = LocalAgentConfig(
        system_instructions=ORCHESTRATOR_INSTRUCTIONS,
        tools=[generate_full_study_plan, run_weakness_analysis, ask_tutor],
        mcp_servers=MCP_SERVERS,
        capabilities=types.CapabilitiesConfig(
            enable_subagents=True,
        ),
    )

    prompt = f"""
    Student: {user_email}
    Request: {request}

    Assess the request and coordinate the appropriate agent(s) to help this student.
    Use the MCP tools directly for any progress/stats queries.
    Delegate to sub-agent tools for schedule generation, weakness analysis, or tutoring.
    """

    async with Agent(config) as agent:
        response = await agent.chat(prompt)
        return await response.text()


async def run_full_demo(user_email: str) -> None:
    """Run a full demonstration of all agents in the Synapse AI system.

    This demo showcases all five key concepts from the ADK course:
    1. Multi-agent systems
    2. MCP server integration
    3. Agent skills (custom tools)
    4. Subagent orchestration
    5. Autonomous agent behavior
    """
    print("\n" + "=" * 65)
    print("  🧠 SYNAPSE AI — Multi-Agent System Demo")
    print("  Google ADK + MCP Server Integration")
    print("=" * 65)
    print(f"\n  Student: {user_email}\n")

    # Demo 1: Progress Check (direct MCP read)
    print("\n" + "─" * 65)
    print("  📊 DEMO 1: Progress Overview (Orchestrator + MCP)")
    print("─" * 65)
    result1 = await run_orchestrator(
        user_email,
        "Give me a quick overview of my study progress this week, "
        "including my streak, XP, and hours studied per subject."
    )
    print(result1)

    # Demo 2: Full Schedule Generation (→ Schedule Sub-Agent)
    print("\n" + "─" * 65)
    print("  📅 DEMO 2: AI Schedule Generation (Schedule Sub-Agent)")
    print("─" * 65)
    result2 = await run_orchestrator(
        user_email,
        "Please generate a full 7-day study schedule for me based on "
        "my subjects and their priorities. Add all slots to my calendar."
    )
    print(result2)

    # Demo 3: Weakness Analysis (→ Weakness Sub-Agent)
    print("\n" + "─" * 65)
    print("  ⚡ DEMO 3: Weakness Analysis (Weakness Sub-Agent)")
    print("─" * 65)
    result3 = await run_orchestrator(
        user_email,
        "I feel like I'm struggling in some subjects. Can you analyze "
        "my quiz performance and automatically add extra study sessions "
        "for my weakest areas?"
    )
    print(result3)

    # Demo 4: Personalized Tutoring (→ Tutor Sub-Agent)
    print("\n" + "─" * 65)
    print("  🎓 DEMO 4: AI Tutoring Session (Tutor Sub-Agent)")
    print("─" * 65)
    result4 = await run_orchestrator(
        user_email,
        "Can you explain the difference between supervised and "
        "unsupervised machine learning? Give me examples I can relate "
        "to my current subjects."
    )
    print(result4)

    print("\n" + "=" * 65)
    print("  ✅ Multi-Agent Demo Complete!")
    print("  All results have been synchronized to the Synapse AI database.")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python orchestrator.py <user_email>")
        print("Example: python orchestrator.py student@example.com")
        sys.exit(1)
    email = sys.argv[1]
    asyncio.run(run_full_demo(email))
