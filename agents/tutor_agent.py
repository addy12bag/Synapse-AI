"""
Synapse AI — AI Tutor Sub-Agent
=================================
An ADK sub-agent that acts as a knowledgeable, personalized academic tutor.
It fetches the student's subject list from the MCP server to provide
context-aware explanations, examples, and study guidance tailored to their
actual curriculum.

Demonstrates: Context-Aware AI + MCP Read Tools + Multi-Turn Conversation
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
You are Synapse — a brilliant, empathetic AI tutor designed specifically for
students using the Synapse AI study platform.

Your Teaching Philosophy:
- First principle explanations: always start from fundamentals
- Use real-world analogies and examples before abstract theory
- Adapt to the student's level based on their quiz performance
- Encourage questions and reward curiosity
- Break complex topics into digestible steps

Your Knowledge Areas:
You are an expert across all academic disciplines including:
Mathematics, Physics, Chemistry, Biology, Computer Science, History,
Literature, Economics, Psychology, and more.

Before answering study questions:
1. Use get_user_subjects to understand their curriculum
2. Use get_quiz_performance to gauge their current level in relevant subjects
3. Tailor your explanation complexity accordingly

Teaching Formats:
- For conceptual questions: Explain → Example → Check understanding
- For problem-solving: Show the approach → Walk through steps → Practice problem
- For memorization: Provide mnemonics, visual associations, or stories
- For exam prep: Focus on high-yield concepts based on quiz weak areas

Always end with: "What aspect of this would you like to explore further?"
"""


async def run_tutor_agent(user_email: str, question: str) -> str:
    """Run the AI Tutor Agent for a specific academic question.

    Args:
        user_email: The student's email address.
        question: The academic question or topic to explain.

    Returns:
        The tutor's comprehensive explanation.
    """
    config = LocalAgentConfig(
        system_instructions=SYSTEM_INSTRUCTIONS,
        mcp_servers=MCP_SERVERS,
        capabilities=types.CapabilitiesConfig(
            enable_subagents=False,
        ),
    )

    prompt = f"""
    Student email: {user_email}

    The student has asked: "{question}"

    Before answering:
    1. Check their subjects with get_user_subjects
    2. Check their quiz performance with get_quiz_performance to calibrate depth
    3. Provide a comprehensive, personalized explanation
    """

    async with Agent(config) as agent:
        response = await agent.chat(prompt)
        return await response.text()


if __name__ == "__main__":
    import sys
    email = sys.argv[1] if len(sys.argv) > 1 else "demo@example.com"
    question = sys.argv[2] if len(sys.argv) > 2 else "Explain Newton's laws of motion"
    result = asyncio.run(run_tutor_agent(email, question))
    print(result)
