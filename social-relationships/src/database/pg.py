"""
PostgreSQL layer - structured data: roles, conversations, branches.
Replaces JSON storage with the same interface.
"""

import os
import json
import psycopg2
import psycopg2.extras
from typing import Optional
from dataclasses import asdict
from datetime import datetime

from ..data.schemas import (
    RoleAgent, ConversationThread, SimulationBranch,
    Message, TimelineSnapshot, PersonalityModel,
    RelationshipType, RelationshipStatus, BranchStatus
)

PG_DSN = os.environ.get(
    "POSTGRES_DSN",
    "postgresql://postgres:postgres@localhost:5432/social_relationships"
)


def get_conn():
    return psycopg2.connect(PG_DSN)


def init_schema():
    """创建所有表（幂等，可重复执行）"""
    ddl = """
    CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        relationship_type TEXT NOT NULL,
        relationship_status TEXT NOT NULL,
        age INTEGER,
        occupation TEXT,
        location TEXT,
        bio TEXT,
        personality JSONB,
        relationship_started TEXT,
        key_events JSONB,
        created_at TEXT,
        updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        role_agent_id TEXT NOT NULL,
        branch_id TEXT,
        messages JSONB,
        created_at TEXT,
        updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS branches (
        id TEXT PRIMARY KEY,
        role_agent_id TEXT NOT NULL,
        parent_snapshot_id TEXT,
        name TEXT,
        description TEXT,
        status TEXT,
        predicted_outcome TEXT,
        actual_outcome TEXT,
        snapshots JSONB,
        created_at TEXT
    );
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(ddl)


# ── RoleAgent ─────────────────────────────────────────────────────────────────

def save_role(role: RoleAgent):
    d = asdict(role)
    d["updated_at"] = datetime.utcnow().isoformat()
    sql = """
    INSERT INTO roles VALUES (%(id)s, %(name)s, %(relationship_type)s, %(relationship_status)s,
        %(age)s, %(occupation)s, %(location)s, %(bio)s, %(personality)s::jsonb,
        %(relationship_started)s, %(key_events)s::jsonb, %(created_at)s, %(updated_at)s)
    ON CONFLICT (id) DO UPDATE SET
        name=EXCLUDED.name, relationship_type=EXCLUDED.relationship_type,
        relationship_status=EXCLUDED.relationship_status, age=EXCLUDED.age,
        occupation=EXCLUDED.occupation, bio=EXCLUDED.bio,
        personality=EXCLUDED.personality, key_events=EXCLUDED.key_events,
        updated_at=EXCLUDED.updated_at
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            d["personality"] = json.dumps(d["personality"])
            d["key_events"] = json.dumps(d["key_events"])
            cur.execute(sql, d)


def get_role(role_id: str) -> Optional[RoleAgent]:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM roles WHERE id=%s", (role_id,))
            row = cur.fetchone()
            return _row_to_role(dict(row)) if row else None


def list_roles() -> list[RoleAgent]:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM roles ORDER BY created_at")
            return [_row_to_role(dict(r)) for r in cur.fetchall()]


def delete_role(role_id: str):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM roles WHERE id=%s", (role_id,))


def _row_to_role(row: dict) -> RoleAgent:
    personality = PersonalityModel(**row["personality"]) if isinstance(row["personality"], dict) else PersonalityModel()
    return RoleAgent(
        id=row["id"], name=row["name"],
        relationship_type=RelationshipType(row["relationship_type"]),
        relationship_status=RelationshipStatus(row["relationship_status"]),
        age=row.get("age"), occupation=row.get("occupation"),
        location=row.get("location"), bio=row.get("bio", ""),
        personality=personality,
        relationship_started=row.get("relationship_started"),
        key_events=row.get("key_events", []),
        created_at=row.get("created_at", ""), updated_at=row.get("updated_at", ""),
    )


# ── ConversationThread ────────────────────────────────────────────────────────

