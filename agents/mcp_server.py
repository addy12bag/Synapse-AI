"""
Synapse AI — MCP Server
=======================
Exposes the Synapse AI PostgreSQL database as MCP tools so that
ADK agents can read and write study data without direct DB access.

Demonstrates: Model Context Protocol (MCP) with Stdio transport.

Usage (standalone):
    python mcp_server.py

Usage (via ADK agent):
    Configured automatically via McpStdioServer in orchestrator.py
"""

import os
import json
import asyncio
from datetime import datetime, timezone
from mcp.server import FastMCP
import psycopg2
import psycopg2.extras

# ── MCP Server Setup ─────────────────────────────────────────────────────────
mcp = FastMCP(
    name="SynapseAI-DB-Server",
    instructions=(
        "You have access to the Synapse AI study planner database. "
        "Use these tools to read a student's subjects, schedule, quiz performance, "
        "and study streaks. You can also write new schedule slots."
    ),
)

DATABASE_URL = os.environ.get("DATABASE_URL", "")


def get_connection():
    """Create a fresh psycopg2 connection to the Synapse AI database."""
    return psycopg2.connect(DATABASE_URL)


# ── Tool 1: Get User Subjects ─────────────────────────────────────────────────
@mcp.tool()
def get_user_subjects(user_email: str) -> str:
    """Retrieve all academic subjects registered for a student.

    Args:
        user_email: The student's email address.

    Returns:
        JSON string listing subjects with name, color, priority, targetHours,
        and examDate.
    """
    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute(
            """
            SELECT s.id, s.name, s.color, s.priority, s."targetHours", s."examDate"
            FROM "Subject" s
            JOIN "User" u ON s."userId" = u.id
            WHERE u.email = %s
            ORDER BY s.priority DESC
            """,
            (user_email,),
        )
        rows = cur.fetchall()
        subjects = [
            {
                "id": r["id"],
                "name": r["name"],
                "color": r["color"],
                "priority": r["priority"],
                "targetHours": float(r["targetHours"]),
                "examDate": r["examDate"].isoformat() if r["examDate"] else None,
            }
            for r in rows
        ]
        cur.close()
        conn.close()
        return json.dumps({"subjects": subjects, "count": len(subjects)})
    except Exception as e:
        return json.dumps({"error": str(e)})


# ── Tool 2: Get Today's Schedule ──────────────────────────────────────────────
@mcp.tool()
def get_today_schedule(user_email: str) -> str:
    """Retrieve today's study schedule slots for a student.

    Args:
        user_email: The student's email address.

    Returns:
        JSON string with today's schedule slots including subject, time, and
        completion status.
    """
    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        today_end = today_start.replace(hour=23, minute=59, second=59)
        cur.execute(
            """
            SELECT sc.id, sc.title, sc."startTime", sc."endTime",
                   sc."isCompleted", sc."isAIGenerated", sub.name as subject_name
            FROM "Schedule" sc
            JOIN "User" u ON sc."userId" = u.id
            LEFT JOIN "Subject" sub ON sc."subjectId" = sub.id
            WHERE u.email = %s
              AND sc.date >= %s AND sc.date <= %s
            ORDER BY sc."startTime"
            """,
            (user_email, today_start, today_end),
        )
        rows = cur.fetchall()
        slots = [
            {
                "id": r["id"],
                "title": r["title"],
                "startTime": r["startTime"],
                "endTime": r["endTime"],
                "subject": r["subject_name"],
                "completed": r["isCompleted"],
                "aiGenerated": r["isAIGenerated"],
            }
            for r in rows
        ]
        cur.close()
        conn.close()
        return json.dumps({"date": today_start.date().isoformat(), "slots": slots})
    except Exception as e:
        return json.dumps({"error": str(e)})


# ── Tool 3: Get Quiz Performance ──────────────────────────────────────────────
@mcp.tool()
def get_quiz_performance(user_email: str, limit: int = 10) -> str:
    """Retrieve recent quiz attempt scores to identify weak subjects.

    Args:
        user_email: The student's email address.
        limit: Maximum number of recent attempts to return (default 10).

    Returns:
        JSON string with quiz attempts including score percentage, subject,
        and timestamp.
    """
    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute(
            """
            SELECT qa.id, qa.score, qa."totalQ",
                   ROUND((qa.score / NULLIF(qa."totalQ", 0)) * 100, 1) as percentage,
                   qa."timeTaken", qa."completedAt",
                   q.title as quiz_title,
                   sub.name as subject_name
            FROM "QuizAttempt" qa
            JOIN "User" u ON qa."userId" = u.id
            JOIN "Quiz" q ON qa."quizId" = q.id
            LEFT JOIN "Subject" sub ON q."subjectId" = sub.id
            WHERE u.email = %s
            ORDER BY qa."completedAt" DESC
            LIMIT %s
            """,
            (user_email, limit),
        )
        rows = cur.fetchall()
        attempts = [
            {
                "quizTitle": r["quiz_title"],
                "subject": r["subject_name"],
                "score": float(r["score"]),
                "totalQuestions": r["totalQ"],
                "percentage": float(r["percentage"]) if r["percentage"] else 0,
                "timeTakenSeconds": r["timeTaken"],
                "completedAt": r["completedAt"].isoformat(),
            }
            for r in rows
        ]
        # Calculate average per subject
        subject_avgs = {}
        for a in attempts:
            subj = a["subject"] or "Unknown"
            if subj not in subject_avgs:
                subject_avgs[subj] = []
            subject_avgs[subj].append(a["percentage"])
        subject_summary = {
            subj: round(sum(scores) / len(scores), 1)
            for subj, scores in subject_avgs.items()
        }
        cur.close()
        conn.close()
        return json.dumps(
            {
                "attempts": attempts,
                "subjectAverages": subject_summary,
                "weakSubjects": [s for s, avg in subject_summary.items() if avg < 60],
            }
        )
    except Exception as e:
        return json.dumps({"error": str(e)})


