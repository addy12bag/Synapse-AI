"""
Synapse AI — Quick Demo Runner
================================
A self-contained demo that runs the full multi-agent system without
requiring a real database connection. Uses mock data to showcase all
ADK concepts for the Kaggle Capstone submission.

Run this to verify the ADK setup works:
    python main.py

For full database integration:
    python orchestrator.py your@email.com
"""

import os
import asyncio
from google.antigravity import Agent, LocalAgentConfig, types

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")


# ── Mock Tools (no DB required for demo) ─────────────────────────────────────

def get_mock_subjects() -> str:
    """Returns mock subject data for demonstration purposes."""
    return """
    Student Subjects:
    1. Mathematics (Priority: 5, Exam: 2026-08-15, Target: 40h)
    2. Physics (Priority: 4, Exam: 2026-08-20, Target: 30h)
    3. Computer Science (Priority: 5, Exam: 2026-08-10, Target: 35h)
    4. English Literature (Priority: 2, Exam: 2026-09-01, Target: 15h)
    5. History (Priority: 3, Exam: 2026-08-25, Target: 20h)
    """


def get_mock_performance() -> str:
    """Returns mock quiz performance data for demonstration purposes."""
    return """
    Recent Quiz Performance:
    - Mathematics: 45% average (WEAK - needs attention)
    - Physics: 72% average (Good)
    - Computer Science: 88% average (Excellent)
    - English Literature: 91% average (Excellent)
    - History: 55% average (WEAK - needs attention)
    """


def get_mock_streak() -> str:
    """Returns mock streak and XP data for demonstration purposes."""
    return """
    Current Progress:
    - Study Streak: 7 days 🔥
    - Total XP: 2,450 points
    - Level: 12
    - Badges: ["7-Day Warrior", "Quiz Master", "Early Bird"]
    - Weekly XP: 380 points
    """


def generate_study_tip(subject: str) -> str:
    """Generate a targeted study tip for a specific subject.

    Args:
        subject: The academic subject to get a tip for.

    Returns:
        A personalized study strategy for the given subject.
    """
    tips = {
        "mathematics": (
            "For Mathematics: Practice 10 problems daily using spaced repetition. "
            "Focus on understanding the WHY behind formulas, not just memorization. "
            "Khan Academy and 3Blue1Brown videos are excellent resources."
        ),
        "physics": (
            "For Physics: Draw free-body diagrams for every problem. "
            "Connect equations to real-world phenomena. "
            "Practice dimensional analysis to catch errors."
        ),
        "history": (
            "For History: Create timeline maps connecting events. "
            "Use the PERSIA framework (Political, Economic, Religious, Social, "
            "Intellectual, Artistic) to analyze periods comprehensively."
        ),
        "computer science": (
            "For Computer Science: Code every concept you learn. "
            "Build small projects to apply theory. "
            "Use LeetCode for algorithm practice and GitHub for version control."
        ),
    }
    return tips.get(
        subject.lower(),
        f"For {subject}: Use active recall and spaced repetition. "
        "Create concept maps and teach the material to someone else."
    )


# ── Demo Agents ───────────────────────────────────────────────────────────────

async def demo_schedule_agent():
    """Demo: Schedule Planning Agent with custom tools."""
    print("\n📅 Running Schedule Planning Agent...")
    config = LocalAgentConfig(
        system_instructions=(
            "You are a study schedule planning agent. "
            "Use the provided tools to understand a student's profile and "
            "generate a structured 7-day study plan. "
            "Be specific with times (e.g., 09:00-11:00) and subjects."
        ),
        tools=[get_mock_subjects, get_mock_streak],
        capabilities=types.CapabilitiesConfig(enable_subagents=False),
    )
    async with Agent(config) as agent:
        response = await agent.chat(
            "Generate a 7-day study schedule for a student. "
            "First check their subjects and current streak, then create "
            "a balanced weekly plan prioritizing high-priority subjects."
        )
        return await response.text()


async def demo_weakness_agent():
    """Demo: Weakness Analysis Agent."""
    print("\n⚡ Running Weakness Analysis Agent...")
    config = LocalAgentConfig(
        system_instructions=(
            "You are a weakness analysis agent. "
            "Analyze quiz performance data, identify subjects below 60%, "
            "and recommend specific remediation strategies with a concrete schedule."
        ),
        tools=[get_mock_performance, get_mock_subjects, generate_study_tip],
        capabilities=types.CapabilitiesConfig(enable_subagents=False),
    )
    async with Agent(config) as agent:
        response = await agent.chat(
            "Analyze the student's quiz performance. "
            "Identify weak subjects (< 60%), then use generate_study_tip to "
            "get targeted advice for each weak subject. "
            "Create a remediation plan with specific times and strategies."
        )
        return await response.text()