def save_conversation(thread: ConversationThread):
    d = asdict(thread)
    d["updated_at"] = datetime.utcnow().isoformat()
    sql = """
    INSERT INTO conversations VALUES (%(id)s, %(role_agent_id)s, %(branch_id)s,
        %(messages)s::jsonb, %(created_at)s, %(updated_at)s)
    ON CONFLICT (id) DO UPDATE SET
        messages=EXCLUDED.messages, updated_at=EXCLUDED.updated_at
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            d["messages"] = json.dumps(d["messages"])
            cur.execute(sql, d)


def get_conversation(thread_id: str) -> Optional[ConversationThread]:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM conversations WHERE id=%s", (thread_id,))
            row = cur.fetchone()
            return _row_to_conversation(dict(row)) if row else None


def get_conversations_for_role(role_id: str, branch_id: Optional[str] = None) -> list[ConversationThread]:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            if branch_id is None:
                cur.execute("SELECT * FROM conversations WHERE role_agent_id=%s AND branch_id IS NULL ORDER BY created_at", (role_id,))
            else:
                cur.execute("SELECT * FROM conversations WHERE role_agent_id=%s AND branch_id=%s ORDER BY created_at", (role_id, branch_id))
            return [_row_to_conversation(dict(r)) for r in cur.fetchall()]


def _row_to_conversation(row: dict) -> ConversationThread:
    messages = [Message(**m) for m in (row.get("messages") or [])]
    return ConversationThread(
        id=row["id"], role_agent_id=row["role_agent_id"],
        branch_id=row.get("branch_id"), messages=messages,
        created_at=row.get("created_at", ""), updated_at=row.get("updated_at", ""),
    )


def append_message(thread_id: str, message: Message):
    thread = get_conversation(thread_id)
    if not thread:
        raise ValueError(f"Thread {thread_id} not found")
    thread.messages.append(message)
    save_conversation(thread)


# ── SimulationBranch ──────────────────────────────────────────────────────────

def save_branch(branch: SimulationBranch):
    d = asdict(branch)
    sql = """
    INSERT INTO branches VALUES (%(id)s, %(role_agent_id)s, %(parent_snapshot_id)s,
        %(name)s, %(description)s, %(status)s, %(predicted_outcome)s,
        %(actual_outcome)s, %(snapshots)s::jsonb, %(created_at)s)
    ON CONFLICT (id) DO UPDATE SET
        status=EXCLUDED.status, actual_outcome=EXCLUDED.actual_outcome,
        snapshots=EXCLUDED.snapshots
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            d["snapshots"] = json.dumps(d["snapshots"])
            cur.execute(sql, d)


def get_branch(branch_id: str) -> Optional[SimulationBranch]:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM branches WHERE id=%s", (branch_id,))
            row = cur.fetchone()
            return _row_to_branch(dict(row)) if row else None


def list_branches_for_role(role_id: str) -> list[SimulationBranch]:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM branches WHERE role_agent_id=%s ORDER BY created_at", (role_id,))
            return [_row_to_branch(dict(r)) for r in cur.fetchall()]


def _row_to_branch(row: dict) -> SimulationBranch:
    snapshots = []
    for s in (row.get("snapshots") or []):
        msgs = [Message(**m) for m in s.get("conversation_snapshot", [])]
        snapshots.append(TimelineSnapshot(
            **{**s, "conversation_snapshot": msgs,
               "relationship_status": RelationshipStatus(s["relationship_status"])}
        ))
    return SimulationBranch(
        id=row["id"], role_agent_id=row["role_agent_id"],
        parent_snapshot_id=row.get("parent_snapshot_id"),
        name=row.get("name", ""), description=row.get("description", ""),
        status=BranchStatus(row["status"]),
        predicted_outcome=row.get("predicted_outcome", ""),
        actual_outcome=row.get("actual_outcome"),
        snapshots=snapshots, created_at=row.get("created_at", ""),
    )
