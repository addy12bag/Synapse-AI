"""
Synapse AI — Weakness Analysis Sub-Agent
==========================================
An ADK sub-agent that autonomously identifies a student's weak academic
subjects based on quiz performance data, then proactively schedules
targeted remediation study sessions in the database.

Demonstrates: Autonomous Agent Behavior + MCP Write Tools + Decision Making
"""

import os
import asyncio
from google.antigravity import Agent, LocalAgentConfig, types

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
DATABASE_URL = os.environ.get("DATABASE_URL", "")

MCP_SERVERS = [
    types.McpStdioServer(
        command="python3",
        args=["mcp_server.py"],
        env={"DATABASE_URL": DATABASE_URL, "PYTHONPATH": "."},
    )
]

SYSTEM_INSTRUCTIONS = """
You are the Synapse AI Weakness Analysis Agent — an intelligent academic
performance analyzer that identifies struggling subjects and takes proactive
action to help students improve.

Your core capabilities:
1. Analyze quiz performance data to find weak subjects (< 60% average score)
2. Cross-reference weaknesses with current schedule coverage
3. Proactively add targeted remediation sessions to the student's schedule
4. Provide specific, actionable recommendations for each weak subject

Analysis Framework:
- CRITICAL weakness: < 40% average quiz score → Add 2-hour daily sessions
- MODERATE weakness: 40-59% average → Add 1-hour sessions every other day
- AT RISK: 60-69% average → Recommend review, add 1 weekly session

When adding remediation sessions:
- Title format: "⚡ Remediation: [Subject] - [Specific Focus Area]"
- Schedule within the next 3 days for critical weaknesses
- Schedule within 5 days for moderate weaknesses
- Explain WHY each session was added (which concepts to focus on)

Always provide:
1. A clear weakness report with percentages
2. The specific remediation plan you've implemented
3. Study tips tailored to each weak subject
"""


async def run_weakness_agent(user_email: str) -> str:
    """Run the Weakness Analysis Agent for a given user.

    Args:
        user_email: The student's email address.

    Returns:
        The agent's weakness analysis and remediation report.
    """
    config = LocalAgentConfig(
        system_instructions=SYSTEM_INSTRUCTIONS,
        mcp_servers=MCP_SERVERS,
        capabilities=types.CapabilitiesConfig(
            enable_subagents=False,
        ),
    )

    prompt = f"""
    Perform a comprehensive weakness analysis for student: {user_email}

    Steps:
    1. Use get_quiz_performance to get their recent quiz scores
    2. Use get_user_subjects to see all their registered subjects
    3. Use get_today_schedule to check what's already planned
    4. Identify subjects below 60% average score
    5. For each weak subject, add targeted remediation slots using add_schedule_slot
    6. Generate a detailed weakness report with specific study recommendations

    Be thorough — every weak subject needs a concrete remediation plan.
    """

    async with Agent(config) as agent:
        response = await agent.chat(prompt)
        return await response.text()


if __name__ == "__main__":
    import sys
    email = sys.argv[1] if len(sys.argv) > 1 else "demo@example.com"
    result = asyncio.run(run_weakness_agent(email))
    print(result)