async def demo_tutor_agent():
    """Demo: AI Tutor Agent."""
    print("\n🎓 Running AI Tutor Agent...")
    config = LocalAgentConfig(
        system_instructions=(
            "You are Synapse, a brilliant and empathetic AI tutor. "
            "You explain concepts using first principles, real-world examples, "
            "and analogies. Always adapt to the student's level and end with "
            "a practice question."
        ),
        tools=[get_mock_subjects, get_mock_performance],
        capabilities=types.CapabilitiesConfig(enable_subagents=False),
    )
    async with Agent(config) as agent:
        response = await agent.chat(
            "First check the student's subjects and performance to understand "
            "their level. Then explain: What is the Chain Rule in Calculus? "
            "The student is struggling with Mathematics (45% quiz score), "
            "so make it very beginner-friendly with step-by-step examples."
        )
        return await response.text()


async def demo_orchestrator():
    """Demo: Full Multi-Agent Orchestrator."""
    print("\n🧠 Running Multi-Agent Orchestrator...")

    # Define sub-agent runner tools
    async def run_schedule_planning() -> str:
        """Delegate to the Schedule Planning Agent to generate a 7-day study plan."""
        return await demo_schedule_agent()

    async def run_weakness_analysis() -> str:
        """Delegate to the Weakness Analysis Agent to identify gaps and add remediation."""
        return await demo_weakness_agent()

    async def run_tutoring_session(topic: str) -> str:
        """Delegate to the AI Tutor Agent for a personalized explanation.

        Args:
            topic: The academic concept or question to explain.
        """
        config = LocalAgentConfig(
            system_instructions=(
                "You are an expert tutor. Explain the given topic clearly "
                "with examples and a practice question."
            ),
            tools=[generate_study_tip],
        )
        async with Agent(config) as agent:
            response = await agent.chat(f"Explain: {topic}")
            return await response.text()

    config = LocalAgentConfig(
        system_instructions=(
            "You are the Synapse AI Master Orchestrator. You coordinate a team of "
            "specialized agents: Schedule Agent, Weakness Agent, and Tutor Agent. "
            "For each student request, identify which agent(s) to delegate to, "
            "coordinate their work, and synthesize a comprehensive response. "
            "Always explain your delegation decisions."
        ),
        tools=[
            run_schedule_planning,
            run_weakness_analysis,
            run_tutoring_session,
            get_mock_streak,
        ],
        capabilities=types.CapabilitiesConfig(enable_subagents=True),
    )

    async with Agent(config) as agent:
        response = await agent.chat(
            "I have exams coming up and I'm stressed. "
            "Please: (1) Check my current progress, (2) Run a weakness analysis "
            "to find my problem areas, and (3) Give me a personalized study tip "
            "for my weakest subject using the appropriate agents."
        )
        return await response.text()


# ── Main Demo Runner ──────────────────────────────────────────────────────────

async def main():
    print("\n" + "=" * 65)
    print("  🧠 SYNAPSE AI — ADK Multi-Agent System")
    print("  Kaggle Capstone: 5-Day AI Agents Course with Google")
    print("=" * 65)
    print("\n  Demonstrating:")
    print("  ✅ Multi-agent system with ADK orchestration")
    print("  ✅ Specialized sub-agents (Schedule, Weakness, Tutor)")
    print("  ✅ Custom agent tools (agent skills)")
    print("  ✅ Subagent delegation (enable_subagents=True)")
    print("  ✅ MCP Server integration (see mcp_server.py)")
    print("\n" + "─" * 65)

    if not GEMINI_API_KEY:
        print("\n  ❌ GEMINI_API_KEY not set!")
        print("  Please add it to your .env file:")
        print("  GEMINI_API_KEY=AIza...")
        print("\n  Get your free key at: https://aistudio.google.com/app/api-keys\n")
        return

    # Run the full orchestrator demo
    print("\n  Starting Full Multi-Agent Demo...")
    print("  (This shows the orchestrator coordinating all sub-agents)\n")

    try:
        result = await demo_orchestrator()
        print("\n" + "─" * 65)
        print("  🎯 ORCHESTRATOR RESULT:")
        print("─" * 65)
        print(result)
    except Exception as e:
        print(f"\n  Error running demo: {e}")
        print("  Make sure GEMINI_API_KEY is set correctly.\n")
        raise

    print("\n" + "=" * 65)
    print("  ✅ Demo Complete! Synapse AI Multi-Agent System")
    print("  For full DB integration: python orchestrator.py your@email.com")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
