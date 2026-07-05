"""
Synapse AI — Schedule Planning Sub-Agent
=========================================
An ADK sub-agent that analyzes a student's registered subjects, priorities,
exam dates, and available time windows to generate a personalized 7-day
study schedule.

It uses the Synapse MCP server tools to read subject data and write
new schedule slots back to the database.

Demonstrates: Agent Skills + MCP Tool Usage + Structured Output
"""

import os
import asyncio
from google.antigravity import Agent, LocalAgentConfig, types

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
DATABASE_URL = os.environ.get("DATABASE_URL", "")

# MCP server configuration (Synapse DB tools)
MCP_SERVERS = [
    types.McpStdioServer(
        command="python3",
        args=["mcp_server.py"],
        env={"DATABASE_URL": DATABASE_URL, "PYTHONPATH": "."},
    )
]

SYSTEM_INSTRUCTIONS = """
You are the Synapse AI Schedule Planning Agent — an expert academic planner
specialized in creating personalized, adaptive weekly study schedules.

Your responsibilities:
1. Fetch the student's subjects using the get_user_subjects MCP tool
2. Fetch their weekly study hours using get_weekly_study_hours
3. Analyze which subjects need more attention based on priority and exam dates
4. Generate a balanced 7-day study plan with 2-4 hour daily blocks
5. Add each slot to the database using add_schedule_slot

Scheduling Principles:
- High-priority subjects (priority 4-5) get 40% of weekly time
- Medium-priority (2-3) get 35%, low-priority (1) get 25%
- Schedule hardest subjects in the morning (08:00-12:00)
- Include 15-minute breaks between sessions
- No study sessions longer than 3 hours
- Always include one rest day per week

When generating the schedule:
- Use dates starting from tomorrow (YYYY-MM-DD format)
- Use 24-hour time format for start/end times
- Include descriptive titles like "Mathematics - Calculus Practice"
- Call add_schedule_slot for EACH slot to persist it to the database
- Report a summary of the full week's plan at the end
"""


async def run_schedule_agent(user_email: str) -> str:
    """Run the Schedule Planning Agent for a given user.

    Args:
        user_email: The student's email address.

    Returns:
        The agent's schedule generation response.
    """
    config = LocalAgentConfig(
        system_instructions=SYSTEM_INSTRUCTIONS,
        mcp_servers=MCP_SERVERS,
        capabilities=types.CapabilitiesConfig(
            enable_subagents=False,
        ),
    )

    prompt = f"""
    Please generate a complete 7-day personalized study schedule for the student
    with email: {user_email}

    Steps:
    1. Use get_user_subjects to see their registered subjects
    2. Use get_weekly_study_hours to understand their current study patterns
    3. Use get_study_streak to check their current momentum
    4. Generate a balanced weekly plan and add each slot using add_schedule_slot
    5. Provide a summary of the generated schedule

    Make sure every slot is saved to the database.
    """

    async with Agent(config) as agent:
        response = await agent.chat(prompt)
        return await response.text()


if __name__ == "__main__":
    import sys
    email = sys.argv[1] if len(sys.argv) > 1 else "demo@example.com"
    result = asyncio.run(run_schedule_agent(email))
    print(result)
