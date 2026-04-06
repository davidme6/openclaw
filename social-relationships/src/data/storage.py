"""
Local JSON storage layer (MVP phase).
Phase 4 will migrate this to PostgreSQL + Neo4j + ChromaDB.
All storage operations go through this interface so migration is painless.
"""

import json
import os
from dataclasses import asdict
from typing import Optional
from datetime import datetime

from .schemas import RoleAgent, ConversationThread, SimulationBranch, RelationshipAnalysis, Message

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")
ROLES_FILE = os.path.join(DATA_DIR, "roles", "roles.json")
CONVERSATIONS_FILE = os.path.join(DATA_DIR, "conversations", "conversations.json")
TIMELINES_FILE = os.path.join(DATA_DIR, "timelines", "timelines.json")


def _ensure_dirs():
    os.makedirs(os.path.join(DATA_DIR, "roles"), exist_ok=True)
    os.makedirs(os.path.join(DATA_DIR, "conversations"), exist_ok=True)
    os.makedirs(os.path.join(DATA_DIR, "timelines"), exist_ok=True)


def _read_json(path: str) -> dict:
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _write_json(path: str, data: dict):
    _ensure_dirs()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ─── RoleAgent Storage ────────────────────────────────────────────────────────

def save_role(role: RoleAgent):
    data = _read_json(ROLES_FILE)
    role.updated_at = datetime.utcnow().isoformat()
    data[role.id] = asdict(role)
    _write_json(ROLES_FILE, data)


def get_role(role_id: str) -> Optional[RoleAgent]:
    data = _read_json(ROLES_FILE)
    if role_id not in data:
        return None
    return _dict_to_role(data[role_id])


def list_roles() -> list[RoleAgent]:
    data = _read_json(ROLES_FILE)
    return [_dict_to_role(v) for v in data.values()]


def delete_role(role_id: str):
    data = _read_json(ROLES_FILE)
    data.pop(role_id, None)
    _write_json(ROLES_FILE, data)


def _dict_to_role(d: dict) -> RoleAgent:
    from .schemas import PersonalityModel, RelationshipType, RelationshipStatus
    personality = PersonalityModel(**d.get("personality", {}))
    d = {**d, "personality": personality}
    d["relationship_type"] = RelationshipType(d["relationship_type"])
    d["relationship_status"] = RelationshipStatus(d["relationship_status"])
    return RoleAgent(**d)


# ─── ConversationThread Storage ───────────────────────────────────────────────

def save_conversation(thread: ConversationThread):
    data = _read_json(CONVERSATIONS_FILE)
    thread.updated_at = datetime.utcnow().isoformat()
    data[thread.id] = asdict(thread)
    _write_json(CONVERSATIONS_FILE, data)


def get_conversation(thread_id: str) -> Optional[ConversationThread]:
    data = _read_json(CONVERSATIONS_FILE)
    if thread_id not in data:
        return None
    return _dict_to_conversation(data[thread_id])


def get_conversations_for_role(role_id: str, branch_id: Optional[str] = None) -> list[ConversationThread]:
    data = _read_json(CONVERSATIONS_FILE)
    results = []
    for v in data.values():
        if v["role_agent_id"] == role_id and v.get("branch_id") == branch_id:
            results.append(_dict_to_conversation(v))
    return sorted(results, key=lambda t: t.created_at)


def _dict_to_conversation(d: dict) -> ConversationThread:
    messages = [Message(**m) for m in d.get("messages", [])]
    d = {**d, "messages": messages}
    return ConversationThread(**d)


def append_message(thread_id: str, message: Message):
    thread = get_conversation(thread_id)
    if not thread:
        raise ValueError(f"Conversation thread {thread_id} not found")
    thread.messages.append(message)
    save_conversation(thread)


# ─── SimulationBranch Storage ─────────────────────────────────────────────────

def save_branch(branch: SimulationBranch):
    data = _read_json(TIMELINES_FILE)
    data[branch.id] = asdict(branch)
    _write_json(TIMELINES_FILE, data)


def get_branch(branch_id: str) -> Optional[SimulationBranch]:
    data = _read_json(TIMELINES_FILE)
    if branch_id not in data:
        return None
    return _dict_to_branch(data[branch_id])


def list_branches_for_role(role_id: str) -> list[SimulationBranch]:
    data = _read_json(TIMELINES_FILE)
    results = []
    for v in data.values():
        if v["role_agent_id"] == role_id:
            results.append(_dict_to_branch(v))
    return sorted(results, key=lambda b: b.created_at)


def _dict_to_branch(d: dict) -> SimulationBranch:
    from .schemas import BranchStatus, TimelineSnapshot, RelationshipStatus
    snapshots = []
    for s in d.get("snapshots", []):
        messages = [Message(**m) for m in s.get("conversation_snapshot", [])]
        s = {**s, "conversation_snapshot": messages,
             "relationship_status": RelationshipStatus(s["relationship_status"])}
        snapshots.append(TimelineSnapshot(**s))
    d = {**d, "snapshots": snapshots, "status": BranchStatus(d["status"])}
    return SimulationBranch(**d)