# ── Tool 4: Get Study Streak & XP ─────────────────────────────────────────────
@mcp.tool()
def get_study_streak(user_email: str) -> str:
    """Retrieve the student's current study streak, XP, and level.

    Args:
        user_email: The student's email address.

    Returns:
        JSON with streak days, XP points, level, and badges earned.
    """
    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute(
            """
            SELECT le.streak, le."totalXP", le.level, le.badges, le."weeklyXP"
            FROM "LeaderboardEntry" le
            JOIN "User" u ON le."userId" = u.id
            WHERE u.email = %s
            """,
            (user_email,),
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row:
            return json.dumps(
                {"streak": 0, "totalXP": 0, "level": 1, "badges": [], "weeklyXP": 0}
            )
        return json.dumps(
            {
                "streak": row["streak"],
                "totalXP": row["totalXP"],
                "level": row["level"],
                "badges": list(row["badges"]),
                "weeklyXP": row["weeklyXP"],
            }
        )
    except Exception as e:
        return json.dumps({"error": str(e)})


# ── Tool 5: Get Weekly Study Hours ────────────────────────────────────────────
@mcp.tool()
def get_weekly_study_hours(user_email: str) -> str:
    """Retrieve total study hours logged per subject in the past 7 days.

    Args:
        user_email: The student's email address.

    Returns:
        JSON with hours per subject and total hours this week.
    """
    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute(
            """
            SELECT COALESCE(sub.name, 'General') as subject,
                   ROUND(SUM(ss."durationMin") / 60.0, 2) as hours
            FROM "StudySession" ss
            JOIN "User" u ON ss."userId" = u.id
            LEFT JOIN "Subject" sub ON ss."subjectId" = sub.id
            WHERE u.email = %s
              AND ss."startTime" >= NOW() - INTERVAL '7 days'
            GROUP BY sub.name
            ORDER BY hours DESC
            """,
            (user_email,),
        )
        rows = cur.fetchall()
        by_subject = {r["subject"]: float(r["hours"]) for r in rows}
        total = sum(by_subject.values())
        cur.close()
        conn.close()
        return json.dumps({"bySubject": by_subject, "totalHours": round(total, 2)})
    except Exception as e:
        return json.dumps({"error": str(e)})


# ── Tool 6: Add Schedule Slot ─────────────────────────────────────────────────
@mcp.tool()
def add_schedule_slot(
    user_email: str,
    title: str,
    date_iso: str,
    start_time: str,
    end_time: str,
    subject_name: str = "",
) -> str:
    """Add a new study schedule slot for a student (AI-generated).

    Args:
        user_email: The student's email address.
        title: Name/description of the study session.
        date_iso: Date in ISO format (YYYY-MM-DD).
        start_time: Start time string like '09:00'.
        end_time: End time string like '11:00'.
        subject_name: Optional subject name to link this slot to.

    Returns:
        JSON confirming creation with the new slot ID.
    """
    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        # Get user ID
        cur.execute('SELECT id FROM "User" WHERE email = %s', (user_email,))
        user_row = cur.fetchone()
        if not user_row:
            return json.dumps({"error": "User not found"})
        user_id = user_row["id"]
        # Optionally resolve subject ID
        subject_id = None
        if subject_name:
            cur.execute(
                'SELECT id FROM "Subject" WHERE "userId" = %s AND name ILIKE %s',
                (user_id, f"%{subject_name}%"),
            )
            subj_row = cur.fetchone()
            if subj_row:
                subject_id = subj_row["id"]
        # Parse date
        slot_date = datetime.strptime(date_iso, "%Y-%m-%d").replace(
            tzinfo=timezone.utc
        )
        # Insert
        import uuid
        slot_id = str(uuid.uuid4())[:25]
        cur.execute(
            """
            INSERT INTO "Schedule"
              (id, "userId", date, "startTime", "endTime", "subjectId",
               title, "isCompleted", "isAIGenerated", "createdAt")
            VALUES (%s, %s, %s, %s, %s, %s, %s, false, true, NOW())
            """,
            (slot_id, user_id, slot_date, start_time, end_time, subject_id, title),
        )
        conn.commit()
        cur.close()
        conn.close()
        return json.dumps(
            {
                "success": True,
                "slotId": slot_id,
                "message": f"Added '{title}' on {date_iso} from {start_time} to {end_time}",
            }
        )
    except Exception as e:
        return json.dumps({"error": str(e)})


# ── Entry Point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    mcp.run()
